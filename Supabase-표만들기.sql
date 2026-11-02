-- ════════════════════════════════════════════════════════════
--  無明長夜 · 사무전 — 공유 저장소 만들기
--
--  Supabase 프로젝트의 SQL Editor 에 이 글을 통째로 붙여 넣고
--  오른쪽 아래 「Run」 을 한 번 누르면 끝입니다.
--  고칠 곳은 없습니다. 두 번 실행해도 문제 없습니다.
-- ════════════════════════════════════════════════════════════

-- ── 1. 학생 명부 ────────────────────────────────────────────
create table if not exists students (
  id          text primary key,
  name        text not null,
  course      int  default 1,
  lvl         int  default 1,
  power       bigint default 0,
  dps         bigint default 0,
  hpv         bigint default 0,
  line        text,
  weapon      text,
  hall        text,
  title       text,
  intro       text,
  av          text,
  av_img      text,
  tower       int default 0,
  guard       int default 0,
  arena_best  int default 0,
  quest       int default 0,
  dexp        int default 0,
  ach         int default 0,
  war         int default 0,
  updated_at  timestamptz default now()
);

-- ── 2. 함께 가기 방 ─────────────────────────────────────────
create table if not exists rooms (
  id         bigint generated always as identity primary key,
  kind       text not null,                 -- tower | guard | quest
  stage      int  not null,
  host_id    text not null,
  host_name  text not null,
  note       text,
  status     text default 'waiting',        -- waiting | done
  result     jsonb,
  created_at timestamptz default now()
);

create table if not exists room_members (
  room_id    bigint references rooms(id) on delete cascade,
  student_id text   not null,
  name       text   not null,
  course     int    default 1,
  power      bigint default 0,
  dps        bigint default 0,
  hpv        bigint default 0,
  joined_at  timestamptz default now(),
  primary key (room_id, student_id)
);

create index if not exists rooms_status_idx on rooms (status, created_at desc);

-- ── 3. 건의함 ───────────────────────────────────────────────
create table if not exists suggestions (
  id         bigint generated always as identity primary key,
  name       text,
  cat        text,
  title      text,
  body       text,
  secret     boolean default false,
  likes      int default 0,
  status     text default '접수',
  reply      text,
  created_at timestamptz default now()
);

-- 비공개 글의 내용은 게임에 내려보내지 않습니다.
-- 운영진은 Supabase 의 Table Editor 에서 suggestions 표를 직접 열어 봅니다.
create or replace view suggestions_public as
  select id, name, cat, title,
         case when secret then '(비공개 글입니다. 운영진만 볼 수 있습니다.)' else body end as body,
         secret, likes, status, reply, created_at
  from suggestions;

-- ── 4. 접근 권한 ────────────────────────────────────────────
alter table students     enable row level security;
alter table rooms        enable row level security;
alter table room_members enable row level security;
alter table suggestions  enable row level security;

drop policy if exists p_students_all     on students;
drop policy if exists p_rooms_all        on rooms;
drop policy if exists p_room_members_all on room_members;
drop policy if exists p_sugg_insert      on suggestions;
drop policy if exists p_sugg_update      on suggestions;

create policy p_students_all     on students     for all using (true) with check (true);
create policy p_rooms_all        on rooms        for all using (true) with check (true);
create policy p_room_members_all on room_members for all using (true) with check (true);
create policy p_sugg_insert      on suggestions  for insert with check (true);
create policy p_sugg_update      on suggestions  for update using (true) with check (true);

-- 건의함 표는 직접 읽지 못하게 하고, 내용을 가린 화면만 읽게 합니다.
revoke select on suggestions from anon;
grant  select on suggestions_public to anon;
grant  insert, update on suggestions to anon;

-- ── 5. 오래된 방 정리 (선택) ────────────────────────────────
-- 하루 지난 방을 지웁니다. 가끔 SQL Editor 에서 이 줄만 실행하시면 됩니다.
-- delete from rooms where created_at < now() - interval '1 day';
