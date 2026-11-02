-- ════════════════════════════════════════════════════════════
--  無明長夜 · 사무전 — 공유 저장소 만들기
--
--  Supabase 프로젝트의 SQL Editor 에 이 글을 통째로 붙여 넣고
--  오른쪽 아래 「Run」 을 한 번 누르면 끝입니다.
--  고칠 곳은 없습니다. 두 번 실행해도 문제 없습니다.
-- ════════════════════════════════════════════════════════════

-- ── 0. 계정 (로그인) ────────────────────────────────────────
--  비밀번호는 그대로 담지 않고 섞은 값(해시)만 담습니다.
create table if not exists accounts (
  id         text primary key,          -- 아이디 (영문 소문자·숫자·밑줄)
  pw         text not null,             -- 비밀번호를 섞은 값
  name       text default '',           -- 학생 이름 (표시용)
  save       jsonb,                     -- 캐릭터 저장본
  created_at timestamptz default now(),
  seen_at    timestamptz default now()
);

-- ── 0-2. 페어 (전생의 죄업으로 묶인 두 사람) ─────────────────
--  한 줄이 두 사람의 관계 하나입니다. 신청 → 수락/거절 로 흘러갑니다.
create table if not exists pairs (
  id         bigint generated always as identity primary key,
  from_id    text not null,
  from_name  text not null,
  to_id      text not null,
  to_name    text not null,
  status     text default 'pending',   -- pending | accepted | declined | broken
  nick_from  text default '',          -- 신청한 쪽이 부르는 애칭
  nick_to    text default '',          -- 받은 쪽이 부르는 애칭
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists pairs_from_idx on pairs (from_id);
create index if not exists pairs_to_idx   on pairs (to_id);

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
  wb_dmg      bigint default 0,
  home_stage  int default 0,             -- 페어에게 보여 줄 거처 현황
  home_late   boolean default false,
  run_ward    text default '',           -- 페어에게 보여 줄 의뢰 현황
  run_stage   int default 0,
  run_left    int default 0,
  run_kills   int default 0,
  updated_at  timestamptz default now()
);

-- 이미 표를 만든 뒤라면, 아래 한 줄이 빠진 칸을 채워 줍니다.
alter table students add column if not exists wb_dmg     bigint  default 0;
alter table students add column if not exists home_stage int     default 0;
alter table students add column if not exists home_late  boolean default false;
alter table students add column if not exists run_ward   text    default '';
alter table students add column if not exists run_stage  int     default 0;
alter table students add column if not exists run_left   int     default 0;
alter table students add column if not exists run_kills  int     default 0;

-- ── 1-2. 채팅 ───────────────────────────────────────────────
create table if not exists messages (
  id         bigint generated always as identity primary key,
  tab        text not null,              -- 전체 | 숙사 | 계통 | 페어 | 1:1
  scope      text default '',            -- 숙사=숙사id · 계통=장인/마무기 · 페어·1:1=두 사람 키
  from_id    text not null,
  who        text not null,
  body       text not null,
  color      text default '',
  title      text default '',
  mode       text default 'RP',          -- RP | 오너
  created_at timestamptz default now()
);
create index if not exists messages_id_idx on messages (id desc);

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
alter table accounts     enable row level security;
alter table pairs        enable row level security;
alter table students     enable row level security;
alter table rooms        enable row level security;
alter table room_members enable row level security;
alter table suggestions  enable row level security;
alter table messages     enable row level security;

drop policy if exists p_accounts_all     on accounts;
drop policy if exists p_pairs_all        on pairs;
drop policy if exists p_students_all     on students;
drop policy if exists p_rooms_all        on rooms;
drop policy if exists p_room_members_all on room_members;
drop policy if exists p_messages_all     on messages;
drop policy if exists p_sugg_insert      on suggestions;
drop policy if exists p_sugg_update      on suggestions;

create policy p_accounts_all     on accounts     for all using (true) with check (true);
create policy p_pairs_all        on pairs        for all using (true) with check (true);
create policy p_students_all     on students     for all using (true) with check (true);
create policy p_rooms_all        on rooms        for all using (true) with check (true);
create policy p_room_members_all on room_members for all using (true) with check (true);
create policy p_messages_all     on messages     for all using (true) with check (true);
create policy p_sugg_insert      on suggestions  for insert with check (true);
create policy p_sugg_update      on suggestions  for update using (true) with check (true);

-- 건의함 표는 직접 읽지 못하게 하고, 내용을 가린 화면만 읽게 합니다.
revoke select on suggestions from anon;
grant  select on suggestions_public to anon;
grant  insert, update on suggestions to anon;

-- ── 5. 오래된 방 정리 (선택) ────────────────────────────────
-- 하루 지난 방을 지웁니다. 가끔 SQL Editor 에서 이 줄만 실행하시면 됩니다.
-- delete from rooms where created_at < now() - interval '1 day';


