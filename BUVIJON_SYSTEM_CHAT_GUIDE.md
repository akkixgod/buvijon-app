# Buvijon System Chat - Automated Notifications

## Overview

The Buvijon system chat provides automated notifications for family tree events directly to parent accounts. The system ensures important notifications are always visible and easy to access.

## Features

### ✅ Automatic Notifications
- **Family Requests**: "X (@username) has requested to join your family tree."
- **Request Accepted**: "X (@username) has been added to your family tree!"
- **Request Declined**: "Request from X (@username) has been declined."

### ✅ Pinned System Chats
- System chats are automatically pinned to the top of all parent accounts
- Always visible and easily accessible
- Sorted by priority (system chats → pinned chats → regular chats)

### ✅ Buvijon Bot
- Dedicated system bot profile that sends notifications
- Identified as "Buvijon (@buvijon)"
- Marked as bot profile in database

### ✅ Real-time Updates
- Instant notification delivery via PostgreSQL triggers
- No need for page refresh
- Real-time subscription support

## Database Components

### 1. System Chat Tables & Columns

#### Enhanced `chat_rooms` Table
```sql
-- New columns added
ALTER TABLE chat_rooms ADD COLUMN room_type ENUM('direct', 'group', 'system');
ALTER TABLE chat_rooms ADD COLUMN is_pinned BOOLEAN DEFAULT false;
```

#### Buvijon Bot Profile
```sql
-- Bot profile automatically created
id: '00000000-0000-0000-0000-000000000001'
name: 'Buvijon'
username: 'buvijon'
email: 'buvijon@system.app'
is_bot: true
```

### 2. PostgreSQL Functions

#### Core Notification Functions

**`send_buvijon_notification(p_family_tree_id, p_message, p_metadata)`**
- Sends a notification message to the family's system chat
- Automatically creates system chat if it doesn't exist
- Returns the message ID

**`get_or_create_family_system_chat(p_family_tree_id, p_admin_id)`**
- Retrieves existing system chat or creates new one
- Ensures admin and Buvijon bot are participants
- Returns chat room ID

#### Request Notification Functions

**`notify_family_request_created()`**
- Trigger function that fires when a new family request is created
- Sends notification to admin's system chat
- Includes requester information and request details

**`notify_family_request_accepted()`**
- Trigger function that fires when request status changes to 'accepted'
- Sends congratulatory notification to admin
- Includes added member information

**`notify_family_request_declined()`**
- Trigger function that fires when request status changes to 'declined'
- Sends declined request notification to admin
- Includes requester information

#### System Chat Management Functions

**`ensure_system_chats_pinned()`**
- Ensures all system chats are pinned
- Adds Buvijon bot to system chats if missing
- Can be run manually to fix any unpinned chats

**`get_user_chat_rooms_sorted(p_parent_id)`**
- Returns user's chat rooms in proper order
- Sorts: system chats → pinned chats → regular chats
- Includes unread count and last message time

**`create_family_system_chat(p_family_tree_id, p_creator_id)`**
- Creates a new system chat for a family tree
- Adds welcome message from Buvijon bot
- Returns chat room ID

**`add_admin_to_system_chat(p_family_tree_id, p_admin_id)`**
- Adds admin participant to existing system chat
- Creates system chat if it doesn't exist
- Useful for adding new admins to families

### 3. Database Triggers

#### Automatic Notification Triggers

```sql
-- Fires when new family request is created
CREATE TRIGGER trigger_notify_family_request_created
  AFTER INSERT ON family_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_family_request_created();

-- Fires when request status changes to accepted
CREATE TRIGGER trigger_notify_family_request_accepted
  AFTER UPDATE ON family_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_family_request_accepted();

-- Fires when request status changes to declined
CREATE TRIGGER trigger_notify_family_request_declined
  AFTER UPDATE ON family_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'declined')
  EXECUTE FUNCTION notify_family_request_declined();
```

#### Automatic System Chat Creation

```sql
-- Fires when new family tree is created
CREATE TRIGGER trigger_create_family_system_chat
  AFTER INSERT ON family_trees
  FOR EACH ROW
  EXECUTE FUNCTION create_family_system_chat(NEW.id, NEW.created_by);
```

## How It Works

### Notification Flow

