# Dual Search System - Integration Guide

## Overview

The Buvijon dual-search system allows users to:
1. **Search for parents by @username** - to start direct conversations
2. **Search for families by @family_handle** - to request to join family trees
3. **Manage family join requests** - accept/decline requests from other parents
4. **Receive Buvijon AI notifications** - automatic notifications for family events

## Components Created

### 1. Database Schema (`supabase/migrations/001_dual_search_family_requests.sql`)
- `family_requests` table for join request management
- Enhanced RLS policies for security
- PostgreSQL functions for request management
- Real-time subscription support

### 2. Enhanced Store (`store/messagesStore.ts`)
Extended with:
- Dual-search state management
- Family request handling
- Buvijon bot notification system
- Real-time subscription for requests

### 3. UI Components

#### DualSearchScreen (`components/messages/DualSearchScreen.tsx`)
- Tab-based search interface (Users/Families)
- Search with debouncing
- User selection and chat creation
- Family search with join request functionality

#### RequestNotification (`components/messages/RequestNotification.tsx`)
- Instagram-style notification icon (heart)
- Badge showing unread request count
- Modal for viewing and managing requests
- Accept/Decline functionality

#### DualSearchIntegration (`components/messages/DualSearchIntegration.tsx`)
- Complete integration example
- Family tree header with notification
- Buvijon AI chat preview
- Search trigger buttons

## Implementation Guide

### Step 1: Apply Database Migration

1. Open Supabase Dashboard: https://app.supabase.com
2. Select project: `yhqvohgvrcdshdfuchhv`
3. Navigate to **SQL Editor**
4. Copy content of: `supabase/migrations/001_dual_search_family_requests.sql`
5. Paste and click **Run**

**Verification:**
```sql
-- Check if tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'family_requests';

-- Check if functions were created
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name LIKE '%family%';
```

### Step 2: Add Translations

See `DUAL_SEARCH_TRANSLATIONS.md` for detailed translation values to add to `i18n/index.ts`.

### Step 3: Integrate into Main Messages Screen

Update `app/(tabs)/messages.tsx` to include the dual-search features:

```typescript
import RequestNotification from '@/components/messages/RequestNotification';
import DualSearchScreen from '@/components/messages/DualSearchScreen';
import { useMessagesStore } from '@/store/messagesStore';

export default function MessagesScreen() {
  const { parent } = useAuthStore();
  const {
    loadPendingRequests,
    searchUsersByUsername,
    searchFamiliesByHandle,
    unreadRequestCount
  } = useMessagesStore();

  const [showSearch, setShowSearch] = useState(false);
  const [activeFamilyTreeId, setActiveFamilyTreeId] = useState<string | null>(null);

  // Load pending requests when family tree is selected
  useEffect(() => {
    if (activeFamilyTreeId) {
      loadPendingRequests(activeFamilyTreeId);
    }
  }, [activeFamilyTreeId, loadPendingRequests]);

  return (
    <View style={styles.container}>
      {/* Messages Screen Header with Request Notification */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>

        <View style={styles.headerRight}>
          {/* Request Notification Icon */}
          <RequestNotification familyTreeId={activeFamilyTreeId} />

          {/* Search Button */}
          <TouchableOpacity onPress={() => setShowSearch(true)}>
            <Ionicons name="search-outline" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Family Selection (if user has multiple families) */}
      {/* ... existing family selection code ... */}

      {/* Main Content */}
      {/* ... existing messages content ... */}

      {/* Dual Search Modal */}
      {showSearch && (
        <DualSearchScreen onClose={() => setShowSearch(false)} />
      )}
    </View>
  );
}
```

### Step 4: Add Family Tree Join Flow

Integrate family tree join functionality:

```typescript
// In your family tree component or settings
import { useMessagesStore } from '@/store/messagesStore';

const { searchFamiliesByHandle, sendFamilyJoinRequest, userRequestStatus } = useMessagesStore();

const handleSearchFamily = async (query: string) => {
  await searchFamiliesByHandle(query);
};

const handleJoinRequest = async (family: SearchFamilyResult) => {
  try {
    await sendFamilyJoinRequest(family.id, 'I would like to join your family tree.');
    Alert.alert('Success', 'Join request sent!');
  } catch (error) {
    Alert.alert('Error', error.message);
  }
};
```

### Step 5: Implement Buvijon Bot Notifications

The Buvijon bot automatically sends notifications when:
- A parent requests to join a family tree
- Requests are accepted/declined
- Other family tree events

**Example notification message:**
```
"John (@johnsmith) has requested to join your family tree."
```

The notification appears in the Buvijon AI system chat, which is always the top chat in the messages list.

## Key Features

### 1. Dual-Search with Tabs
- **Users Tab**: Search for individual parents by @username
- **Families Tab**: Search for family trees by @family_handle
- Automatic debouncing for optimal performance
- Real-time search results

### 2. Request Management
- **For Users**: Send join requests with optional messages
- **For Admins**: View pending requests, accept/decline
- **Real-time Updates**: Instant notification of status changes
- **Buvijon Notifications**: Automatic messages in system chat

### 3. Security Features
- **RLS Policies**: Only family creators/admins can manage requests
- **Status Tracking**: Prevent duplicate requests
- **Request Limits**: One pending request per user-family combination

### 4. Performance Optimizations
- **Debounced Search**: 300ms delay prevents excessive API calls
- **Real-time Subscriptions**: Instant updates without page reloads
- **Efficient Queries**: Optimized indexes on database tables
- **State Management**: Zustand for predictable state updates

## Usage Examples

