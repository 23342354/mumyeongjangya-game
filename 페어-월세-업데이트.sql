-- 페어 월세 공유 업데이트 · 기존 캐릭터와 기록을 지우지 않습니다.
-- 기존 운영자는 Supabase → SQL Editor에서 이 파일 전체를 한 번 실행하세요.
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

  if v_pair.rent_due > p_expected_due then
    v_reason := 'already_paid';
  elsif p_action = 'auto' and v_due >= v_now then
    v_reason := 'already_paid';
  else
    v_due := greatest(v_due, v_now) + 7 * 1440;
    v_charged := true;
    v_reason := 'paid';
  end if;

  v_result := jsonb_build_object('pair_id', p_pair_id, 'request_id', p_request_id,
    'student_id', p_student_id, 'due', v_due, 'charged', v_charged, 'reason', v_reason);
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