1. **User sends join request**:
   ```sql
   INSERT INTO family_requests (requester_id, family_tree_id, message)
   VALUES ('user-id', 'family-id', 'Please let me join');
   ```

2. **Trigger fires automatically**:
   ```sql
   -- PostgreSQL trigger fires
   notify_family_request_created()
   ```

3. **System notification sent**:
   ```sql
   -- Buvijon bot sends message to admin's system chat
   "John (@johnsmith) has requested to join your family tree."
   ```

4. **Admin receives notification**:
   - Real-time update via Supabase subscription
   - Appears in pinned system chat at top
   - Includes request details in metadata

### Chat Sorting Logic

System chats are always displayed first using this priority:

1. **System chats** (always first, pinned)
2. **Pinned regular chats**
3. **Regular chats** (sorted by last message)

```typescript
// Frontend sorting logic
chatRooms.sort((a, b) => {
  // System chats first
  if (a.room_type === 'system' && b.room_type !== 'system') return -1;
  if (b.room_type === 'system' && a.room_type !== 'system') return 1;

  // Pinned chats next
  if (a.is_pinned && !b.is_pinned) return -1;
  if (b.is_pinned && !a.is_pinned) return 1;

  // Sort by last message
  return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
});
```

## Migration Instructions

### Step 1: Apply Migration

1. Open Supabase Dashboard: https://app.supabase.com
2. Select project: `yhqvohgvrcdshdfuchhv`
3. Navigate to **SQL Editor**
4. Copy content of: `supabase/migrations/002_buvijon_system_chat.sql`
5. Paste and click **Run**

### Step 2: Verify Installation

Run these verification queries:

```sql
-- Check Buvijon bot profile exists
SELECT * FROM profiles WHERE username = 'buvijon';

-- Check system chat functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%buvijon%';

-- Check triggers exist
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%notify%';

-- Test system chat creation
SELECT create_family_system_chat('test-family-id', 'test-admin-id');
```

### Step 3: Test Notifications

```sql
-- Create test family request (triggers notification)
INSERT INTO family_requests (
  requester_id,
  family_tree_id,
  message
) VALUES (
  'test-user-id',
  'test-family-id',
  'I would like to join your family tree'
);

-- Check notification was sent to system chat
SELECT
  cr.name as chat_name,
  cm.content as message,
  cm.created_at
FROM chat_messages cm
JOIN chat_rooms cr ON cm.chat_room_id = cr.id
WHERE cm.sender_id = '00000000-0000-0000-0000-000000000001'
ORDER BY cm.created_at DESC
LIMIT 5;
```

## Frontend Integration

### 1. TypeScript Interfaces

```typescript
// interfaces/chat.ts
export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  room_type: 'direct' | 'group' | 'system';
  is_pinned: boolean;
  family_tree_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  chat_room_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  message_type: 'text' | 'notification' | 'welcome' | 'system';
  metadata?: {
    request_id?: string;
    requester_id?: string;
    requester_name?: string;
    requester_username?: string;
    family_tree_id?: string;
    family_name?: string;
    action?: 'accepted' | 'declined';
    timestamp?: string;
  };
  is_system_message: boolean;
  is_read: boolean;
  created_at: string;
}

export interface ChatParticipant {
  chat_room_id: string;
  parent_id: string;
  role: 'admin' | 'member' | 'bot';
  joined_at: string;
}
```

### 2. Extended Store Integration

The `messagesStore.ts` already includes `sendBuvijonNotification()` function:

```typescript
// In store/messagesStore.ts
sendBuvijonNotification: async (
  familyTreeId: string,
  message: string,
  metadata?: any
) => {
  try {
    const { data, error } = await supabase
      .rpc('send_buvijon_notification', {
        p_family_tree_id: familyTreeId,
        p_message: message,
        p_metadata: metadata || {}
      });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error sending Buvijon notification:', error);
    throw error;
  }
}
```

### 3. System Chat Component

