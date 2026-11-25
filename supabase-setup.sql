-- GTM Milestone Dashboard: shared database setup.
-- Paste this whole file into Supabase > SQL Editor > New query, then click Run.
-- Safe to run more than once.

create table if not exists public.projects (
  id          text primary key,
  name        text not null default 'New Project',
  pilot       date,
  mp          date,
  created_at  timestamptz not null default now()
);

create table if not exists public.milestones (
  project_id  text not null references public.projects(id) on delete cascade,
  key         text not null,
  status      text not null default 'ns' check (status in ('ns','ip','done')),
  owner       text not null default '',
  note        text not null default '',
  locked_date date,
  updated_at  timestamptz not null default now(),
  primary key (project_id, key)
);

-- Anyone with the site link can read and edit (no sign-in).
alter table public.projects   enable row level security;
alter table public.milestones enable row level security;

drop policy if exists "open access" on public.projects;
drop policy if exists "open access" on public.milestones;
create policy "open access" on public.projects   for all to anon, authenticated using (true) with check (true);
create policy "open access" on public.milestones for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.projects, public.milestones to anon, authenticated;

-- Live updates between browsers.
alter table public.projects   replica identity full;
alter table public.milestones replica identity full;
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='projects') then
    alter publication supabase_realtime add table public.projects;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='milestones') then
    alter publication supabase_realtime add table public.milestones;
  end if;
end $$;
