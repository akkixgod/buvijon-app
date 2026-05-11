# RLS Audit Checklist

This checklist maps client data access points to required Supabase RLS guarantees.

## Scope

- Tables: `children`, `family_members`, `chat_rooms`, `chat_messages`
- RPC: `get_family_ranking`, `create_family_join_request`, `accept_family_join_request`, `decline_family_join_request`, `get_pending_family_requests`, `get_user_request_status`

## SQL Sources To Verify

- `supabase/schema.sql`
- `supabase/family_tree_schema.sql`
- `supabase/migrations/001_dual_search_family_requests.sql`
- `supabase/migrations/003_security_fixes.sql`
- `supabase/migrations/004_fix_rls_recursion.sql`

## Client Access Mapping

### `children`

- `store/childrenStore.ts`
  - `select('*').eq('parent_id', user.id).eq('is_active', true)`
  - `insert`, `update`, soft-delete
- Required policy outcomes:
  - Parent can only read/write own children rows.
  - No cross-parent update or read through crafted IDs.

### `family_members`

- `app/(tabs)/oila.tsx`, `app/(tabs)/messages.tsx`
  - Read `family_tree_id` by current `parent_id`
- `store/messagesStore.ts`
  - Membership lookups for direct chat and join flow
- Required policy outcomes:
  - Parent can read own membership rows.
  - Parent cannot enumerate arbitrary members outside own family trees.

### `chat_rooms`

- `store/messagesStore.ts`
  - `loadChatRooms` (family-scoped select)
  - `createDirectChat` (insert room)
- Required policy outcomes:
  - Room visibility only for participants/members of the room family.
  - Room creation restricted to authenticated user with valid membership.

### `chat_messages`

- `store/messagesStore.ts`, `app/chat/[id].tsx`
  - Select by `chat_room_id`
  - Insert by sender
  - Update read state
- Required policy outcomes:
  - Message read/insert only within rooms user can access.
  - `sender_id` cannot be spoofed to another user.

## RPC Review Matrix

- `get_family_ranking`
  - Verify function enforces family membership for caller.
- `create_family_join_request`
  - Ensure requester identity is tied to auth user.
- `accept_family_join_request` / `decline_family_join_request`
  - Ensure only admin/owner role in target family can perform.
- `get_pending_family_requests`
  - Ensure only admins in target family can read.
- `get_user_request_status`
  - Ensure user can only read own status.

## Manual Verification Procedure

1. Create two parent accounts: `parentA`, `parentB`.
2. Seed one family tree for `parentA`.
3. With `parentB` session:
   - Attempt direct `select` on `children` where `parent_id = parentA`.
   - Attempt `chat_rooms`/`chat_messages` reads for A rooms.
   - Attempt unauthorized RPC calls for A family.
4. Confirm all blocked by RLS / function guards.
5. Repeat with valid member account and confirm allowed operations.

## Pass Criteria

- All unauthorized reads/writes fail.
- All authorized flows used by app continue to pass.
- No RPC bypass for cross-family access.