### Example 1: User Searches for Another Parent
```typescript
// User types "@johnsmith" in search
await searchUsersByUsername("@johnsmith");

// Results: Array of SearchUserResult
// User can tap on result to create direct chat
await createDirectChat(userId);
```

### Example 2: User Searches for Family Tree
```typescript
// User types "@smithfamily" in search
await searchFamiliesByHandle("@smithfamily");

// Results: Array of SearchFamilyResult
// User can tap "Join" button
await sendFamilyJoinRequest(familyId, "Hi, I'd like to join your family!");
```

### Example 3: Admin Manages Join Request
```typescript
// Admin sees pending request in notification
const pendingRequests = await loadPendingRequests(familyTreeId);

// Admin accepts request
await acceptFamilyRequest(requestId);
// Buvijon bot automatically sends: "John (@johnsmith) has been added to your family tree."
```

## Testing Guide

### 1. Database Setup Test
```sql
-- Test family request creation
SELECT create_family_join_request(
  'user-id-here',
  'family-tree-id-here',
  'Test request message'
);

-- Test getting pending requests
SELECT * FROM get_pending_family_requests('family-tree-id-here');

-- Test accepting request
SELECT accept_family_join_request('request-id-here', 'admin-id-here');
```

### 2. Store Functionality Test
```typescript
// Test search functionality
const store = useMessagesStore.getState();
await store.searchUsersByUsername('@testuser');
await store.searchFamiliesByHandle('@testfamily');

// Test request functionality
await store.sendFamilyJoinRequest('family-id', 'Test message');
await store.loadPendingRequests('family-id');
```

### 3. UI Component Test
```typescript
// Test DualSearchScreen
<DualSearchScreen onClose={() => {}} />

// Test RequestNotification
<RequestNotification familyTreeId="test-family-id" />

// Test Integration
<DualSearchIntegration familyTreeId="test-family-id" />
```

### 4. End-to-End Workflow Test
1. **Parent A searches for Parent B**: Verify search results appear
2. **Parent A starts direct chat with Parent B**: Verify chat is created
3. **Parent C searches for Family D**: Verify family appears in search
4. **Parent C sends join request**: Verify request appears in admin's notifications
5. **Admin D accepts request**: Verify Parent C is added to family
6. **Verify Buvijon notification**: Check that notification appears in system chat

## Troubleshooting

### Issue: Search Not Working
**Solutions:**
- Check if SQL migration was applied correctly
- Verify database connection in `lib/supabase.ts`
- Check browser console for Supabase errors
- Ensure user is authenticated

### Issue: Request Notifications Not Appearing
**Solutions:**
- Verify user has admin/creator role in family_members table
- Check if real-time subscription is active
- Test PostgreSQL function `get_pending_family_requests`
- Verify notification icon component is rendered

### Issue: Buvijon Bot Not Sending Messages
**Solutions:**
- Check if system chat room exists for family tree
- Verify `sendBuvijonNotification` function is called
- Check chat_messages table for system messages
- Test PostgreSQL function manually in Supabase SQL Editor

### Issue: Permissions Errors
**Solutions:**
- Review RLS policies in database
- Check user's role in family_members table
- Verify authentication token is valid
- Test with service role key if needed

## Performance Considerations

### 1. Search Performance
- Implement debouncing (already included: 300ms)
- Limit search results (currently 20)
- Use database indexes (already created)
- Consider caching frequent searches

### 2. Real-time Performance
- Unsubscribe from channels when component unmounts
- Use efficient queries with proper filters
- Limit subscription scope to relevant data only
- Implement proper cleanup in store

### 3. State Management
- Use Zustand for efficient state updates
- Implement proper memoization for components
- Avoid unnecessary re-renders
- Use stable callbacks with `useCallback`

## Security Considerations

### 1. RLS Policies
- Only family creators/admins can manage requests
- Requesters can only see their own requests
- Ranking cache restricted to accepted family members
- Proper authentication required for all operations

### 2. Request Validation
- Prevent duplicate pending requests
- Validate request status transitions
- Check user's family membership before allowing requests
- Implement proper error handling

### 3. Data Privacy
- Limit data exposed in search results
- Sanitize user inputs before database operations
- Use parameterized queries to prevent SQL injection
- Implement proper error messages without exposing internals

## Future Enhancements

### Potential Improvements
1. **Advanced Search Filters**
   - Search by mutual friends
   - Filter by family size
   - Geographic-based search
   - Activity-based sorting

2. **Enhanced Notifications**
   - Push notifications for requests
   - Email notifications
   - In-app notification center
   - Notification history

3. **Social Features**
   - Family tree recommendations
   - Mutual friends display
   - Activity feed
   - Community features

4. **Analytics**
   - Search usage tracking
   - Request acceptance rates
   - Popular families ranking
   - User behavior analysis

## Support

### Documentation Files
- `DATABASE_MIGRATION_INSTRUCTIONS.md` - Database setup guide
- `DUAL_SEARCH_TRANSLATIONS.md` - Translation values guide
- `supabase/migrations/001_dual_search_family_requests.sql` - SQL migration
- Component files in `components/messages/` - UI components

### Key Functions Reference
- `create_family_join_request()` - Create join request
- `accept_family_join_request()` - Accept request
- `decline_family_join_request()` - Decline request
- `get_pending_family_requests()` - Get pending requests
- `get_user_request_status()` - Get request status
- `searchUsersByUsername()` - Search for parents
- `searchFamiliesByHandle()` - Search for families
- `sendBuvijonNotification()` - Send system notification

---

**Next Steps:**
1. Apply database migration
2. Add translation values
3. Integrate components into main screen
4. Test complete workflow
5. Deploy to production

For issues or questions, refer to the troubleshooting section or check the existing Buvijon codebase patterns.
