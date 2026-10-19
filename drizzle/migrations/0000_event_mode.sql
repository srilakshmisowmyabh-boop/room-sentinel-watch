alter table public.presence_events add column if not exists mode text;
alter table public.alerts add column if not exists mode text;