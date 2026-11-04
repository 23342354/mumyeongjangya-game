-- ① 운영진설치/WebPush-데이터베이스.sql 적용 후
-- ② Supabase → Database → Extensions에서 pg_cron을 활성화한 뒤 실행.
-- 기존 동일 이름의 예약 작업은 삭제하고 새 버전으로 갱신합니다.
-- pg_cron 확장은 먼저 Supabase Dashboard → Integrations → Cron에서 활성화하세요.
do $$ begin
 if exists(select 1 from cron.job where jobname='mmjy-push-farm-minute') then
   perform cron.unschedule('mmjy-push-farm-minute');
 end if;
end $$;
select cron.schedule('mmjy-push-farm-minute','* * * * *','select public.mm_push_all_tick();');
