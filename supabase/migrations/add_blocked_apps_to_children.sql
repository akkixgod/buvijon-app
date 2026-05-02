alter table children add column if not exists blocked_apps text[] default '{}';
