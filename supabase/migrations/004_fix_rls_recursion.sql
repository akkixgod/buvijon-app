-- Migration 004: Fix infinite RLS recursion on family_members
-- Root cause: SELECT policy on family_members queries family_members itself,
-- causing Postgres to enter infinite recursion on any query touching this table.

-- ============================================================
-- 1. SECURITY DEFINER function — bypasses RLS internally,
--    breaking the recursion for all callers.
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_family_tree_ids()
RETURNS SETOF UUID LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT family_tree_id FROM family_members WHERE parent_id = auth.uid();
$$;

-- ============================================================
-- 2. FIX SELECT POLICY (was self-referential)
-- ============================================================

DROP POLICY IF EXISTS "Users can view family members of their trees" ON family_members;
CREATE POLICY "Users can view family members of their trees" ON family_members
  FOR SELECT USING (family_tree_id IN (SELECT get_my_family_tree_ids()));

-- ============================================================
-- 3. FIX UPDATE POLICY (was self-referential admin check)
-- ============================================================

DROP POLICY IF EXISTS "Admins can update members" ON family_members;
CREATE POLICY "Admins can update members" ON family_members
  FOR UPDATE USING (
    family_tree_id IN (SELECT get_my_family_tree_ids())
    AND EXISTS (
      SELECT 1 FROM family_trees ft
      WHERE ft.id = family_members.family_tree_id
        AND ft.created_by = auth.uid()
    )
  );

-- ============================================================
-- 4. FIX DELETE POLICY (was self-referential admin check)
-- ============================================================

DROP POLICY IF EXISTS "Admins or self can remove" ON family_members;
CREATE POLICY "Admins or self can remove" ON family_members
  FOR DELETE USING (
    parent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM family_trees ft
      WHERE ft.id = family_members.family_tree_id
        AND ft.created_by = auth.uid()
    )
  );
