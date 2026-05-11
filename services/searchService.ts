/**
 * Search Service - Dual-Search Functionality
 * Handles searching for users by @username and families by @family_handle
 */

import { supabase } from '@/lib/supabase';
import type { SearchUserResult, SearchFamilyResult } from '@/store/messagesStore';

// ============================================================================
// SEARCH CONFIGURATION
// ============================================================================

const SEARCH_CONFIG = {
  MIN_QUERY_LENGTH: 2,
  MAX_RESULTS: 20,
  DEBOUNCE_DELAY: 300,
  CACHE_DURATION: 5000, // 5 seconds
} as const;

// ============================================================================
// SEARCH RESULTS CACHE
// ============================================================================

interface SearchCacheEntry {
  results: any[];
  timestamp: number;
}

const searchCache = new Map<string, SearchCacheEntry>();

// ============================================================================
// USER SEARCH
// ============================================================================

/**
 * Search for users by username or name
 * @param query - Search query (username or name)
 * @param excludeUserId - User ID to exclude from results (usually current user)
 * @param limit - Maximum number of results to return
 */
export async function searchUsersByUsername(
  query: string,
  excludeUserId?: string,
  limit: number = SEARCH_CONFIG.MAX_RESULTS
): Promise<SearchUserResult[]> {
  try {
    // Check cache first
    const cacheKey = `users:${query}:${excludeUserId || 'all'}`;
    const cached = searchCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < SEARCH_CONFIG.CACHE_DURATION) {
      console.log('Returning cached user search results:', query);
      return cached.results as SearchUserResult[];
    }

    // Validate query
    if (query.trim().length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
      return [];
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Build search query
    let dbQuery = supabase
      .from('profiles')
      .select(`
        id,
        name,
        username,
        avatar,
        is_premium
      `)
      .or(`username.ilike.%${query}%,name.ilike.%${query}%`)
      .limit(limit);

    // Exclude current user if specified
    if (excludeUserId) {
      dbQuery = dbQuery.neq('id', excludeUserId);
    } else {
      dbQuery = dbQuery.neq('id', user.id);
    }

    // Execute search
    const { data: users, error } = await dbQuery;

    if (error) throw error;

    // Transform results and add mutual families
    const searchUsers: SearchUserResult[] = await Promise.all(
      (users || []).map(async (userProfile: any) => {
        // Calculate mutual families if current user exists
        let mutualFamilies: string[] = [];

        if (user) {
          const mutualFamiliesResult = await getMutualFamilies(user.id, userProfile.id);
          mutualFamilies = mutualFamiliesResult;
        }

        return {
          id: userProfile.id,
          name: userProfile.name || 'Unknown User',
          username: userProfile.username || 'no-username',
          avatar: userProfile.avatar || null,
          isPremium: userProfile.is_premium || false,
          mutualFamilies
        };
      })
    );

    // Cache results
    searchCache.set(cacheKey, {
      results: searchUsers,
      timestamp: Date.now()
    });

    return searchUsers;

  } catch (error: any) {
    console.error('Error searching users by username:', error);
    throw new Error(`Failed to search users: ${error.message}`);
  }
}

/**
 * Get mutual families between two users
 */
async function getMutualFamilies(userId1: string, userId2: string): Promise<string[]> {
  try {
    // Get families for user1
    const { data: user1Families } = await supabase
      .from('family_members')
      .select('family_tree_id')
      .eq('parent_id', userId1);

    if (!user1Families || user1Families.length === 0) return [];

    const familyIds = user1Families.map(f => f.family_tree_id);

    // Check which families user2 is also a member of
    const { data: user2Families } = await supabase
      .from('family_members')
      .select('family_tree_id, family_trees!inner(name)')
      .eq('parent_id', userId2)
      .in('family_tree_id', familyIds);

    return (user2Families || []).map(f => {
      const tree = Array.isArray(f.family_trees) ? f.family_trees[0] : f.family_trees;
      return tree?.name || 'Unknown';
    });

  } catch (error) {
    console.error('Error getting mutual families:', error);
    return [];
  }
}

// ============================================================================
// FAMILY SEARCH
// ============================================================================

/**
 * Search for families by handle or name
 * @param query - Search query (family_handle or family name)
 * @param limit - Maximum number of results to return
 */
export async function searchFamiliesByHandle(
  query: string,
  limit: number = SEARCH_CONFIG.MAX_RESULTS
): Promise<SearchFamilyResult[]> {
  try {
    // Check cache first
    const cacheKey = `families:${query}`;
    const cached = searchCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < SEARCH_CONFIG.CACHE_DURATION) {
      console.log('Returning cached family search results:', query);
      return cached.results as SearchFamilyResult[];
    }

    // Validate query
    if (query.trim().length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
      return [];
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Search families by handle or name
    const { data: families, error } = await supabase
      .from('family_trees')
      .select(`
        id,
        name,
        handle,
        invite_link,
        created_by,
        is_active,
        family_members!inner(count)
      `)
      .or(`handle.ilike.%${query}%,name.ilike.%${query}%`)
      .eq('is_active', true)
      .limit(limit);

    if (error) throw error;

    // Transform results and add additional details
    const searchFamilies: SearchFamilyResult[] = await Promise.all(
      (families || []).map(async (family: any) => {
        // Check if user has pending request for this family
        const hasPendingRequest = user ? await checkPendingRequest(user.id, family.id) : false;

        // Get creator name
        const creatorName = await getCreatorName(family.created_by);

        return {
          id: family.id,
          name: family.name || 'Unknown Family',
          handle: family.handle || 'no-handle',
          memberCount: family.family_members?.[0]?.count || 0,
          creatorName,
          inviteLink: family.invite_link,
          hasPendingRequest
        };
      })
    );

    // Cache results
    searchCache.set(cacheKey, {
      results: searchFamilies,
      timestamp: Date.now()
    });

    return searchFamilies;

  } catch (error: any) {
    console.error('Error searching families by handle:', error);
    throw new Error(`Failed to search families: ${error.message}`);
  }
}

