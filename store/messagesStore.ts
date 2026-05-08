import { create } from 'zustand';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { SearchService } from '@/services/searchService';

// ============================================================================
// TYPES
// ============================================================================

export type StandingCategory = 'excellent' | 'good' | 'neutral' | 'warning' | 'critical';
export type RoomType = 'system' | 'group' | 'direct';
export type RequestStatus = 'pending' | 'accepted' | 'declined';
export type SearchTab = 'users' | 'families';

export interface FamilyRanking {
  childId: string;
  childName: string;
  screenTimeMinutes: number;
  screenTimePercentage: number;
  overallScore: number;
  rankPosition: number;
  rankChange: number;
  standingCategory: StandingCategory;
  streakDays: number;
  isMyChild: boolean;
  isPerspectiveChild: boolean;
}

export interface ChatRoom {
  id: string;
  familyTreeId: string;
  roomType: RoomType;
  roomName: string;
  metadata: Record<string, any>;
  lastMessage?: ChatMessage;
  unreadCount: number;
  isActive: boolean;
}

export interface ChatMessage {
  id: string;
  chatRoomId: string;
  senderId?: string;
  senderName?: string;
  messageType: 'text' | 'image' | 'system' | 'ai_response';
  content: string;
  imageUrl?: string;
  replyToId?: string;
  createdAt: string;
  isRead: boolean;
  readBy: string[];
}

export interface FamilyRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterUsername: string;
  familyTreeId: string;
  familyTreeName: string;
  familyTreeHandle: string;
  requestType: string;
  status: RequestStatus;
  message: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchUserResult {
  id: string;
  name: string;
  username: string;
  avatar: string;
  isPremium: boolean;
  mutualFamilies?: string[];
}

export interface SearchFamilyResult {
  id: string;
  name: string;
  handle: string;
  memberCount: number;
  creatorName: string;
  inviteLink: string;
  hasPendingRequest?: boolean;
}

export interface MessagesState {
  // Family Ranking Data
  familyRanking: FamilyRanking[];
  currentPerspectiveChildId: string | null;
  isLoadingRanking: boolean;
  rankingError: string | null;

  // Chat Data
  chatRooms: ChatRoom[];
  activeChatRoomId: string | null;
  isLoadingMessages: boolean;
  chatError: string | null;

  // Real-time subscriptions
  rankingSubscription: RealtimeChannel | null;
  chatSubscription: RealtimeChannel | null;
  requestSubscription: RealtimeChannel | null;

  // Dual Search State
  searchTab: SearchTab;
  searchQuery: string;
  searchUsers: SearchUserResult[];
  searchFamilies: SearchFamilyResult[];
  isSearching: boolean;
  searchError: string | null;

  // Family Request State
  pendingRequests: FamilyRequest[];
  userRequestStatus: Record<string, RequestStatus>;
  isLoadingRequests: boolean;
  requestError: string | null;
  unreadRequestCount: number;

  // Actions
  loadFamilyRanking: (familyTreeId: string, perspectiveChildId?: string) => Promise<void>;
  setPerspectiveChild: (childId: string | null) => void;
  loadChatRooms: (familyTreeId: string) => Promise<void>;
  setActiveChatRoom: (roomId: string | null) => void;
  loadMessages: (roomId: string, limit?: number) => Promise<ChatMessage[]>;
  sendMessage: (roomId: string, content: string, messageType?: string, imageUrl?: string) => Promise<void>;
  markAsRead: (roomId: string) => Promise<void>;
  joinFamilyTree: (inviteCode: string) => Promise<void>;
  createDirectChat: (parentId: string) => Promise<string>;

  // Dual Search Actions
  setSearchTab: (tab: SearchTab) => void;
  searchUsersByUsername: (query: string) => Promise<void>;
  searchFamiliesByHandle: (query: string) => Promise<void>;
  clearSearch: () => void;

  // Family Request Actions
  sendFamilyJoinRequest: (familyTreeId: string, message?: string) => Promise<void>;
  acceptFamilyRequest: (requestId: string) => Promise<void>;
  declineFamilyRequest: (requestId: string) => Promise<void>;
  handleRequest: (requestId: string, action: 'accept' | 'decline') => Promise<void>;
  loadPendingRequests: (familyTreeId: string) => Promise<void>;
  loadUserRequestStatus: (familyTreeId: string) => Promise<void>;

