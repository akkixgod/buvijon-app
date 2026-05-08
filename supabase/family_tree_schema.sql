-- ============================================================================
-- BUVIJON FAMILY TREE & RANKING CACHE SCHEMA (fixed)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- FAMILY TREES
-- ============================================================================
CREATE TABLE IF NOT EXISTS family_trees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  handle VARCHAR(50) UNIQUE,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  invite_code VARCHAR(12) UNIQUE NOT NULL,
  invite_link TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  tree_settings JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_family_trees_invite_code ON family_trees(invite_code);
CREATE INDEX IF NOT EXISTS idx_family_trees_created_by  ON family_trees(created_by);
CREATE INDEX IF NOT EXISTS idx_family_trees_handle      ON family_trees(handle);

-- ============================================================================
-- FAMILY MEMBERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_tree_id UUID REFERENCES family_trees(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' NOT NULL CHECK (role IN ('creator', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(family_tree_id, parent_id)
);

CREATE INDEX IF NOT EXISTS idx_family_members_tree   ON family_members(family_tree_id);
CREATE INDEX IF NOT EXISTS idx_family_members_parent ON family_members(parent_id);

-- ============================================================================
-- RANKING CACHE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ranking_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL,
  family_tree_id UUID NOT NULL REFERENCES family_trees(id) ON DELETE CASCADE,
  calculation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  screen_time_minutes INT DEFAULT 0,
  screen_time_limit INT DEFAULT 0,
  screen_time_percentage DECIMAL(5,2) DEFAULT 0.00,
  mental_health_score DECIMAL(5,2) DEFAULT 0.00,
  mood_score DECIMAL(5,2) DEFAULT 0.00,
  activity_score DECIMAL(5,2) DEFAULT 0.00,
  social_score DECIMAL(5,2) DEFAULT 0.00,
  overall_score DECIMAL(5,2) DEFAULT 0.00,
  rank_position INT DEFAULT 0,
  rank_change INT DEFAULT 0,
  standing_category VARCHAR(30) DEFAULT 'neutral'
    CHECK (standing_category IN ('excellent', 'good', 'neutral', 'warning', 'critical')),
  streak_days INT DEFAULT 0,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  calculation_version INT DEFAULT 1,
  UNIQUE(child_id, calculation_date, family_tree_id)
);

CREATE INDEX IF NOT EXISTS idx_ranking_cache_date    ON ranking_cache(calculation_date);
CREATE INDEX IF NOT EXISTS idx_ranking_cache_child   ON ranking_cache(child_id);
CREATE INDEX IF NOT EXISTS idx_ranking_cache_family  ON ranking_cache(family_tree_id);
CREATE INDEX IF NOT EXISTS idx_ranking_cache_rank    ON ranking_cache(family_tree_id, rank_position);
CREATE INDEX IF NOT EXISTS idx_ranking_cache_overall ON ranking_cache(family_tree_id, overall_score DESC);

