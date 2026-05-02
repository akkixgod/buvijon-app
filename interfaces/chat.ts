/**
 * Chat System Interfaces
 * Defines TypeScript types for chat rooms, messages, and participants
 */

export type RoomType = 'direct' | 'group' | 'system';

export type MessageType = 'text' | 'notification' | 'welcome' | 'system';

export type ParticipantRole = 'admin' | 'member' | 'bot';

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  room_type: RoomType;
  is_pinned: boolean;
  family_tree_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  avatar_url?: string;
}

export interface ChatMessage {
  id: string;
  chat_room_id: string;
  sender_id: string;
  sender_name?: string;
  sender_avatar_url?: string;
  content: string;
  message_type: MessageType;
  metadata?: {
    request_id?: string;
    requester_id?: string;
    requester_name?: string;
    requester_username?: string;
    family_tree_id?: string;
    family_name?: string;
    action?: 'accepted' | 'declined';
    timestamp?: string;
    [key: string]: any;
  };
  is_system_message: boolean;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatParticipant {
  chat_room_id: string;
  parent_id: string;
  parent_name?: string;
  parent_avatar_url?: string;
  role: ParticipantRole;
  joined_at: string;
  is_online?: boolean;
  last_seen_at?: string;
}

export interface SystemChatNotification {
  chat_room_id: string;
  family_tree_id: string;
  message: string;
  metadata: {
    notification_type: 'family_request' | 'request_accepted' | 'request_declined' | 'custom';
    request_id?: string;
    requester_id?: string;
    requester_name?: string;
    requester_username?: string;
    action?: string;
    timestamp: string;
  };
  created_at: string;
}

export interface ChatRoomWithLastMessage extends ChatRoom {
  last_message?: ChatMessage;
  unread_count: number;
}

export interface CreateChatRoomParams {
  name: string;
  description?: string;
  room_type: RoomType;
  family_tree_id?: string;
  is_pinned?: boolean;
  participant_ids?: string[];
}

export interface SendMessageParams {
  chat_room_id: string;
  content: string;
  message_type?: MessageType;
  metadata?: Record<string, any>;
  reply_to?: string;
}

export interface MarkMessagesReadParams {
  chat_room_id: string;
  message_ids?: string[];
  mark_all?: boolean;
}

export interface NotificationMetadata {
  type: 'family_request' | 'request_accepted' | 'request_declined' | 'system';
  request_id?: string;
  requester_id?: string;
  requester_name?: string;
  requester_username?: string;
  family_tree_id?: string;
  family_name?: string;
  action?: 'accepted' | 'declined';
  timestamp: string;
  priority?: 'low' | 'normal' | 'high';
  expires_at?: string;
}

export interface BuvijonNotificationParams {
  family_tree_id: string;
  message: string;
  metadata?: NotificationMetadata;
}

// Helper types for Supabase RPC calls
export interface SendBuvijonNotificationParams {
  p_family_tree_id: string;
  p_message: string;
  p_metadata?: Record<string, any>;
}

export interface GetOrCreateSystemChatParams {
  p_family_tree_id: string;
  p_admin_id: string;
}

export interface EnsureSystemChatsPinnedResult {
  success: boolean;
  pinned_count: number;
}

// Search and filtering types
export interface ChatFilters {
  room_type?: RoomType[];
  is_pinned?: boolean;
  family_tree_id?: string;
  search_query?: string;
  has_unread?: boolean;
}

export interface ChatSortOptions {
  field: 'last_message_at' | 'created_at' | 'name';
  direction: 'asc' | 'desc';
}

// Pagination types
export interface ChatPaginationParams {
  page: number;
  page_size: number;
  chat_room_id?: string;
  before?: string;
  after?: string;
}

export interface PaginatedMessagesResponse {
  messages: ChatMessage[];
  has_more: boolean;
  next_cursor?: string;
  total_count: number;
}

// Real-time subscription types
export interface ChatSubscriptionEvents {
  message_inserted: (message: ChatMessage) => void;
  message_updated: (message: ChatMessage) => void;
  message_deleted: (message_id: string) => void;
  room_updated: (room: ChatRoom) => void;
  participant_joined: (participant: ChatParticipant) => void;
  participant_left: (participant_id: string) => void;
}