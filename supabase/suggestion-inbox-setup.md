# 내부 DM 문의함 설치

1. 운영 Supabase의 SQL Editor에서 `suggestion-inbox.sql` 전체를 실행합니다. 기존 건의함 계정 열람 SQL이나 Apps Script는 새 문의함에 필요하지 않습니다.
2. 실제 로그인 ID를 확인합니다. `@`는 화면 표시용이며 DB에는 붙이지 않습니다.

```sql
select id, name from public.accounts order by id;
```

3. 운영진으로 지정할 계정을 추가합니다. 아래 `운영진ID`를 실제 ID로 바꾸세요. 존재하는 계정만 등록됩니다.

```sql
insert into public.suggestion_staff(account_id)
select id from public.accounts where id = '운영진ID'
on conflict do nothing
returning account_id;
```

4. 해당 계정으로 게임에 로그인하고 건의함의 **새로고침**을 누릅니다. 운영진 문의함에서 모든 문의 열람, 답변, 상태 변경이 가능합니다. 일반 계정은 자신의 문의만 표시됩니다.

권한 해제:

```sql
delete from public.suggestion_staff where account_id = '운영진ID';
```

새 문의는 Supabase 내부의 `suggestion_threads`와 `suggestion_dm`에 저장됩니다. 일반 채팅 DM 목록과 분리되어 있으며 작성자와 지정된 운영진만 RPC로 접근할 수 있습니다. `@사용자ID`는 로그인 자격 검증 후 서버가 연결하므로 다른 ID를 입력해 작성자를 가장할 수 없습니다. 프런트엔드 설정으로 운영진 권한을 부여할 수 없습니다.

전송 요청 ID를 저장하므로 응답 유실 후 같은 요청을 다시 보내도 중복 저장하지 않습니다. 오류 시 작성 내용은 창에 남습니다.

기존 `suggestions`와 구글 시트의 자료는 삭제하지 않습니다. `suggestions.author_account_id`가 확인된 글과 답변은 설치 시 자동 이전합니다. 작성 계정을 확인할 수 없는 옛 글과 구글 시트 자료는 자동으로 소유자를 추정하지 않습니다. 운영진이 원본과 실제 작성 계정을 확인한 후 연결해야 합니다. 이전 답변은 실제 운영진 ID 기록이 없어 ‘운영진 (이전 답변)’으로 표시합니다.
