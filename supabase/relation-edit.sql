-- 기존 교류 기능이 설치된 Supabase SQL Editor에서 전체를 한 번 실행합니다.
-- 관계 당사자가 성립된 관계의 호칭만 수정합니다. 관계 상태와 연결은 유지합니다.
begin;
create or replace function public.social_relation_edit(
 p_actor text,p_token text,p_id bigint,p_a text,p_b text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.social_links%rowtype; a text:=btrim(p_a); b text:=btrim(p_b);
begin
 if p_actor is null or p_token is null or not exists(select 1 from public.accounts where id=p_actor and pw=p_token) then
  raise exception '로그인이 필요합니다.';
 end if;
 if a is null or b is null or char_length(a) not between 1 and 20 or char_length(b) not between 1 and 20 then
  raise exception '호칭은 각각 1~20자로 입력해 주세요.';
 end if;
 select * into r from public.social_links where id=p_id for update;
 if not found then raise exception '관계를 찾을 수 없습니다.';end if;
 if r.kind is distinct from 'relation' or r.status is distinct from 'accepted' or not coalesce(p_actor=r.from_id::text or p_actor=r.to_id::text,false) then
  raise exception '성립된 관계의 당사자만 수정할 수 있습니다.';
 end if;
 update public.social_links set
  role_from=case when p_actor=r.from_id::text then a else b end,
  role_to=case when p_actor=r.from_id::text then b else a end
 where id=r.id;
 return jsonb_build_object('ok',true);
end;$$;
revoke all on function public.social_relation_edit(text,text,bigint,text,text) from public;
grant execute on function public.social_relation_edit(text,text,bigint,text,text) to anon,authenticated;
commit;
