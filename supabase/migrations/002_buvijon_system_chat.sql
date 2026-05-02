-- ============================================================================
-- PART 2: BUVIJON SYSTEM CHAT - AUTOMATED NOTIFICATIONS
-- Migration: System Chat Bot & Automatic Notifications
-- ============================================================================
-- This migration adds the "Buvijon" system chat functionality with:
-- - Automatic notifications for family requests
-- - Pinned system chats for all users
-- - PostgreSQL triggers for real-time notifications
-- ============================================================================

-- ============================================================================
-- SYSTEM CHAT SETUP
-- ============================================================================

-- Ensure system chat room type exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'room_type_enum'
  ) THEN
    CREATE TYPE room_type_enum AS ENUM ('direct', 'group', 'system');
  END IF;
END $$;

-- Add room_type column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_rooms' AND column_name = 'room_type'
  ) THEN
    ALTER TABLE chat_rooms ADD COLUMN room_type room_type_enum DEFAULT 'direct';
  END IF;
END $$;

-- Add is_pinned column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_rooms' AND column_name = 'is_pinned'
  ) THEN
    ALTER TABLE chat_rooms ADD COLUMN is_pinned BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add index for pinned chats
CREATE INDEX IF NOT EXISTS idx_chat_rooms_pinned ON chat_rooms(is_pinned, created_at);

-- ============================================================================
-- BUVIJON BOT PROFILE
-- ============================================================================

-- Create or update Buvijon bot profile
INSERT INTO profiles (id, name, username, email, is_bot)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Buvijon',
  'buvijon',
  'buvijon@system.app',
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  username = EXCLUDED.username,
  is_bot = true;

-- ============================================================================
-- SYSTEM CHAT NOTIFICATION FUNCTIONS
-- ============================================================================

-- Function to get or create system chat for a family tree
CREATE OR REPLACE FUNCTION get_or_create_family_system_chat(
  p_family_tree_id UUID,
  p_admin_id UUID
) RETURNS UUID AS $$
DECLARE
  v_chat_room_id UUID;
  v_family_name TEXT;
BEGIN
  -- Try to find existing system chat for this family tree
  SELECT id INTO v_chat_room_id
  FROM chat_rooms
  WHERE family_tree_id = p_family_tree_id
    AND room_type = 'system';

  -- If exists, return it
  IF v_chat_room_id IS NOT NULL THEN
    RETURN v_chat_room_id;
  END IF;

  -- Get family tree name
  SELECT name INTO v_family_name
  FROM family_trees
  WHERE id = p_family_tree_id;

  -- Create new system chat room
  INSERT INTO chat_rooms (
    family_tree_id,
    name,
    description,
    room_type,
    is_pinned,
    created_by
  ) VALUES (
    p_family_tree_id,
    'Buvijon System Chat',
    'System notifications for ' || COALESCE(v_family_name, 'your family'),
    'system',
    true,
    p_admin_id
  ) RETURNING id INTO v_chat_room_id;

  -- Add admin as participant
  INSERT INTO chat_participants (
    chat_room_id,
    parent_id,
    role
  ) VALUES (
    v_chat_room_id,
    p_admin_id,
    'admin'
  );

  -- Add Buvijon bot as participant
  INSERT INTO chat_participants (
    chat_room_id,
    parent_id,
    role
  ) VALUES (
    v_chat_room_id,
    '00000000-0000-0000-0000-000000000001',
    'bot'
  );

  RETURN v_chat_room_id;
END;
$$ LANGUAGE plpgsql;