  // Buvijon Bot Actions
  sendBuvijonNotification: (familyTreeId: string, message: string, metadata?: Record<string, any>) => Promise<void>;

  // Real-time Setup Functions
  setupRequestSubscription: (familyTreeId: string) => void;
  setupRankingSubscription: (familyTreeId: string) => void;
  setupChatSubscription: (familyTreeId: string) => void;

  // Cleanup
  unsubscribeRankingUpdates: () => void;
  unsubscribeChatUpdates: () => void;
  unsubscribeRequestUpdates: () => void;
  cleanup: () => void;
}

// ============================================================================
// ZUSTAND STORE
// ============================================================================

export const useMessagesStore = create<MessagesState>((set, get) => ({
  // Initial State
  familyRanking: [],
  currentPerspectiveChildId: null,
  isLoadingRanking: false,
  rankingError: null,

  chatRooms: [],
  activeChatRoomId: null,
  isLoadingMessages: false,
  chatError: null,

  rankingSubscription: null,
  chatSubscription: null,
  requestSubscription: null,

  // Dual Search State
  searchTab: 'users',
  searchQuery: '',
  searchUsers: [],
  searchFamilies: [],
  isSearching: false,
  searchError: null,

  // Family Request State
  pendingRequests: [],
  userRequestStatus: {},
  isLoadingRequests: false,
  requestError: null,
  unreadRequestCount: 0,

  // Load Family Ranking
  loadFamilyRanking: async (familyTreeId: string, perspectiveChildId?: string) => {
    set({ isLoadingRanking: true, rankingError: null });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get current parent's children for "my kid" logic
      const { data: myChildren } = await supabase
        .from('children')
        .select('id, name')
        .eq('parent_id', user.id);

      const myChildIds = new Set(myChildren?.map(c => c.id) || []);

      // Call the PostgreSQL function for family ranking
      const { data: rankingData, error } = await supabase
        .rpc('get_family_ranking', {
          p_family_tree_id: familyTreeId,
          p_perspective_child_id: perspectiveChildId || myChildren?.[0]?.id
        });

      if (error) throw error;

      // Transform data to match our interface
      const familyRanking: FamilyRanking[] = (rankingData || []).map((item: any) => ({
        childId: item.child_id,
        childName: item.child_name,
        screenTimeMinutes: item.screen_time_minutes,
        screenTimePercentage: Number(item.screen_time_percentage),
        overallScore: Number(item.overall_score),
        rankPosition: item.rank_position,
        rankChange: item.rank_change || 0,
        standingCategory: item.standing_category,
        streakDays: item.streak_days || 0,
        isMyChild: item.is_my_child || myChildIds.has(item.child_id),
        isPerspectiveChild: item.is_perspective_child || false
      }));

      set({
        familyRanking,
        currentPerspectiveChildId: perspectiveChildId || myChildren?.[0]?.id || null,
        isLoadingRanking: false
      });

      // Setup real-time subscription if not already active
      if (!get().rankingSubscription) {
        get().setupRankingSubscription(familyTreeId);
      }

    } catch (error: any) {
      console.error('Error loading family ranking:', error);
      set({
        rankingError: error.message,
        isLoadingRanking: false
      });
    }
  },

  // Set Perspective Child
  setPerspectiveChild: (childId: string | null) => {
    set({ currentPerspectiveChildId: childId });
    // Note: Actual ranking reload would require familyTreeId to be available
    // This should be called from a component that has access to the current familyTreeId
  },

  // Load Chat Rooms
  loadChatRooms: async (familyTreeId: string) => {
    set({ isLoadingMessages: true, chatError: null });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get all chat rooms for this family tree
      const { data: rooms, error: roomsError } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          chat_participants!inner(parent_id)
        `)
        .eq('family_tree_id', familyTreeId)
        .eq('is_active', true);

      if (roomsError) throw roomsError;

      // Get last message and unread count for each room
      const chatRooms: ChatRoom[] = await Promise.all(
        (rooms || []).map(async (room: any) => {
          // Get last message
          const { data: lastMessage } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('chat_room_id', room.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_room_id', room.id)
            .neq('sender_id', user.id)
            .is('is_read', false);

          return {
            id: room.id,
            familyTreeId: room.family_tree_id,
            roomType: room.room_type,
            roomName: room.room_name,
            metadata: room.metadata || {},
            lastMessage: lastMessage ? {
              id: lastMessage.id,
              chatRoomId: lastMessage.chat_room_id,
              senderId: lastMessage.sender_id,
              messageType: lastMessage.message_type,
              content: lastMessage.content,
              imageUrl: lastMessage.image_url,
              replyToId: lastMessage.reply_to_id,
              createdAt: lastMessage.created_at,
              isRead: lastMessage.is_read,
              readBy: lastMessage.read_by || []
            } : undefined,
            unreadCount: count || 0,
            isActive: room.is_active
          };
        })
      );

      set({
        chatRooms,
        isLoadingMessages: false
      });

      // Setup chat subscription
      get().setupChatSubscription(familyTreeId);

    } catch (error: any) {
      console.error('Error loading chat rooms:', error);
      set({
        chatError: error.message,
        isLoadingMessages: false
      });
    }
  },

  // Set Active Chat Room
  setActiveChatRoom: (roomId: string | null) => {
    set({ activeChatRoomId: roomId });

    if (roomId) {
      get().markAsRead(roomId);
    }
  },

  // Load Messages for a specific room
  loadMessages: async (roomId: string, limit: number = 50) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:parent_id(id, name)
        `)
        .eq('chat_room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const messages: ChatMessage[] = (data || []).map((msg: any) => ({
        id: msg.id,
        chatRoomId: msg.chat_room_id,
        senderId: msg.sender_id,
        senderName: msg.sender?.name,
        messageType: msg.message_type,
        content: msg.content,
        imageUrl: msg.image_url,
        replyToId: msg.reply_to_id,
        createdAt: msg.created_at,
        isRead: msg.is_read,
        readBy: msg.read_by || []
      }));

      return messages.reverse();

    } catch (error: any) {
      console.error('Error loading messages:', error);
      throw error;
    }
  },

  // Send Message
  sendMessage: async (roomId: string, content: string, messageType: string = 'text', imageUrl?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          chat_room_id: roomId,
          sender_id: user.id,
          message_type: messageType,
          content,
          image_url: imageUrl
        });

      if (error) throw error;

    } catch (error: any) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // Mark Messages as Read
  markAsRead: async (roomId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('chat_room_id', roomId)
        .neq('sender_id', user.id)
        .is('is_read', false);

      // Update local state
      set({
        chatRooms: get().chatRooms.map(room =>
          room.id === roomId ? { ...room, unreadCount: 0 } : room
        )
      });

    } catch (error: any) {
      console.error('Error marking messages as read:', error);
    }
  },

  // Join Family Tree
  joinFamilyTree: async (inviteCode: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Find family tree by invite code
      const { data: familyTree, error: treeError } = await supabase
        .from('family_trees')
        .select('*')
        .eq('invite_code', inviteCode)
        .eq('is_active', true)
        .single();

      if (treeError || !familyTree) {
        throw new Error('Invalid invite code or family tree not found');
      }

      // Add user as family member
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_tree_id: familyTree.id,
          parent_id: user.id,
          role: 'member'
        });

      if (memberError) {
        // Check if already a member
        if (memberError.code === '23505') { // Unique violation
          console.log('Already a member of this family tree');
          return familyTree.id;
        }
        throw memberError;
      }

      return familyTree.id;

    } catch (error: any) {
      console.error('Error joining family tree:', error);
      throw error;
    }
  },

  // Create Direct Chat
  createDirectChat: async (otherParentId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const sortedIds = [user.id, otherParentId].sort();

    // 1. Check if a direct DM already exists between these two users (any tree or global).
    const { data: existingChats } = await supabase
      .from('chat_rooms')
      .select('id, metadata')
      .eq('room_type', 'direct');

    const existing = (existingChats ?? []).find(room => {
      const parts: string[] = room.metadata?.participants ?? [];
      return parts.join(',') === sortedIds.join(',');
    });
    if (existing) return existing.id;

    // 2. Prefer a shared family tree, fall back to requester's first tree, then null.
    const { data: userFamilies } = await supabase
      .from('family_members')
      .select('family_tree_id')
      .eq('parent_id', user.id);

    const userFamilyIds = (userFamilies ?? []).map(f => f.family_tree_id);

    let familyTreeId: string | null = null;
    if (userFamilyIds.length > 0) {
      const { data: shared } = await supabase
        .from('family_members')
        .select('family_tree_id')
        .eq('parent_id', otherParentId)
        .in('family_tree_id', userFamilyIds)
        .limit(1)
        .maybeSingle();
      familyTreeId = shared?.family_tree_id ?? userFamilyIds[0] ?? null;
    }

    // 3. Create the room.
    const { data: newChat, error } = await supabase
      .from('chat_rooms')
      .insert({
        family_tree_id: familyTreeId,
        room_type: 'direct',
        room_name: 'Direct Chat',
        created_by: user.id,
        metadata: { participants: sortedIds },
      })
      .select('id')
      .single();

    if (error) throw error;

    // 4. Add participants (ignore duplicate errors).
    await supabase.from('chat_participants').upsert(
      [
        { chat_room_id: newChat.id, parent_id: user.id },
        { chat_room_id: newChat.id, parent_id: otherParentId },
      ],
      { onConflict: 'chat_room_id,parent_id' }
    );

    return newChat.id;
  },

  // ============================================================================
  // DUAL SEARCH ACTIONS
  // ============================================================================

  // Set Search Tab
  setSearchTab: (tab: SearchTab) => {
    set({ searchTab: tab, searchQuery: '', searchUsers: [], searchFamilies: [] });
  },

  // Search Users by Username
  searchUsersByUsername: async (query: string) => {
    set({ isSearching: true, searchError: null, searchQuery: query });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Use SearchService for search with caching and optimization
      const searchUsers = await SearchService.searchUsersByUsername(
        query,
        user.id // Exclude current user
      );

      set({ searchUsers, isSearching: false });

    } catch (error: any) {
      console.error('Error searching users:', error);
      set({
        searchError: error.message,
        searchUsers: [],
        isSearching: false
      });
    }
  },

  // Search Families by Handle
  searchFamiliesByHandle: async (query: string) => {
    set({ isSearching: true, searchError: null, searchQuery: query });

    try {
      // Use SearchService for search with caching and optimization
      const searchFamilies = await SearchService.searchFamiliesByHandle(query);

      set({ searchFamilies, isSearching: false });

    } catch (error: any) {
      console.error('Error searching families:', error);
      set({
        searchError: error.message,
        searchFamilies: [],
        isSearching: false
      });
    }
  },

  // Clear Search
  clearSearch: () => {
    // Clear search cache
    SearchService.clearSearchCache();

    set({
      searchQuery: '',
      searchUsers: [],
      searchFamilies: [],
      searchError: null
    });
  },

  // ============================================================================
  // FAMILY REQUEST ACTIONS
  // ============================================================================

  // Send Family Join Request
  sendFamilyJoinRequest: async (familyTreeId: string, message?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Call PostgreSQL function to create join request
      const { data: requestId, error } = await supabase
        .rpc('create_family_join_request', {
          p_requester_id: user.id,
          p_family_tree_id: familyTreeId,
          p_message: message
        });

      if (error) throw error;

      // Update user request status
      set(state => ({
        userRequestStatus: {
          ...state.userRequestStatus,
          [familyTreeId]: 'pending'
        }
      }));

      // Get user profile data for notification
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('name, username')
        .eq('id', user.id)
        .single();

      const userName = userProfile?.name || 'Someone';
      const userUsername = userProfile?.username || 'unknown';

      // Send Buvijon notification to family tree
      await get().sendBuvijonNotification(
        familyTreeId,
        `${userName} (@${userUsername}) has requested to join your family tree.`
      );

      // Update search results to show pending status
      set(state => ({
        searchFamilies: state.searchFamilies.map(family =>
          family.id === familyTreeId
            ? { ...family, hasPendingRequest: true }
            : family
        )
      }));

      console.log('Family join request sent:', requestId);
      return requestId;

    } catch (error: any) {
      console.error('Error sending family join request:', error);
      throw error;
    }
  },

  // Handle Request (Unified accept/decline)
  handleRequest: async (requestId: string, action: 'accept' | 'decline') => {
    try {
      if (action === 'accept') {
        await get().acceptFamilyRequest(requestId);
      } else {
        await get().declineFamilyRequest(requestId);
      }
    } catch (error: any) {
      console.error(`Error ${action}ing family request:`, error);
      throw error;
    }
  },

  // Accept Family Request
  acceptFamilyRequest: async (requestId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Call PostgreSQL function to accept request
      const { data: success, error } = await supabase
        .rpc('accept_family_join_request', {
          p_request_id: requestId,
          p_admin_id: user.id
        });

      if (error) throw error;
      if (!success) throw new Error('Failed to accept request');

      // Remove from pending requests
      set(state => ({
        pendingRequests: state.pendingRequests.filter(req => req.id !== requestId),
        unreadRequestCount: Math.max(0, state.unreadRequestCount - 1)
      }));

      console.log('Family request accepted:', requestId);

    } catch (error: any) {
      console.error('Error accepting family request:', error);
      throw error;
    }
  },

  // Decline Family Request
  declineFamilyRequest: async (requestId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Call PostgreSQL function to decline request
      const { data: success, error } = await supabase
        .rpc('decline_family_join_request', {
          p_request_id: requestId,
          p_admin_id: user.id
        });

      if (error) throw error;
      if (!success) throw new Error('Failed to decline request');

      // Remove from pending requests
      set(state => ({
        pendingRequests: state.pendingRequests.filter(req => req.id !== requestId),
        unreadRequestCount: Math.max(0, state.unreadRequestCount - 1)
      }));

      console.log('Family request declined:', requestId);

    } catch (error: any) {
      console.error('Error declining family request:', error);
      throw error;
    }
  },

  // Load Pending Requests
  loadPendingRequests: async (familyTreeId: string) => {
    set({ isLoadingRequests: true, requestError: null });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Call PostgreSQL function to get pending requests
      const { data: requests, error } = await supabase
        .rpc('get_pending_family_requests', {
          p_family_tree_id: familyTreeId
        });

      if (error) throw error;

      const pendingRequests: FamilyRequest[] = (requests || []).map((req: any) => ({
        id: req.request_id,
        requesterId: req.requester_id,
        requesterName: req.requester_name,
        requesterUsername: req.requester_username,
        familyTreeId: familyTreeId,
        familyTreeName: '', // Can be populated if needed
        familyTreeHandle: '',
        requestType: req.request_type,
        status: 'pending',
        message: req.message,
        createdAt: req.created_at,
        updatedAt: req.created_at
      }));

      // Get family tree details
      if (pendingRequests.length > 0) {
        const { data: familyTree } = await supabase
          .from('family_trees')
          .select('name, handle')
          .eq('id', familyTreeId)
          .single();

        if (familyTree) {
          pendingRequests.forEach(req => {
            req.familyTreeName = familyTree.name;
            req.familyTreeHandle = familyTree.handle;
          });
        }
      }

      set({
        pendingRequests,
        unreadRequestCount: pendingRequests.length,
        isLoadingRequests: false
      });

      // Setup request subscription if not already active
      if (!get().requestSubscription) {
        get().setupRequestSubscription(familyTreeId);
      }

    } catch (error: any) {
      console.error('Error loading pending requests:', error);
      set({
        requestError: error.message,
        pendingRequests: [],
        isLoadingRequests: false
      });
    }
  },

  // Load User Request Status
  loadUserRequestStatus: async (familyTreeId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Call PostgreSQL function to get user's request status
      const { data: status, error } = await supabase
        .rpc('get_user_request_status', {
          p_user_id: user.id,
          p_family_tree_id: familyTreeId
        });

      if (error && error.code !== 'PGRST116') { // PGRST116 = No rows returned
        throw error;
      }

      if (status && status.length > 0) {
        set(state => ({
          userRequestStatus: {
            ...state.userRequestStatus,
            [familyTreeId]: status[0].status
          }
        }));
      }

    } catch (error: any) {
      console.error('Error loading user request status:', error);
      // Don't throw - this is a non-critical operation
    }
  },

  // ============================================================================
  // BUVIJON BOT ACTIONS
  // ============================================================================

  // Send Buvijon Notification
  sendBuvijonNotification: async (familyTreeId: string, message: string, metadata?: Record<string, any>) => {
    try {
      // Find Buvijon AI system chat for this family tree
      const { data: systemChat, error: chatError } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('family_tree_id', familyTreeId)
        .eq('room_type', 'system')
        .eq('is_active', true)
        .single();

      if (chatError || !systemChat) {
        console.warn('Buvijon AI system chat not found for family tree:', familyTreeId);
        return;
      }

      // Create system message in Buvijon chat
      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          chat_room_id: systemChat.id,
          sender_id: null, // System message - no sender
          message_type: 'system',
          content: message,
          metadata: metadata ? JSON.stringify(metadata) : '{}'
        });

      if (messageError) {
        console.warn('Failed to send Buvijon notification:', messageError);
        return;
      }

      console.log('Buvijon notification sent:', message);

    } catch (error: any) {
      console.error('Error sending Buvijon notification:', error);
      // Don't throw - notifications are non-critical
    }
  },

  // ============================================================================
  // SETUP REQUEST SUBSCRIPTION
  // ============================================================================

  // Setup Request Subscription
  setupRequestSubscription: (familyTreeId: string) => {
    const channel = supabase
      .channel(`family_requests:${familyTreeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'family_requests',
          filter: `family_tree_id=eq.${familyTreeId}`
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('Family request update received:', payload);

          // Reload pending requests
          await get().loadPendingRequests(familyTreeId);

          // If user sent a request, update local status
          if (payload.eventType === 'INSERT' && payload.new.requester_id === (await supabase.auth.getUser()).data.user?.id) {
            set(state => ({
              userRequestStatus: {
                ...state.userRequestStatus,
                [familyTreeId]: 'pending'
              }
            }));
          }
        }
      )
      .subscribe();

    set({ requestSubscription: channel });
  },

  // Setup Ranking Subscription
  setupRankingSubscription: (familyTreeId: string) => {
    const channel = supabase
      .channel(`family_ranking:${familyTreeId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'ranking_cache',
          filter: `family_tree_id=eq.${familyTreeId}`
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('Ranking update received:', payload);

          // Reload ranking data when changes detected
          const { currentPerspectiveChildId } = get();
          await get().loadFamilyRanking(familyTreeId, currentPerspectiveChildId || undefined);
        }
      )
      .subscribe();

    set({ rankingSubscription: channel });
  },

  // Setup Chat Subscription
  setupChatSubscription: (familyTreeId: string) => {
    const channel = supabase
      .channel(`family_chat:${familyTreeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('New message received:', payload);

          // Update chat rooms with new message
          const { chatRooms } = get();
          const updatedRoom = chatRooms.find(room => room.id === payload.new.chat_room_id);

          if (updatedRoom) {
            const newMessage: ChatMessage = {
              id: payload.new.id,
              chatRoomId: payload.new.chat_room_id,
              senderId: payload.new.sender_id,
              messageType: payload.new.message_type,
              content: payload.new.content,
              imageUrl: payload.new.image_url,
              replyToId: payload.new.reply_to_id,
              createdAt: payload.new.created_at,
              isRead: payload.new.is_read,
              readBy: payload.new.read_by || []
            };

            // Update room's last message and increment unread count
            set({
              chatRooms: chatRooms.map(room =>
                room.id === updatedRoom.id
                  ? {
                      ...room,
                      lastMessage: newMessage,
                      unreadCount: room.id === get().activeChatRoomId ? 0 : room.unreadCount + 1
                    }
                  : room
              )
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: 'is_read=eq.true'
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('Message marked as read:', payload);

          // Update unread counts for affected rooms
          set({
            chatRooms: get().chatRooms.map(room =>
              room.id === payload.new.chat_room_id
                ? { ...room, unreadCount: Math.max(0, room.unreadCount - 1) }
                : room
            )
          });
        }
      )
      .subscribe();

    set({ chatSubscription: channel });
  },

  // Unsubscribe from ranking updates
  unsubscribeRankingUpdates: () => {
    const { rankingSubscription } = get();
    if (rankingSubscription) {
      supabase.removeChannel(rankingSubscription);
      set({ rankingSubscription: null });
    }
  },

  // Unsubscribe from chat updates
  unsubscribeChatUpdates: () => {
    const { chatSubscription } = get();
    if (chatSubscription) {
      supabase.removeChannel(chatSubscription);
      set({ chatSubscription: null });
    }
  },

  // Unsubscribe from request updates
  unsubscribeRequestUpdates: () => {
    const { requestSubscription } = get();
    if (requestSubscription) {
      supabase.removeChannel(requestSubscription);
      set({ requestSubscription: null });
    }
  },

  // Cleanup all subscriptions
  cleanup: () => {
    get().unsubscribeRankingUpdates();
    get().unsubscribeChatUpdates();
    get().unsubscribeRequestUpdates();
  }
}));