import { create } from 'zustand';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export type StandingCategory = 'excellent' | 'good' | 'neutral' | 'warning' | 'critical';
export type RoomType = 'system' | 'group' | 'direct';

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

  // Cleanup
  unsubscribeRankingUpdates: () => void;
  unsubscribeChatUpdates: () => void;
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
    const { familyTreeId } = get(); // Would need to store this in state
    set({ currentPerspectiveChildId: childId });

    // Reload ranking with new perspective
    if (childId) {
      // This would need familyTreeId to be available
      // get().loadFamilyRanking(familyTreeId, childId);
    }
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Find a family tree where both parents are members
      const { data: sharedFamily } = await supabase
        .from('family_members')
        .select('family_tree_id')
        .eq('parent_id', user.id)
        .in('family_tree_id', supabase
          .from('family_members')
          .select('family_tree_id')
          .eq('parent_id', otherParentId)
        )
        .limit(1)
        .single();

      if (!sharedFamily) {
        throw new Error('No shared family tree found');
      }

      // Check if direct chat already exists
      const { data: existingChat } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('family_tree_id', sharedFamily.family_tree_id)
        .eq('room_type', 'direct')
        .contains('metadata', { participants: [user.id, otherParentId].sort() })
        .limit(1)
        .single();

      if (existingChat) {
        return existingChat.id;
      }

      // Create new direct chat room
      const { data: newChat, error } = await supabase
        .from('chat_rooms')
        .insert({
          family_tree_id: sharedFamily.family_tree_id,
          room_type: 'direct',
          room_name: 'Direct Chat',
          metadata: { participants: [user.id, otherParentId].sort() }
        })
        .select()
        .single();

      if (error) throw error;

      // Add both participants
      await supabase.from('chat_participants').insert([
        { chat_room_id: newChat.id, parent_id: user.id },
        { chat_room_id: newChat.id, parent_id: otherParentId }
      ]);

      return newChat.id;

    } catch (error: any) {
      console.error('Error creating direct chat:', error);
      throw error;
    }
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

  // Cleanup all subscriptions
  cleanup: () => {
    get().unsubscribeRankingUpdates();
    get().unsubscribeChatUpdates();
  }
}));