```typescript
// components/messages/SystemChatItem.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatRoom, ChatMessage } from '@/interfaces/chat';

interface SystemChatItemProps {
  chatRoom: ChatRoom;
  lastMessage: ChatMessage | null;
  unreadCount: number;
  onPress: () => void;
}

const SystemChatItem: React.FC<SystemChatItemProps> = ({
  chatRoom,
  lastMessage,
  unreadCount,
  onPress
}) => {
  const isSystemChat = chatRoom.room_type === 'system';

  return (
    <TouchableOpacity
      style={[styles.container, isSystemChat && styles.systemChat]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* System Chat Icon */}
      <View style={[styles.avatar, isSystemChat && styles.systemAvatar]}>
        {isSystemChat ? (
          <Ionicons name="notifications" size={24} color={Colors.primary} />
        ) : (
          <Text style={styles.avatarText}>
            {chatRoom.name.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>

      {/* Chat Info */}
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={[styles.chatName, isSystemChat && styles.systemText]}>
            {chatRoom.name}
          </Text>

          {/* Unread Badge */}
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {/* Last Message */}
        {lastMessage && (
          <Text style={styles.lastMessage} numberOfLines={1}>
            {lastMessage.is_system_message ? (
              <Text style={styles.systemMessage}>
                {lastMessage.content}
              </Text>
            ) : (
              lastMessage.content
            )}
          </Text>
        )}
      </View>

      {/* Pin Icon for System Chats */}
      {isSystemChat && (
        <Ionicons name="pin" size={16} color={Colors.primary} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 8,
  },
  systemChat: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.gray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  systemAvatar: {
    backgroundColor: Colors.primary,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  systemText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  lastMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  systemMessage: {
    color: Colors.primary,
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadCount: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default React.memo(SystemChatItem);
```

### 4. Chat Sorting Implementation

```typescript
// In your messages screen component
const sortChatRooms = (chatRooms: ChatRoom[]) => {
  return [...chatRooms].sort((a, b) => {
    // System chats first
    if (a.room_type === 'system' && b.room_type !== 'system') return -1;
    if (b.room_type === 'system' && a.room_type !== 'system') return 1;

    // Pinned chats next
    if (a.is_pinned && !b.is_pinned) return -1;
    if (b.is_pinned && !a.is_pinned) return 1;

    // Sort by last message time
    const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    return bTime - aTime;
  });
};

// Use sorted chat rooms
const sortedChatRooms = sortChatRooms(chatRooms);
```

### 5. Real-time Subscription for System Chats