-- ── 페어 공동 일세 ────────────────────────────────────────────
-- 페어 일세 공유 업데이트 · 기존 캐릭터와 기록을 지우지 않습니다.
-- 기존 운영자는 Supabase → SQL Editor에서 이 파일 전체를 한 번 실행하세요.
-- 이후 납부부터 24시간씩 연장됩니다. 이전에 낸 기간과 확정된 납부 기록은 그대로 보존됩니다.
-- 여러 번 실행해도 이미 납부한 기간은 보존됩니다.

begin;

alter table public.pairs add column if not exists rent_due double precision not null default 0;
alter table public.pairs add column if not exists rent_receipts jsonb not null default '{}'::jsonb;
alter table public.students add column if not exists home_due double precision not null default 0;

-- 같은 페어 행을 잠가 동시에 납부해도 한 번만 기간이 늘어나게 합니다.
-- 응답이 끊겨 재시도할 때는 request_id에 해당하는 기존 결과를 그대로 돌려줍니다.
create or replace function public.pair_rent(
  p_pair_id bigint,
  p_student_id text,
  p_action text,
  p_request_id text default '',
  p_expected_due double precision default 0,
  p_personal_due double precision default 0
) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_pair public.pairs%rowtype;
  v_now double precision;
  v_due double precision;
  v_result jsonb;
  v_charged boolean := false;
  v_reason text := 'shared';
begin
  if p_action is null or p_action not in ('sync', 'pay', 'auto') then
    raise exception 'Invalid rent action';
  end if;
  if p_personal_due is null or not (p_personal_due >= 0 and p_personal_due < 'Infinity'::double precision)
     or p_expected_due is null or not (p_expected_due >= 0 and p_expected_due < 'Infinity'::double precision) then
    raise exception 'Invalid rent deadline';
  end if;
  if p_action <> 'sync' and (p_request_id is null or length(p_request_id) not between 1 and 200) then
    raise exception 'A rent request ID is required';
  end if;

  select * into v_pair from public.pairs where id = p_pair_id for update;
  if not found then
    return jsonb_build_object('pair_id', p_pair_id, 'request_id', p_request_id,
      'due', 0, 'charged', false, 'reason', 'inactive');
  end if;
  if p_student_id is null or p_student_id not in (v_pair.from_id, v_pair.to_id) then
    raise exception 'Not a member of this pair';
  end if;

  -- 페어를 푼 뒤에도 이미 확정된 납부 결과는 동일하게 돌려줍니다.
  if p_action <> 'sync' and v_pair.rent_receipts ? p_request_id then
    v_result := v_pair.rent_receipts -> p_request_id;
    if v_result ->> 'student_id' is distinct from p_student_id then
      raise exception 'Rent request belongs to another student';
    end if;
    return v_result;
  end if;
  if v_pair.status is distinct from 'accepted' then
    return jsonb_build_object('pair_id', p_pair_id, 'request_id', p_request_id,
      'due', 0, 'charged', false, 'reason', 'inactive');
  end if;

  -- index.html의 GAME_EPOCH와 같은 기준: 2026-11-02 00:00 KST.
  v_now := extract(epoch from (clock_timestamp() - timestamptz '2026-11-01 15:00:00+00')) / 60.0;
  v_due := greatest(v_pair.rent_due, p_personal_due);

  if p_action = 'sync' then
    update public.pairs set rent_due = v_due where id = p_pair_id;
    return jsonb_build_object('pair_id', p_pair_id, 'due', v_due, 'charged', false, 'reason', 'shared');
  end if;

  -- 실수형 기한은 JSON 변환 과정에서 아주 작은 소수점 차이가 날 수 있습니다.
  -- 같은 납부 기간을 이미 처리된 결제로 오인하지 않도록 1초 이내 차이는 허용합니다.
  -- 실제 납부는 하루씩 연장되므로 동시 납부의 중복 방지는 그대로 유지됩니다.
  if v_pair.rent_due > p_expected_due + (1.0 / 60.0) then
    v_reason := 'already_paid';
  elsif p_action = 'auto' and v_due >= v_now then
    v_reason := 'already_paid';
  else
    v_due := greatest(v_due, v_now) + 1440;
    v_charged := true;
    v_reason := 'paid';
  end if;

  v_result := jsonb_build_object('pair_id', p_pair_id, 'request_id', p_request_id,
    'student_id', p_student_id, 'due', v_due, 'charged', v_charged, 'reason', v_reason, 'period_minutes', 1440);
  update public.pairs
    set rent_due = v_due,
        rent_receipts = rent_receipts || jsonb_build_object(p_request_id, v_result)
    where id = p_pair_id;
  return v_result;
end;
$$;

grant execute on function public.pair_rent(bigint, text, text, text, double precision, double precision)
  to anon, authenticated;
notify pgrst, 'reload schema';

commit;
