-- ============================================================================
-- BUVIJON FAMILY TREE & RANKING CACHE SCHEMA
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- FAMILY TREES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS family_trees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  created_by UUID REFERENCES parents(id) ON DELETE CASCADE,
  invite_code VARCHAR(12) UNIQUE NOT NULL,
  invite_link TEXT NOT NULL, -- Permanent Expo Linking URL
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  tree_settings JSONB DEFAULT '{}'::jsonb -- Store additional settings
);

-- Create index for faster invite code lookups
CREATE INDEX idx_family_trees_invite_code ON family_trees(invite_code);
CREATE INDEX idx_family_trees_created_by ON family_trees(created_by);

-- ============================================================================
-- FAMILY MEMBERS TABLE (Joins parents to family trees)
-- ============================================================================
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_tree_id UUID REFERENCES family_trees(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES parents(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' NOT NULL CHECK (role IN ('creator', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(family_tree_id, parent_id)
);

-- Create indexes for faster queries
CREATE INDEX idx_family_members_tree ON family_members(family_tree_id);
CREATE INDEX idx_family_members_parent ON family_members(parent_id);

-- ============================================================================
-- RANKING CACHE TABLE (Data Shadowing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ranking_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL,
  family_tree_id UUID NOT NULL REFERENCES family_trees(id) ON DELETE CASCADE,
  calculation_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Screen Time Metrics (Pre-calculated)
  screen_time_minutes INT DEFAULT 0,
  screen_time_limit INT DEFAULT 0,
  screen_time_percentage DECIMAL(5,2) DEFAULT 0.00,

  -- Mental Health Metrics (Pre-calculated)
  mental_health_score DECIMAL(5,2) DEFAULT 0.00, -- Scale 0-100
  mood_score DECIMAL(5,2) DEFAULT 0.00,
  activity_score DECIMAL(5,2) DEFAULT 0.00,
  social_score DECIMAL(5,2) DEFAULT 0.00,

  -- Combined Metrics
  overall_score DECIMAL(5,2) DEFAULT 0.00, -- Final ranking score
  rank_position INT DEFAULT 0, -- Position in family ranking
  rank_change INT DEFAULT 0, -- Change from previous day (-1, 0, +1, etc.)

  -- Family Standing Categories
  standing_category VARCHAR(30) DEFAULT 'neutral' CHECK (standing_category IN ('excellent', 'good', 'neutral', 'warning', 'critical')),
  streak_days INT DEFAULT 0, -- Current streak of good behavior

  -- Metadata
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  calculation_version INT DEFAULT 1,

  UNIQUE(child_id, calculation_date, family_tree_id)
);

-- Create indexes for optimized queries
CREATE INDEX idx_ranking_cache_date ON ranking_cache(calculation_date);
CREATE INDEX idx_ranking_cache_child ON ranking_cache(child_id);
CREATE INDEX idx_ranking_cache_family ON ranking_cache(family_tree_id);
CREATE INDEX idx_ranking_cache_rank ON ranking_cache(family_tree_id, rank_position);
CREATE INDEX idx_ranking_cache_overall ON ranking_cache(family_tree_id, overall_score DESC);

-- ============================================================================
-- CHAT SYSTEM TABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_tree_id UUID REFERENCES family_trees(id) ON DELETE CASCADE,
  room_type VARCHAR(20) NOT NULL CHECK (room_type IN ('system', 'group', 'direct')),
  room_name VARCHAR(100),
  created_by UUID REFERENCES parents(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_chat_rooms_family ON chat_rooms(family_tree_id);
CREATE INDEX idx_chat_rooms_type ON chat_rooms(room_type);

-- Chat participants (for direct messages)
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES parents(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_read_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(chat_room_id, parent_id)
);

CREATE INDEX idx_chat_participants_room ON chat_participants(chat_room_id);
CREATE INDEX idx_chat_participants_parent ON chat_participants(parent_id);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES parents(id) ON DELETE SET NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system', 'ai_response')),
  content TEXT NOT NULL,
  image_url TEXT,
  reply_to_id UUID REFERENCES chat_messages(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_by JSONB DEFAULT '[]'::jsonb -- Array of parent IDs who read the message
);

CREATE INDEX idx_chat_messages_room ON chat_messages(chat_room_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);

-- ============================================================================
-- TRIGGER FUNCTIONS FOR DATA SHADOWING
-- ============================================================================

-- Function to calculate and update ranking cache when child usage changes
CREATE OR REPLACE FUNCTION update_ranking_cache()
RETURNS TRIGGER AS $$
DECLARE
  v_child_id UUID;
  v_family_tree_id UUID;
  v_screen_time INT;
  v_screen_time_limit INT;
  v_screen_time_pct DECIMAL;
  v_mental_health DECIMAL;
  v_mood_score DECIMAL;
  v_activity_score DECIMAL;
  v_social_score DECIMAL;
  v_overall_score DECIMAL;
  v_new_rank INT;
  v_old_rank INT;
  v_rank_change INT;
  v_standing_cat VARCHAR;
  v_streak INT;
  v_today DATE;
BEGIN
  -- Get today's date
  v_today := CURRENT_DATE;

  -- Get child's family tree
  SELECT family_tree_id INTO v_family_tree_id
  FROM children c
  JOIN family_members fm ON c.parent_id = fm.parent_id
  WHERE c.id = NEW.child_id
  LIMIT 1;

  v_child_id := NEW.child_id;

  -- Calculate screen time metrics
  SELECT
    COALESCE(screen_time_today, 0),
    COALESCE(daily_limit_minutes, 120)
  INTO v_screen_time, v_screen_time_limit
  FROM children WHERE id = v_child_id;

  v_screen_time_pct := CASE
    WHEN v_screen_time_limit > 0 THEN (v_screen_time::DECIMAL / v_screen_time_limit * 100)
    ELSE 0
  END;

  -- Calculate mental health score based on screen time (inverse relationship)
  -- Lower screen time = higher mental health score
  v_mental_health := GREATEST(0, LEAST(100, 100 - v_screen_time_pct));

  -- Calculate mood score (can be enhanced with actual mood data)
  v_mood_score := 75 + (v_mental_health - 50) * 0.5; -- Base 75, influenced by mental health

  -- Calculate activity score (based on app diversity, time of day usage)
  v_activity_score := 70 + RAND() * 20; -- Placeholder - can be enhanced

  -- Calculate social score (based on family interactions, chat participation)
  v_social_score := 65 + RAND() * 25; -- Placeholder - can be enhanced

  -- Calculate overall score (weighted average)
  v_overall_score := (
    v_mental_health * 0.35 + -- Mental health is most important
    v_mood_score * 0.25 +     -- Mood contributes significantly
    v_activity_score * 0.20 + -- Activity matters
    v_social_score * 0.20     -- Social interactions
  );

  -- Determine standing category
  v_standing_cat := CASE
    WHEN v_overall_score >= 85 THEN 'excellent'
    WHEN v_overall_score >= 70 THEN 'good'
    WHEN v_overall_score >= 50 THEN 'neutral'
    WHEN v_overall_score >= 30 THEN 'warning'
    ELSE 'critical'
  END;

  -- Calculate streak (days of consecutive good/good standing)
  SELECT COALESCE(streak_days, 0) INTO v_streak
  FROM ranking_cache
  WHERE child_id = v_child_id
    AND calculation_date = v_today - INTERVAL '1 day'
    AND standing_category IN ('excellent', 'good');

  IF v_standing_cat IN ('excellent', 'good') THEN
    v_streak := v_streak + 1;
  ELSE
    v_streak := 0;
  END IF;

  -- Get old rank before update
  SELECT rank_position INTO v_old_rank
  FROM ranking_cache
  WHERE child_id = v_child_id
    AND calculation_date = v_today
    AND family_tree_id = v_family_tree_id;

  -- Insert or update ranking cache
  INSERT INTO ranking_cache (
    child_id, family_tree_id, calculation_date,
    screen_time_minutes, screen_time_limit, screen_time_percentage,
    mental_health_score, mood_score, activity_score, social_score,
    overall_score, standing_category, streak_days, calculated_at
  ) VALUES (
    v_child_id, v_family_tree_id, v_today,
    v_screen_time, v_screen_time_limit, v_screen_time_pct,
    v_mental_health, v_mood_score, v_activity_score, v_social_score,
    v_overall_score, v_standing_cat, v_streak, NOW()
  )
  ON CONFLICT (child_id, calculation_date, family_tree_id)
  DO UPDATE SET
    screen_time_minutes = EXCLUDED.screen_time_minutes,
    screen_time_limit = EXCLUDED.screen_time_limit,
    screen_time_percentage = EXCLUDED.screen_time_percentage,
    mental_health_score = EXCLUDED.mental_health_score,
    mood_score = EXCLUDED.mood_score,
    activity_score = EXCLUDED.activity_score,
    social_score = EXCLUDED.social_score,
    overall_score = EXCLUDED.overall_score,
    standing_category = EXCLUDED.standing_category,
    streak_days = EXCLUDED.streak_days,
    calculated_at = NOW();

  -- Recalculate ranks for all children in the family tree
  WITH ranked_children AS (
    SELECT
      child_id,
      family_tree_id,
      overall_score,
      ROW_NUMBER() OVER (
        PARTITION BY family_tree_id
        ORDER BY overall_score DESC, streak_days DESC
      ) as new_rank
    FROM ranking_cache
    WHERE calculation_date = v_today
      AND family_tree_id = v_family_tree_id
  )
  UPDATE ranking_cache rc
  SET
    rank_position = rc2.new_rank,
    rank_change = COALESCE(rc_old.rank_position, rc2.new_rank) - rc2.new_rank
  FROM ranked_children rc2
  LEFT JOIN ranking_cache rc_old ON rc_old.child_id = rc2.child_id
    AND rc_old.calculation_date = v_today - INTERVAL '1 day'
  WHERE rc.child_id = rc2.child_id
    AND rc.calculation_date = v_today;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic ranking updates
CREATE TRIGGER trigger_update_ranking_on_screen_time
  AFTER INSERT OR UPDATE OF screen_time_today
  ON children
  FOR EACH ROW
  EXECUTE FUNCTION update_ranking_cache();

CREATE TRIGGER trigger_update_ranking_on_limit
  AFTER UPDATE OF daily_limit_minutes
  ON children
  FOR EACH ROW
  EXECUTE FUNCTION update_ranking_cache();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate invite link for family tree
CREATE OR REPLACE FUNCTION generate_family_invite_link(p_family_tree_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_invite_code VARCHAR(12);
  v_invite_link TEXT;
BEGIN
  -- Generate unique invite code
  LOOP
    v_invite_code := substring(md5(random()::text), 1, 12);
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM family_trees WHERE invite_code = v_invite_code
    );
  END LOOP;

  -- Update family tree with invite code
  UPDATE family_trees
  SET invite_code = v_invite_code
  WHERE id = p_family_tree_id;

  -- Generate permanent Expo Linking URL
  v_invite_link := 'https://buvijon.app/join/' || v_invite_code;

  -- Update family tree with invite link
  UPDATE family_trees
  SET invite_link = v_invite_link
  WHERE id = p_family_tree_id;

  RETURN v_invite_link;
END;
$$ LANGUAGE plpgsql;

-- Function to get family ranking for a specific perspective
CREATE OR REPLACE FUNCTION get_family_ranking(p_family_tree_id UUID, p_perspective_child_id UUID DEFAULT NULL)
RETURNS TABLE (
  child_id UUID,
  child_name VARCHAR,
  screen_time_minutes INT,
  screen_time_percentage DECIMAL,
  overall_score DECIMAL,
  rank_position INT,
  rank_change INT,
  standing_category VARCHAR,
  streak_days INT,
  is_my_child BOOLEAN,
  is_perspective_child BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rc.child_id,
    c.name,
    rc.screen_time_minutes,
    rc.screen_time_percentage,
    rc.overall_score,
    rc.rank_position,
    rc.rank_change,
    rc.standing_category,
    CASE WHEN fm.parent_id = (SELECT parent_id FROM children WHERE id = p_perspective_child_id)
         THEN true ELSE false END as is_my_child,
    CASE WHEN rc.child_id = p_perspective_child_id
         THEN true ELSE false END as is_perspective_child
  FROM ranking_cache rc
  JOIN children c ON rc.child_id = c.id
  LEFT JOIN family_members fm ON rc.family_tree_id = fm.family_tree_id
    AND fm.parent_id = (SELECT parent_id FROM children WHERE id = p_perspective_child_id)
  WHERE rc.calculation_date = CURRENT_DATE
    AND rc.family_tree_id = p_family_tree_id
  ORDER BY rc.overall_score DESC, rc.streak_days DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Create default system chat rooms for each family tree
CREATE OR REPLACE FUNCTION create_family_system_chats(p_family_tree_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Create Buvijon AI System chat
  INSERT INTO chat_rooms (family_tree_id, room_type, room_name, metadata)
  VALUES (
    p_family_tree_id,
    'system',
    'Buvijon AI',
    '{"system_type": "ai_assistant", "ai_model": "buvijon_v1"}'::jsonb
  );

  -- Create Group Garden Chat
  INSERT INTO chat_rooms (family_tree_id, room_type, room_name, metadata)
  VALUES (
    p_family_tree_id,
    'group',
    'Family Garden',
    '{"system_type": "family_chat", "welcome_message": "Welcome to the Family Garden Chat!"}'::jsonb
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE family_trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Family trees policies
CREATE POLICY "Users can view family trees they belong to"
  ON family_trees FOR SELECT
  USING (
    id IN (SELECT family_tree_id FROM family_members WHERE parent_id = auth.uid())
  );

CREATE POLICY "Users can create family trees"
  ON family_trees FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Family members policies
CREATE POLICY "Users can view family members of their trees"
  ON family_members FOR SELECT
  USING (
    family_tree_id IN (SELECT family_tree_id FROM family_members WHERE parent_id = auth.uid())
  );

-- Ranking cache policies
CREATE POLICY "Users can view ranking of their family members"
  ON ranking_cache FOR SELECT
  USING (
    family_tree_id IN (SELECT family_tree_id FROM family_members WHERE parent_id = auth.uid())
  );

-- Chat rooms policies
CREATE POLICY "Users can view chat rooms they have access to"
  ON chat_rooms FOR SELECT
  USING (
    family_tree_id IN (SELECT family_tree_id FROM family_members WHERE parent_id = auth.uid())
  );

-- Chat messages policies
CREATE POLICY "Users can view messages in their accessible chat rooms"
  ON chat_messages FOR SELECT
  USING (
    chat_room_id IN (
      SELECT cr.id FROM chat_rooms cr
      JOIN family_members fm ON cr.family_tree_id = fm.family_tree_id
      WHERE fm.parent_id = auth.uid()
    )
  );

-- ============================================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================================

-- Enable realtime for ranking cache
ALTER PUBLICATION supabase_realtime ADD TABLE ranking_cache;

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

COMMIT;