-- Function to send Buvijon notification
CREATE OR REPLACE FUNCTION send_buvijon_notification(
  p_family_tree_id UUID,
  p_message TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_chat_room_id UUID;
  v_admin_id UUID;
  v_message_id UUID;
BEGIN
  -- Get family tree admin/creator
  SELECT created_by INTO v_admin_id
  FROM family_trees
  WHERE id = p_family_tree_id;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Family tree not found';
  END IF;

  -- Get or create system chat
  v_chat_room_id := get_or_create_family_system_chat(p_family_tree_id, v_admin_id);

  -- Insert notification message
  INSERT INTO chat_messages (
    chat_room_id,
    sender_id,
    content,
    message_type,
    metadata,
    is_system_message
  ) VALUES (
    v_chat_room_id,
    '00000000-0000-0000-0000-000000000001', -- Buvijon bot ID
    p_message,
    'notification',
    p_metadata,
    true
  ) RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql;

-- Function to send family request notification
CREATE OR REPLACE FUNCTION notify_family_request_created()
RETURNS TRIGGER AS $$
DECLARE
  v_requester_name TEXT;
  v_requester_username VARCHAR;
  v_family_name TEXT;
  v_notification_message TEXT;
  v_metadata JSONB;
BEGIN
  -- Only notify for new pending requests
  IF NEW.status != 'pending' OR TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Get requester information
  SELECT name, username INTO v_requester_name, v_requester_username
  FROM profiles
  WHERE id = NEW.requester_id;

  -- Get family tree name
  SELECT name INTO v_family_name
  FROM family_trees
  WHERE id = NEW.family_tree_id;

  -- Create notification message
  v_notification_message := format(
    '%s (@%s) has requested to join your family tree.',
    COALESCE(v_requester_name, 'Someone'),
    COALESCE(v_requester_username, 'unknown')
  );

  -- Create metadata
  v_metadata := jsonb_build_object(
    'request_id', NEW.id,
    'requester_id', NEW.requester_id,
    'requester_name', v_requester_name,
    'requester_username', v_requester_username,
    'family_tree_id', NEW.family_tree_id,
    'family_name', v_family_name,
    'request_type', NEW.request_type,
    'timestamp', NOW()
  );

  -- Send notification via Buvijon bot
  PERFORM send_buvijon_notification(
    NEW.family_tree_id,
    v_notification_message,
    v_metadata
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to notify family request accepted
CREATE OR REPLACE FUNCTION notify_family_request_accepted()
RETURNS TRIGGER AS $$
DECLARE
  v_requester_name TEXT;
  v_requester_username VARCHAR;
  v_family_name TEXT;
  v_notification_message TEXT;
  v_metadata JSONB;
  v_admin_id UUID;
BEGIN
  -- Only notify when status changes to accepted
  IF NEW.status != 'accepted' OR OLD.status = 'accepted' THEN
    RETURN NEW;
  END IF;

  -- Get requester information
  SELECT name, username INTO v_requester_name, v_requester_username
  FROM profiles
  WHERE id = NEW.requester_id;

  -- Get family tree name
  SELECT name, v_admin_id INTO v_family_name, v_admin_id
  FROM family_trees
  WHERE id = NEW.family_tree_id;

  -- Create notification message
  v_notification_message := format(
    '%s (@%s) has been added to your family tree!',
    COALESCE(v_requester_name, 'Someone'),
    COALESCE(v_requester_username, 'unknown')
  );

  -- Create metadata
  v_metadata := jsonb_build_object(
    'request_id', NEW.id,
    'requester_id', NEW.requester_id,
    'requester_name', v_requester_name,
    'requester_username', v_requester_username,
    'family_tree_id', NEW.family_tree_id,
    'family_name', v_family_name,
    'action', 'accepted',
    'timestamp', NOW()
  );

  -- Send notification via Buvijon bot
  PERFORM send_buvijon_notification(
    NEW.family_tree_id,
    v_notification_message,
    v_metadata
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to notify family request declined
CREATE OR REPLACE FUNCTION notify_family_request_declined()
RETURNS TRIGGER AS $$
DECLARE
  v_requester_name TEXT;
  v_requester_username VARCHAR;
  v_family_name TEXT;
  v_notification_message TEXT;
  v_metadata JSONB;
BEGIN
  -- Only notify when status changes to declined
  IF NEW.status != 'declined' OR OLD.status = 'declined' THEN
    RETURN NEW;
  END IF;

  -- Get requester information
  SELECT name, username INTO v_requester_name, v_requester_username
  FROM profiles
  WHERE id = NEW.requester_id;

  -- Get family tree name
  SELECT name INTO v_family_name
  FROM family_trees
  WHERE id = NEW.family_tree_id;

  -- Create notification message
  v_notification_message := format(
    'Request from %s (@%s) has been declined.',
    COALESCE(v_requester_name, 'Someone'),
    COALESCE(v_requester_username, 'unknown')
  );

  -- Create metadata
  v_metadata := jsonb_build_object(
    'request_id', NEW.id,
    'requester_id', NEW.requester_id,
    'requester_name', v_requester_name,
    'requester_username', v_requester_username,
    'family_tree_id', NEW.family_tree_id,
    'family_name', v_family_name,
    'action', 'declined',
    'timestamp', NOW()
  );

  -- Send notification via Buvijon bot
  PERFORM send_buvijon_notification(
    NEW.family_tree_id,
    v_notification_message,
    v_metadata
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CREATE TRIGGERS FOR AUTOMATIC NOTIFICATIONS
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_notify_family_request_created ON family_requests;
DROP TRIGGER IF EXISTS trigger_notify_family_request_updated ON family_requests;

-- Create trigger for new family requests
CREATE TRIGGER trigger_notify_family_request_created
  AFTER INSERT ON family_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_family_request_created();

-- Create trigger for family request status changes
CREATE TRIGGER trigger_notify_family_request_updated
  AFTER UPDATE ON family_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_family_request_accepted();

-- Create trigger for declined requests
CREATE TRIGGER trigger_notify_family_request_declined
  AFTER UPDATE ON family_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'declined')
  EXECUTE FUNCTION notify_family_request_declined();

-- ============================================================================
-- SYSTEM CHAT PINNING FUNCTIONS
-- ============================================================================

-- Function to ensure system chats are pinned for all users
CREATE OR REPLACE FUNCTION ensure_system_chats_pinned()
RETURNS VOID AS $$
BEGIN
  -- Pin all system chats
  UPDATE chat_rooms
  SET is_pinned = true
  WHERE room_type = 'system';

  -- Ensure Buvijon bot is participant in all system chats
  INSERT INTO chat_participants (chat_room_id, parent_id, role)
  SELECT
    cr.id as chat_room_id,
    '00000000-0000-0000-0000-000000000001' as parent_id,
    'bot' as role
  FROM chat_rooms cr
  WHERE cr.room_type = 'system'
  AND NOT EXISTS (
    SELECT 1 FROM chat_participants cp
    WHERE cp.chat_room_id = cr.id
    AND cp.parent_id = '00000000-0000-0000-0000-000000000001'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get sorted chat rooms (system chats first)
CREATE OR REPLACE FUNCTION get_user_chat_rooms_sorted(
  p_parent_id UUID
) RETURNS TABLE (
  chat_room_id UUID,
  name TEXT,
  room_type room_type_enum,
  is_pinned BOOLEAN,
  last_message_at TIMESTAMP WITH TIME ZONE,
  unread_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cr.id as chat_room_id,
    cr.name,
    cr.room_type,
    cr.is_pinned,
    MAX(cm.created_at) as last_message_at,
    COUNT(CASE WHEN cm.is_read = false AND cm.sender_id != p_parent_id THEN 1 END) as unread_count
  FROM chat_rooms cr
  JOIN chat_participants cp ON cr.id = cp.chat_room_id
  LEFT JOIN chat_messages cm ON cr.id = cm.chat_room_id
  WHERE cp.parent_id = p_parent_id
  GROUP BY cr.id, cr.name, cr.room_type, cr.is_pinned
  ORDER BY
    cr.room_type = 'system' DESC,  -- System chats first
    cr.is_pinned DESC,              -- Pinned chats next
    MAX(cm.created_at) DESC NULLS LAST;  -- Most recent last
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SYSTEM CHAT HELPER FUNCTIONS
-- ============================================================================

-- Function to create system chat for new family tree
CREATE OR REPLACE FUNCTION create_family_system_chat(
  p_family_tree_id UUID,
  p_creator_id UUID
) RETURNS UUID AS $$
DECLARE
  v_chat_room_id UUID;
  v_family_name TEXT;
BEGIN
  -- Get family tree name
  SELECT name INTO v_family_name
  FROM family_trees
  WHERE id = p_family_tree_id;

  -- Create system chat room
  INSERT INTO chat_rooms (
    family_tree_id,
    name,
    description,
    room_type,
    is_pinned,
    created_by
  ) VALUES (
    p_family_tree_id,
    'Buvijon System Chat',
    'System notifications for ' || COALESCE(v_family_name, 'your family'),
    'system',
    true,  -- Always pinned
    p_creator_id
  ) RETURNING id INTO v_chat_room_id;

  -- Add creator as admin participant
  INSERT INTO chat_participants (
    chat_room_id,
    parent_id,
    role
  ) VALUES (
    v_chat_room_id,
    p_creator_id,
    'admin'
  );

  -- Add Buvijon bot as participant
  INSERT INTO chat_participants (
    chat_room_id,
    parent_id,
    role
  ) VALUES (
    v_chat_room_id,
    '00000000-0000-0000-0000-000000000001',
    'bot'
  );

  -- Send welcome message
  INSERT INTO chat_messages (
    chat_room_id,
    sender_id,
    content,
    message_type,
    is_system_message
  ) VALUES (
    v_chat_room_id,
    '00000000-0000-0000-0000-000000000001',
    'Welcome to your family system chat! You will receive important notifications here.',
    'welcome',
    true
  );

  RETURN v_chat_room_id;
END;
$$ LANGUAGE plpgsql;

-- Function to add admin to system chat
CREATE OR REPLACE FUNCTION add_admin_to_system_chat(
  p_family_tree_id UUID,
  p_admin_id UUID
) RETURNS VOID AS $$
DECLARE
  v_chat_room_id UUID;
BEGIN
  -- Get system chat room
  SELECT id INTO v_chat_room_id
  FROM chat_rooms
  WHERE family_tree_id = p_family_tree_id
    AND room_type = 'system';

  IF v_chat_room_id IS NULL THEN
    -- Create system chat if it doesn't exist
    v_chat_room_id := create_family_system_chat(p_family_tree_id, p_admin_id);
  ELSE
    -- Add admin if not already participant
    INSERT INTO chat_participants (chat_room_id, parent_id, role)
    VALUES (v_chat_room_id, p_admin_id, 'admin')
    ON CONFLICT (chat_room_id, parent_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER FOR AUTOMATIC SYSTEM CHAT CREATION
-- ============================================================================

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_create_family_system_chat ON family_trees;

-- Create trigger to automatically create system chat for new family trees
CREATE TRIGGER trigger_create_family_system_chat
  AFTER INSERT ON family_trees
  FOR EACH ROW
  EXECUTE FUNCTION create_family_system_chat(NEW.id, NEW.created_by);

-- ============================================================================
-- REALTIME SUBSCRIPTIONS FOR CHAT MESSAGES
-- ============================================================================

-- Enable realtime for chat_messages if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;
END $$;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Create index for system chat lookups
CREATE INDEX IF NOT EXISTS idx_chat_rooms_system ON chat_rooms(room_type, family_tree_id);

-- Create index for chat participant lookups
CREATE INDEX IF NOT EXISTS idx_chat_participants_parent ON chat_participants(parent_id);

-- Create index for message lookups
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(chat_room_id, created_at DESC);

-- ============================================================================
-- RLS POLICIES FOR SYSTEM CHAT
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view system chats for their family trees
CREATE POLICY "Users can view system chats for their families"
  ON chat_rooms FOR SELECT
  USING (
    room_type = 'system' AND
    family_tree_id IN (
      SELECT family_tree_id FROM family_members WHERE parent_id = auth.uid()
    )
  );

-- Policy: Users can participate in system chats for their families
CREATE POLICY "Users can participate in system chats"
  ON chat_participants FOR INSERT
  WITH CHECK (
    chat_room_id IN (
      SELECT id FROM chat_rooms
      WHERE room_type = 'system' AND
      family_tree_id IN (
        SELECT family_tree_id FROM family_members WHERE parent_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- INITIALIZATION
-- ============================================================================

-- Ensure system chats are pinned for existing family trees
SELECT ensure_system_chats_pinned();

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- This migration successfully adds:
-- 1. Buvijon bot profile and system chat functionality
-- 2. Automatic notifications for family requests (created, accepted, declined)
-- 3. System chat pinning and sorting functionality
-- 4. PostgreSQL triggers for real-time notifications
-- 5. Helper functions for system chat management
-- 6. Proper RLS policies for system chat access
-- 7. Performance indexes for chat operations
-- 8. Realtime subscription support for chat messages

-- Run this migration after applying 001_dual_search_family_requests.sql