# Database Migration Instructions

## Part 1: Apply SQL Migration Manually

Due to certificate issues, please apply the SQL migration manually in your Supabase dashboard:

### Steps:
1. Open https://app.supabase.com
2. Select your project: `yhqvohgvrcdshdfuchhv`
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the entire content of: `supabase/migrations/001_dual_search_family_requests.sql`
6. Paste it into the SQL Editor
7. Click **Run** (or press Ctrl+Enter)

### What this migration does:
- ✅ Creates `family_requests` table for join requests
- ✅ Adds RLS policies so only family creators can see/manage requests
- ✅ Enhances ranking cache RLS to restrict access to accepted members
- ✅ Adds family handle support for @family_handle search
- ✅ Adds username support for @username search
- ✅ Creates helper functions for request management
- ✅ Enables realtime for family requests

### Verify the migration:
After running, run this verification query:
```sql
-- Check if tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('family_requests', 'family_trees', 'profiles', 'ranking_cache');

-- Check if RLS policies were created
SELECT policyname, tablename
FROM pg_policies
WHERE tablename IN ('family_requests', 'ranking_cache');

-- Check if functions were created
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%family%';
```

## Alternative: Use Supabase CLI (if certificate issues resolved)

If you resolve the certificate issues, you can also run:
```bash
supabase db push
```

## Next Steps
After applying the migration, the app will be ready for the dual-search functionality.
The rest of the implementation (store, UI components) will work automatically.
