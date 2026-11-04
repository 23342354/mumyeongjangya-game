/* ═══════════════════════════════════════════════════════
   용돈 기입장 — 파트너 기록 공유

   파트너의 저장본에서 내 화면으로 내려오는 항목은 pp_peer가 고릅니다.
   그 목록에 'ledger' 한 줄만 더합니다.

   · 함수 하나만 다시 만듭니다. 표를 만들지도 지우지도 않습니다.
   · 계정·공동 지갑·거래 내역·게시글·기록을 건드리지 않습니다.
   · 여러 번 실행해도 결과가 같습니다.
   · 실행하지 않아도 게임은 그대로 돌아갑니다. 다만 기입장에
     내 기록만 쌓이고 파트너 기록은 보이지 않습니다.

   실행: Supabase → SQL Editor에 이 파일 전체를 붙여 넣고 한 번 실행
   ═══════════════════════════════════════════════════════ */

create or replace function public.pp_peer(s jsonb) returns jsonb language sql immutable as $$
 select coalesce(jsonb_object_agg(key,value),'{}') from jsonb_each(s) where key=any(array[
 'name','lvl','exp','pts','hp','sn','base','bonus','sub','res','alloc','gear','buffs','hall','home','course',
 'combatStyle','weapon','line','crest','club','kit','dex','av','avImg','color','ledger'])
$$;

/* 이 함수는 공동 플레이 함수 안에서만 쓰입니다. 바깥에서 직접 부를 수 없게 둡니다. */
revoke all on function public.pp_peer(jsonb) from public, anon, authenticated;