```typescript
// In store/messagesStore.ts or component
const subscribeToSystemChats = (familyTreeId: string) => {
  const channel = supabase
    .channel(`system-chats-${familyTreeId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `chat_room_id=eq.${familyTreeId}`
      },
      (payload) => {
        console.log('New system chat message:', payload.new);

        // Only handle system messages from Buvijon bot
        if (payload.new.is_system_message && payload.new.sender_id === '00000000-0000-0000-0000-000000000001') {
          // Update UI to show notification
          loadChatRooms(familyTreeId);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
```

## Testing Guide

### 1. Database Testing

```sql
-- Test 1: Create system chat manually
SELECT create_family_system_chat('test-family-id', 'test-admin-id');

-- Test 2: Send manual notification
SELECT send_buvijon_notification(
  'test-family-id',
  'Test notification from Buvijon bot!'
);

-- Test 3: Test family request notification
INSERT INTO family_requests (
  requester_id,
  family_tree_id,
  message
) VALUES (
  'test-user-id',
  'test-family-id',
  'Please let me join your family tree'
);

-- Test 4: Check notification was sent
SELECT
  cm.content,
  cm.metadata,
  cm.created_at
FROM chat_messages cm
JOIN chat_rooms cr ON cm.chat_room_id = cr.id
WHERE cr.family_tree_id = 'test-family-id'
  AND cm.sender_id = '00000000-0000-0000-0000-000000000001'
ORDER BY cm.created_at DESC;
```

### 2. Frontend Testing

```typescript
// Test 1: Check if system chats appear first
console.log('Sorted chat rooms:', sortedChatRooms);

// Test 2: Send test notification from frontend
await sendBuvijonNotification(
  'family-tree-id',
  'Test notification from frontend!'
);

// Test 3: Verify system chat is pinned
const systemChat = chatRooms.find(cr => cr.room_type === 'system');
console.log('System chat is pinned:', systemChat?.is_pinned);

// Test 4: Check unread count
const unreadSystemMessages = systemChatMessages.filter(msg => !msg.is_read);
console.log('Unread system messages:', unreadSystemMessages.length);
```

### 3. End-to-End Testing

1. **Create family tree** → System chat automatically created ✅
2. **User sends join request** → Notification appears in system chat ✅
3. **Admin accepts request** → Acceptance notification sent ✅
4. **Check chat list** → System chat appears first, pinned ✅
5. **Open system chat** → See all notifications from Buvijon bot ✅
6. **Mark as read** → Unread count updates correctly ✅

## Troubleshooting

### Issue: System chat not created automatically

**Solution:**
```sql
-- Manually create system chat
SELECT create_family_system_chat('family-tree-id', 'admin-id');

-- Check for trigger errors
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'trigger_create_family_system_chat';
```

### Issue: Notifications not appearing

**Solution:**
```sql
-- Check if Buvijon bot exists
SELECT * FROM profiles WHERE username = 'buvijon';

-- Verify trigger is working
SELECT * FROM chat_messages
WHERE sender_id = '00000000-0000-0000-0000-000000000001'
ORDER BY created_at DESC LIMIT 5;

-- Test notification manually
SELECT send_buvijon_notification(
  'family-tree-id',
  'Manual test notification'
);
```

### Issue: System chat not pinned

**Solution:**
```sql
-- Force pin all system chats
SELECT ensure_system_chats_pinned();

-- Check pinned status
SELECT name, room_type, is_pinned
FROM chat_rooms
WHERE room_type = 'system';
```

### Issue: Real-time updates not working

**Solution:**
```typescript
// Check subscription setup
console.log('Subscription active:', channel?.state);

// Verify realtime is enabled
const { data } = await supabase
  .from('chat_messages')
  .select('id')
  .limit(1);

// Test realtime connection
supabase.getChannels().forEach(channel => {
  console.log('Channel:', channel.topic, 'State:', channel.state);
});
```

## Performance Considerations

### Database Optimization

1. **Indexes**: All required indexes are included in migration
2. **Triggers**: Minimal overhead, only fire on relevant changes
3. **Real-time**: Efficient subscription filtering

### Frontend Optimization

1. **Memoization**: Use `React.memo` for chat list items
2. **Debouncing**: Not needed for notifications (trigger-based)
3. **Pagination**: Consider pagination for old system chat messages
4. **Caching**: Cache system chat data locally

### Monitoring

Monitor these metrics:
- Notification delivery time (<100ms target)
- Real-time subscription reliability
- Database query performance
- User engagement with system chat

## Security Considerations

### Access Control

1. **RLS Policies**: Only family members can access system chats
2. **Bot Security**: Buvijon bot has restricted access
3. **Message Integrity**: Metadata is validated

### Data Privacy

1. **Requester Information**: Limited to name and username
2. **Family Information**: Only visible to family members
3. **Message Content**: System messages are read-only for users

## Future Enhancements

### Potential Improvements

1. **Push Notifications**: Mobile push for system messages
2. **Notification Preferences**: User-customizable notification settings
3. **Rich Notifications**: Embed request buttons in chat messages
4. **Notification History**: Archive old notifications
5. **Multi-Language**: Localized notification messages
6. **Notification Categories**: Group by type (requests, updates, alerts)

### Advanced Features

1. **Smart Notifications**: Context-aware messages
2. **Scheduled Notifications**: Time-delayed delivery
3. **Notification Templates**: Customizable message formats
4. **Analytics**: Track notification engagement
5. **A/B Testing**: Test different notification strategies

## Support

### Documentation Files
- `supabase/migrations/002_buvijon_system_chat.sql` - Database migration
- `store/messagesStore.ts` - State management with notification functions
- `components/messages/DualSearchScreen.tsx` - Dual search integration
- `components/messages/RequestNotification.tsx` - Request notification UI

### Key Functions Reference
- `send_buvijon_notification()` - Send system notification
- `get_or_create_family_system_chat()` - Get/create system chat
- `notify_family_request_created()` - Request notification trigger
- `get_user_chat_rooms_sorted()` - Sorted chat list

---

**Next Steps:**
1. Apply database migration
2. Test notification flow
3. Integrate system chat component
4. Verify real-time updates
5. Deploy to production

The Buvijon system chat provides automated, real-time notifications that keep parents informed about important family tree events while maintaining proper security and performance standards.