/**
 * Check if user has a pending request for a family
 */
async function checkPendingRequest(userId: string, familyId: string): Promise<boolean> {
  try {
    const { data: pendingRequest } = await supabase
      .from('family_requests')
      .select('status')
      .eq('requester_id', userId)
      .eq('family_tree_id', familyId)
      .eq('status', 'pending')
      .maybeSingle();

    return !!pendingRequest;
  } catch (error) {
    console.error('Error checking pending request:', error);
    return false;
  }
}

/**
 * Get creator name for a family
 */
async function getCreatorName(creatorId: string): Promise<string> {
  try {
    const { data: creator } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', creatorId)
      .single();

    return creator?.name || 'Unknown';
  } catch (error) {
    console.error('Error getting creator name:', error);
    return 'Unknown';
  }
}

// ============================================================================
// DEBOUNCE UTILITY
// ============================================================================

/**
 * Debounce function for search input
 */
export function createSearchDebouncer<T extends (...args: any[]) => any>(
  func: T,
  delay: number = SEARCH_CONFIG.DEBOUNCE_DELAY
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * Clear search cache for a specific type or all types
 */
export function clearSearchCache(type?: 'users' | 'families'): void {
  if (type) {
    // Clear cache for specific type
    for (const [key] of searchCache.entries()) {
      if (key.startsWith(`${type}:`)) {
        searchCache.delete(key);
      }
    }
  } else {
    // Clear all cache
    searchCache.clear();
  }
}

/**
 * Expire old cache entries
 */
export function expireOldCache(): void {
  const now = Date.now();
  for (const [key, entry] of searchCache.entries()) {
    if (now - entry.timestamp > SEARCH_CONFIG.CACHE_DURATION) {
      searchCache.delete(key);
    }
  }
}

// ============================================================================
// SEARCH VALIDATION
// ============================================================================

/**
 * Validate search query
 */
export function validateSearchQuery(query: string): {
  isValid: boolean;
  error?: string;
} {
  if (!query || typeof query !== 'string') {
    return { isValid: false, error: 'Query must be a string' };
  }

  const trimmedQuery = query.trim();

  if (trimmedQuery.length === 0) {
    return { isValid: false, error: 'Query cannot be empty' };
  }

  if (trimmedQuery.length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
    return {
      isValid: false,
      error: `Query must be at least ${SEARCH_CONFIG.MIN_QUERY_LENGTH} characters`
    };
  }

  if (trimmedQuery.length > 100) {
    return { isValid: false, error: 'Query is too long (max 100 characters)' };
  }

  return { isValid: true };
}

// ============================================================================
// SEARCH ANALYTICS
// ============================================================================

interface SearchAnalytics {
  userId?: string;
  query: string;
  searchType: 'users' | 'families';
  resultCount: number;
  duration: number;
  timestamp: number;
}

const searchHistory: SearchAnalytics[] = [];

/**
 * Track search analytics (optional)
 */
export function trackSearch(
  analytics: Omit<SearchAnalytics, 'timestamp'>
): void {
  const searchEntry: SearchAnalytics = {
    ...analytics,
    timestamp: Date.now()
  };

  searchHistory.push(searchEntry);

  // Keep only last 100 searches
  if (searchHistory.length > 100) {
    searchHistory.shift();
  }

  console.log('Search tracked:', searchEntry);
}

/**
 * Get search statistics
 */
export function getSearchStatistics(): {
  totalSearches: number;
  averageResultCount: number;
  mostSearchedQueries: string[];
} {
  const totalSearches = searchHistory.length;
  const averageResultCount =
    totalSearches > 0
      ? searchHistory.reduce((sum, s) => sum + s.resultCount, 0) / totalSearches
      : 0;

  // Get most searched queries
  const queryCounts = new Map<string, number>();
  searchHistory.forEach(search => {
    const count = queryCounts.get(search.query) || 0;
    queryCounts.set(search.query, count + 1);
  });

  const mostSearchedQueries = Array.from(queryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([query]) => query);

  return {
    totalSearches,
    averageResultCount,
    mostSearchedQueries
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const SearchService = {
  searchUsersByUsername,
  searchFamiliesByHandle,
  createSearchDebouncer,
  clearSearchCache,
  expireOldCache,
  validateSearchQuery,
  trackSearch,
  getSearchStatistics,
  SEARCH_CONFIG
};

export default SearchService;