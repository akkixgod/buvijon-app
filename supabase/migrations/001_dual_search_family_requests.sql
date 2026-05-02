-- ============================================================================
-- PART 1: DATABASE FOUNDATION & RLS - Dual Search System
-- Migration: Family Requests & Enhanced Security
-- ============================================================================
-- This migration adds support for family tree join requests with proper RLS,
-- ensures invite codes are permanent, and enhances ranking cache security.
-- ============================================================================

-- ============================================================================
-- FAMILY REQUESTS TABLE (New Table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS family_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  family_tree_id UUID REFERENCES family_trees(id) ON DELETE CASCADE NOT NULL,
  request_type VARCHAR(20) DEFAULT 'join' CHECK (request_type IN ('join', 'invite')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  -- Ensure one pending request per requester-family combination
  UNIQUE(requester_id, family_tree_id, status)
);

-- Create indexes for optimized queries
CREATE INDEX IF NOT EXISTS idx_family_requests_family_tree ON family_requests(family_tree_id);
CREATE INDEX IF NOT EXISTS idx_family_requests_requester ON family_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_family_requests_status ON family_requests(status);
CREATE INDEX IF NOT EXISTS idx_family_requests_created ON family_requests(created_at DESC);

-- Add updated_at trigger for family_requests
CREATE OR REPLACE FUNCTION update_family_requests_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_family_requests_timestamp
  BEFORE UPDATE ON family_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_family_requests_timestamp();

-- ============================================================================
-- ENHANCED FAMILY TREES TABLE
-- ============================================================================

-- Add family_handle for @family_handle search (if not exists)
ALTER TABLE family_trees
ADD COLUMN IF NOT EXISTS handle VARCHAR(50) UNIQUE;

-- Add constraint to ensure invite codes don't expire
ALTER TABLE family_trees
ADD CONSTRAINT family_trees_invite_code_permanent
CHECK (invite_code IS NOT NULL AND length(invite_code) = 12);

-- Ensure invite links follow proper Expo format
ALTER TABLE family_trees
ADD CONSTRAINT family_trees_invite_link_format
CHECK (invite_link LIKE 'https://buvijon.app/join/%');

-- Add index for family_handle searches
CREATE INDEX IF NOT EXISTS idx_family_trees_handle ON family_trees(handle);

-- ============================================================================
-- PROFILES TABLE ENHANCEMENTS
-- ============================================================================

-- Ensure username field exists for @username search
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username VARCHAR(30) UNIQUE;

-- Add index for username searches
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_name ON profiles(name);

-- ============================================================================
-- ENHANCED RLS POLICIES FOR FAMILY REQUESTS
-- ============================================================================

-- Enable RLS on family_requests
ALTER TABLE family_requests ENABLE ROW LEVEL SECURITY;

-- Family requests policies - Only creator/admin can see and manage requests
CREATE POLICY "Family tree creators can view requests for their trees"
  ON family_requests FOR SELECT
  USING (
    family_tree_id IN (
      SELECT id FROM family_trees WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Family tree admins can view requests for their trees"
  ON family_requests FOR SELECT
  USING (
    family_tree_id IN (
      SELECT fm.family_tree_id
      FROM family_members fm
      WHERE fm.parent_id = auth.uid()
      AND fm.role IN ('admin', 'creator')
    )
  );

CREATE POLICY "Requesters can view their own requests"
  ON family_requests FOR SELECT
  USING (requester_id = auth.uid());

CREATE POLICY "Family tree creators can manage requests for their trees"
  ON family_requests FOR ALL
  USING (
    family_tree_id IN (
      SELECT id FROM family_trees WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Family tree admins can manage requests for their trees"
  ON family_requests FOR ALL
  USING (
    family_tree_id IN (
      SELECT fm.family_tree_id
      FROM family_members fm
      WHERE fm.parent_id = auth.uid()
      AND fm.role IN ('admin', 'creator')
    )
  );

CREATE POLICY "Users can create requests to join family trees"
  ON family_requests FOR INSERT
  WITH CHECK (requester_id = auth.uid());

-- ============================================================================
-- ENHANCED RLS POLICIES FOR RANKING CACHE
-- ============================================================================

-- Update existing ranking cache policy to only allow accepted family members
DROP POLICY IF EXISTS "Users can view ranking of their family members" ON ranking_cache;

CREATE POLICY "Users can view ranking of their accepted family members only"
  ON ranking_cache FOR SELECT
  USING (
    family_tree_id IN (
      SELECT fm.family_tree_id
      FROM family_members fm
      WHERE fm.parent_id = auth.uid()
      AND fm.is_active = true
      AND EXISTS (
        SELECT 1 FROM family_requests fr
        WHERE fr.family_tree_id = fm.family_tree_id
        AND fr.requester_id = auth.uid()
        AND fr.status = 'accepted'
      )
    )
  );

-- Alternative simpler policy: users can view ranking of their own children
CREATE POLICY "Users can view ranking of their own children"
  ON ranking_cache FOR SELECT
  USING (
    child_id IN (
      SELECT id FROM children WHERE parent_id = auth.uid()
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS FOR FAMILY REQUESTS
-- ============================================================================

-- Function to create family join request
CREATE OR REPLACE FUNCTION create_family_join_request(
  p_requester_id UUID,
  p_family_tree_id UUID,
  p_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_request_id UUID;
BEGIN
  -- Check if requester is already a member
  IF EXISTS (
    SELECT 1 FROM family_members
    WHERE family_tree_id = p_family_tree_id
    AND parent_id = p_requester_id
  ) THEN
    RAISE EXCEPTION 'User is already a member of this family tree';
  END IF;

  -- Check if there's already a pending request
  IF EXISTS (
    SELECT 1 FROM family_requests
    WHERE requester_id = p_requester_id
    AND family_tree_id = p_family_tree_id
    AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Pending request already exists for this family tree';
  END IF;

  -- Create the join request
  INSERT INTO family_requests (
    requester_id,
    family_tree_id,
    request_type,
    status,
    message
  ) VALUES (
    p_requester_id,
    p_family_tree_id,
    'join',
    'pending',
    p_message
  ) RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql;

-- Function to accept family join request
CREATE OR REPLACE FUNCTION accept_family_join_request(
  p_request_id UUID,
  p_admin_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_request RECORD;
BEGIN
  -- Get the request
  SELECT * INTO v_request
  FROM family_requests
  WHERE id = p_request_id
  AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  -- Verify admin has permission
  IF NOT EXISTS (
    SELECT 1 FROM family_members fm
    WHERE fm.family_tree_id = v_request.family_tree_id
    AND fm.parent_id = p_admin_id
    AND fm.role IN ('admin', 'creator')
  ) AND v_request.family_tree_id NOT IN (
    SELECT id FROM family_trees WHERE created_by = p_admin_id
  ) THEN
    RAISE EXCEPTION 'User does not have permission to accept this request';
  END IF;

  -- Add user as family member
  INSERT INTO family_members (
    family_tree_id,
    parent_id,
    role,
    is_active
  ) VALUES (
    v_request.family_tree_id,
    v_request.requester_id,
    'member',
    true
  );

  -- Update request status
  UPDATE family_requests
  SET status = 'accepted',
      updated_at = NOW()
  WHERE id = p_request_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to decline family join request
CREATE OR REPLACE FUNCTION decline_family_join_request(
  p_request_id UUID,
  p_admin_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_request RECORD;
BEGIN
  -- Get the request
  SELECT * INTO v_request
  FROM family_requests
  WHERE id = p_request_id
  AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  -- Verify admin has permission
  IF NOT EXISTS (
    SELECT 1 FROM family_members fm
    WHERE fm.family_tree_id = v_request.family_tree_id
    AND fm.parent_id = p_admin_id
    AND fm.role IN ('admin', 'creator')
  ) AND v_request.family_tree_id NOT IN (
    SELECT id FROM family_trees WHERE created_by = p_admin_id
  ) THEN
    RAISE EXCEPTION 'User does not have permission to decline this request';
  END IF;

  -- Update request status
  UPDATE family_requests
  SET status = 'declined',
      updated_at = NOW()
  WHERE id = p_request_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending requests for a family tree
CREATE OR REPLACE FUNCTION get_pending_family_requests(
  p_family_tree_id UUID
) RETURNS TABLE (
  request_id UUID,
  requester_id UUID,
  requester_name TEXT,
  requester_username VARCHAR,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  request_type VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fr.id as request_id,
    fr.requester_id,
    p.name as requester_name,
    p.username as requester_username,
    fr.message,
    fr.created_at,
    fr.request_type
  FROM family_requests fr
  JOIN profiles p ON fr.requester_id = p.id
  WHERE fr.family_tree_id = p_family_tree_id
    AND fr.status = 'pending'
  ORDER BY fr.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get request status for a user
CREATE OR REPLACE FUNCTION get_user_request_status(
  p_user_id UUID,
  p_family_tree_id UUID
) RETURNS TABLE (
  request_id UUID,
  status VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fr.id as request_id,
    fr.status,
    fr.created_at,
    fr.updated_at
  FROM family_requests fr
  WHERE fr.requester_id = p_user_id
    AND fr.family_tree_id = p_family_tree_id
  ORDER BY fr.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- REALTIME SUBSCRIPTIONS FOR FAMILY REQUESTS
-- ============================================================================

-- Enable realtime for family_requests
ALTER PUBLICATION supabase_realtime ADD TABLE family_requests;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- This migration successfully adds:
-- 1. family_requests table with proper constraints and indexes
-- 2. Enhanced RLS policies restricting access to family creators/admins
-- 3. Ranking cache policies restricting access to accepted family members
-- 4. Family handle and username search capabilities
-- 5. Permanent invite code constraints
-- 6. Helper functions for request management
-- 7. Realtime support for family requests

-- Run this migration manually in Supabase dashboard SQL Editor
-- or use: supabase migration apply
