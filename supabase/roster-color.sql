-- 운영 Supabase SQL Editor에서 한 번 실행합니다. 재실행 가능합니다.
-- 이전 프로필은 다음 학생 명부 업로드부터 테마 컬러가 채워집니다.
begin;
alter table public.students add column if not exists color text;
notify pgrst, 'reload schema';
commit;