-- ============================================================================
-- CHAT SYSTEM
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_tree_id UUID REFERENCES family_trees(id) ON DELETE CASCADE,
  room_type VARCHAR(20) NOT NULL CHECK (room_type IN ('system', 'group', 'direct')),
  room_name VARCHAR(100),
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_pinned BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_family  ON chat_rooms(family_tree_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_type    ON chat_rooms(room_type);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_pinned  ON chat_rooms(is_pinned, created_at);

CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member', 'bot')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_read_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(chat_room_id, parent_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_participants_room   ON chat_participants(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_parent ON chat_participants(parent_id);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  message_type VARCHAR(20) DEFAULT 'text'
    CHECK (message_type IN ('text', 'image', 'system', 'ai_response', 'notification', 'welcome')),
  content TEXT NOT NULL,
  image_url TEXT,
  reply_to_id UUID REFERENCES chat_messages(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  is_read BOOLEAN DEFAULT false,
  is_system_message BOOLEAN DEFAULT false,
  read_by JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room    ON chat_messages(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender  ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created ON chat_messages(chat_room_id, created_at DESC);

-- ============================================================================
-- RANKING TRIGGER (fixed: NEW.id not NEW.child_id, random() not RAND())
-- ============================================================================
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
  v_standing_cat VARCHAR;
  v_streak INT;
  v_today DATE;
BEGIN
  v_today := CURRENT_DATE;
  v_child_id := NEW.id;  -- FIX: was NEW.child_id, trigger fires on children table

  SELECT family_tree_id INTO v_family_tree_id
  FROM family_members fm
  JOIN children c ON c.parent_id = fm.parent_id
  WHERE c.id = v_child_id
  LIMIT 1;

  -- No family tree yet — skip silently
  IF v_family_tree_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    COALESCE(screen_time_today, 0),
    COALESCE(daily_limit_minutes, 120)
  INTO v_screen_time, v_screen_time_limit
  FROM children WHERE id = v_child_id;

  v_screen_time_pct := CASE
    WHEN v_screen_time_limit > 0 THEN (v_screen_time::DECIMAL / v_screen_time_limit * 100)
    ELSE 0
  END;

  v_mental_health  := GREATEST(0, LEAST(100, 100 - v_screen_time_pct));
  v_mood_score     := 75 + (v_mental_health - 50) * 0.5;
  v_activity_score := GREATEST(0, 100 - (v_screen_time_pct * 0.5));  -- FIX: was RAND()
  v_social_score   := 50.0;                                           -- FIX: was RAND()

  v_overall_score := (
    v_mental_health  * 0.35 +
    v_mood_score     * 0.25 +
    v_activity_score * 0.20 +
    v_social_score   * 0.20
  );

  v_standing_cat := CASE
    WHEN v_overall_score >= 85 THEN 'excellent'
    WHEN v_overall_score >= 70 THEN 'good'
    WHEN v_overall_score >= 50 THEN 'neutral'
    WHEN v_overall_score >= 30 THEN 'warning'
    ELSE 'critical'
  END;

  SELECT COALESCE(streak_days, 0) INTO v_streak
  FROM ranking_cache
  WHERE child_id = v_child_id
    AND calculation_date = v_today - INTERVAL '1 day'
    AND standing_category IN ('excellent', 'good');

  v_streak := CASE WHEN v_standing_cat IN ('excellent', 'good') THEN v_streak + 1 ELSE 0 END;

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
  ON CONFLICT (child_id, calculation_date, family_tree_id) DO UPDATE SET
    screen_time_minutes    = EXCLUDED.screen_time_minutes,
    screen_time_limit      = EXCLUDED.screen_time_limit,
    screen_time_percentage = EXCLUDED.screen_time_percentage,
    mental_health_score    = EXCLUDED.mental_health_score,
    mood_score             = EXCLUDED.mood_score,
    activity_score         = EXCLUDED.activity_score,
    social_score           = EXCLUDED.social_score,
    overall_score          = EXCLUDED.overall_score,
    standing_category      = EXCLUDED.standing_category,
    streak_days            = EXCLUDED.streak_days,
    calculated_at          = NOW();

  -- Recalculate ranks for all children in the family tree today
  WITH ranked AS (
    SELECT child_id, ROW_NUMBER() OVER (
      PARTITION BY family_tree_id ORDER BY overall_score DESC, streak_days DESC
    ) AS new_rank
    FROM ranking_cache
    WHERE calculation_date = v_today AND family_tree_id = v_family_tree_id
  )
  UPDATE ranking_cache rc
  SET
    rank_position = r.new_rank,
    rank_change   = COALESCE(
      (SELECT rank_position FROM ranking_cache
       WHERE child_id = r.child_id AND calculation_date = v_today - INTERVAL '1 day'),
      r.new_rank
    ) - r.new_rank
  FROM ranked r
  WHERE rc.child_id = r.child_id AND rc.calculation_date = v_today;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_ranking_on_screen_time ON children;
CREATE TRIGGER trigger_update_ranking_on_screen_time
  AFTER INSERT OR UPDATE OF screen_time_today ON children
  FOR EACH ROW EXECUTE FUNCTION update_ranking_cache();

DROP TRIGGER IF EXISTS trigger_update_ranking_on_limit ON children;
CREATE TRIGGER trigger_update_ranking_on_limit
  AFTER UPDATE OF daily_limit_minutes ON children
  FOR EACH ROW EXECUTE FUNCTION update_ranking_cache();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION get_family_ranking(
  p_family_tree_id UUID,
  p_perspective_child_id UUID DEFAULT NULL
)
RETURNS TABLE (
  child_id UUID, child_name VARCHAR,
  screen_time_minutes INT, screen_time_percentage DECIMAL,
  overall_score DECIMAL, rank_position INT, rank_change INT,
  standing_category VARCHAR, streak_days INT,
  is_my_child BOOLEAN, is_perspective_child BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rc.child_id, c.name,
    rc.screen_time_minutes, rc.screen_time_percentage,
    rc.overall_score, rc.rank_position, rc.rank_change,
    rc.standing_category, rc.streak_days,
    (fm.parent_id IS NOT NULL) AS is_my_child,
    (rc.child_id = p_perspective_child_id) AS is_perspective_child
  FROM ranking_cache rc
  JOIN children c ON rc.child_id = c.id
  LEFT JOIN family_members fm
    ON rc.family_tree_id = fm.family_tree_id
    AND fm.parent_id = (SELECT parent_id FROM children WHERE id = p_perspective_child_id LIMIT 1)
  WHERE rc.calculation_date = CURRENT_DATE
    AND rc.family_tree_id = p_family_tree_id
  ORDER BY rc.overall_score DESC, rc.streak_days DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_family_system_chats(p_family_tree_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO chat_rooms (family_tree_id, room_type, room_name, is_pinned, metadata)
  VALUES
    (p_family_tree_id, 'system', 'Buvijon', true,
     '{"system_type":"ai_assistant"}'::jsonb),
    (p_family_tree_id, 'group', 'Family Garden', false,
     '{"system_type":"family_chat"}'::jsonb)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE family_trees     ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_cache    ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms       ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view family trees they belong to" ON family_trees;
CREATE POLICY "Users can view family trees they belong to" ON family_trees FOR SELECT
  USING (id IN (SELECT family_tree_id FROM family_members WHERE parent_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create family trees" ON family_trees;
CREATE POLICY "Users can create family trees" ON family_trees FOR INSERT
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can view family members of their trees" ON family_members;
CREATE POLICY "Users can view family members of their trees" ON family_members FOR SELECT
  USING (family_tree_id IN (SELECT family_tree_id FROM family_members WHERE parent_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view ranking of their family members" ON ranking_cache;
CREATE POLICY "Users can view ranking of their family members" ON ranking_cache FOR SELECT
  USING (family_tree_id IN (SELECT family_tree_id FROM family_members WHERE parent_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view chat rooms they have access to" ON chat_rooms;
CREATE POLICY "Users can view chat rooms they have access to" ON chat_rooms FOR SELECT
  USING (
    family_tree_id IN (SELECT family_tree_id FROM family_members WHERE parent_id = auth.uid())
    OR family_tree_id IS NULL
  );

DROP POLICY IF EXISTS "Users can insert chat rooms" ON chat_rooms;
CREATE POLICY "Users can insert chat rooms" ON chat_rooms FOR INSERT
  WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

DROP POLICY IF EXISTS "Users can view messages in their accessible chat rooms" ON chat_messages;
CREATE POLICY "Users can view messages in their accessible chat rooms" ON chat_messages FOR SELECT
  USING (
    chat_room_id IN (
      SELECT cr.id FROM chat_rooms cr
      LEFT JOIN family_members fm ON cr.family_tree_id = fm.family_tree_id
      WHERE fm.parent_id = auth.uid() OR cr.family_tree_id IS NULL
    )
  );

DROP POLICY IF EXISTS "Users can insert messages" ON chat_messages;
CREATE POLICY "Users can insert messages" ON chat_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid() OR sender_id IS NULL);

DROP POLICY IF EXISTS "Users can view chat participants" ON chat_participants;
CREATE POLICY "Users can view chat participants" ON chat_participants FOR SELECT
  USING (parent_id = auth.uid() OR
    chat_room_id IN (SELECT id FROM chat_rooms WHERE family_tree_id IN (
      SELECT family_tree_id FROM family_members WHERE parent_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "Users can join chats" ON chat_participants;
CREATE POLICY "Users can join chats" ON chat_participants FOR INSERT
  WITH CHECK (parent_id = auth.uid() OR parent_id IS NULL);

-- ============================================================================
-- REALTIME
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE ranking_cache;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
