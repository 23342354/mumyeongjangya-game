-- 無明長夜 · NPC 전체 RP 공용 채팅 (2026-11-03)
-- Supabase > SQL Editor에서 실행. 기존 메시지, 학생, 페어, RP 게시판을 삭제하지 않습니다.
-- 전체 채널에 올라온 러너의 RP 메시지에만 낮은 확률로 NPC가 반응합니다.
-- 서버가 1건의 NPC 메시지를 저장하기 때문에 모든 러너에게 동일하게 보입니다.
-- 필요 시 아래 0.28(확률), 25 seconds(공용 쿨다운)을 조정할 수 있습니다.

BEGIN;

CREATE OR REPLACE FUNCTION public.mmjy_shared_npc_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_text text;
  v_topic text := '';
  v_roll double precision;
  v_name text;
  v_role text;
  v_color text;
  v_lines text[];
  v_reply text;
BEGIN
  -- 전용 채팅/페어/이웃/계통/오너 대화 및 NPC 자신에게는 반응하지 않습니다.
  IF NEW.tab IS DISTINCT FROM '전체'
     OR NEW.mode IS DISTINCT FROM 'RP'
     OR NEW.from_id LIKE 'mmjy-npc:%'
     OR length(btrim(COALESCE(NEW.body,''))) < 2
  THEN
    RETURN NEW;
  END IF;

  -- 기존의 러너 발언에 반응하는 재미는 유지하되 남발하지 않도록 약 28%.
  IF random() >= 0.28 THEN RETURN NEW; END IF;

  -- 여러 학생이 동시에 글을 올려도 25초 안에 NPC 응답이 몰리지 않도록 직렬화.
  PERFORM pg_advisory_xact_lock(20261103, 4421);
  IF EXISTS (
     SELECT 1 FROM public.messages m
     WHERE m.from_id LIKE 'mmjy-npc:%'
       AND m.created_at > now() - interval '25 seconds'
  ) THEN RETURN NEW; END IF;

  v_text := lower(regexp_replace(NEW.body, '<[^>]*>', '', 'g'));
  IF v_text ~ '(먹|밥|간식|과자|매점|만두|빵|차 한|홍차|녹차|배고|디저트|커피)' THEN
    v_topic := 'food';
  ELSIF v_text ~ '(다치|아프|상처|피곤|졸려|잠|보건|치료|약)' THEN
    v_topic := 'care';
  ELSIF v_text ~ '(훈련|전투|대련|공격|방어|의뢰|싸우|실습|검)' THEN
    v_topic := 'training';
  ELSIF v_text ~ '(분실|잃어|어디|길|늦|통금|문|찾아|소문)' THEN
    v_topic := 'guard';
  ELSIF v_text ~ '(페어|친구|공명|파장|마음|사랑|함께|짝)' THEN
    v_topic := 'bond';
  ELSIF v_text ~ '(수업|시험|공부|선생|숙제|성적)' THEN
    v_topic := 'class';
  END IF;

  v_roll := random();
  CASE v_topic
    WHEN 'food' THEN
      v_name := CASE WHEN v_roll<0.65 THEN '여와' WHEN v_roll<0.90 THEN '삼장' ELSE '염라' END;
    WHEN 'care' THEN
      v_name := CASE WHEN v_roll<0.70 THEN '삼장' WHEN v_roll<0.88 THEN '여와' ELSE '양귀비' END;
    WHEN 'training' THEN
      v_name := CASE WHEN v_roll<0.72 THEN '항아' WHEN v_roll<0.88 THEN '강시' ELSE '삼장' END;
    WHEN 'guard' THEN
      v_name := CASE WHEN v_roll<0.72 THEN '강시' WHEN v_roll<0.88 THEN '염라' ELSE '항아' END;
    WHEN 'bond' THEN
      v_name := CASE WHEN v_roll<0.55 THEN '양귀비' WHEN v_roll<0.88 THEN '염라' ELSE '항아' END;
    WHEN 'class' THEN
      v_name := CASE WHEN v_roll<0.45 THEN '양귀비' WHEN v_roll<0.80 THEN '삼장' ELSE '염라' END;
    ELSE
      v_name := (ARRAY['염라','강시','여와','양귀비','항아','삼장'])[1+floor(v_roll*6)::int];
  END CASE;

  -- 공개 스토리에서 확인되는 평상시 어조만 사용합니다. 진행 중 스토리/비밀 정보는 언급하지 않습니다.
  CASE v_name
    WHEN '염라' THEN
      v_role := '이사장 · NPC'; v_color := 'var(--gold)';
      v_lines := ARRAY[
        '홍홍홍. 무슨 일이 그리 즐거워서 웃음소리가 여기까지 들리는 게냐?',
        '그래, 잘 놀고 있구나. 다만 밥 때는 잊지 말거라.',
        '사람 마음이란 참 묘한 것이지. 너무 서둘러 단정하지는 말거라.',
        '홍홍홍. 오늘도 사무전이 제법 시끌벅적하구나.',
        '그런 날도 있는 법이란다. 잘 살펴보고 스스로 답을 정하거라.'
      ];
    WHEN '강시' THEN
      v_role := '경비 · NPC'; v_color := 'var(--blue)';
      v_lines := ARRAY[
        '어? 그거 뭐야? 나도 봐도 돼?',
        '비켜비켜. 게시판에 붙일 게 있어!',
        '잠깐. 그건 좀 재밌는데.',
        '뭐야? 무슨 일이야? 나도 알려 줘.',
        '다들 들었지? 돌아올 땐 이름부터 불러.'
      ];
    WHEN '여와' THEN
      v_role := '매점 관리인 · NPC'; v_color := 'var(--jadeD)';
      v_lines := ARRAY[
        '아, 안녕하세요⋯⋯. 혹시 필요한 물건이 있나요?',
        '그, 그건 제가 다시 확인해 볼게요⋯⋯.',
        '어어⋯⋯? 잠깐만요. 제가 잘못 본 걸 수도 있잖아요!',
        '죄송해요⋯⋯. 이번에는 분명 괜찮을 줄 알았는데⋯⋯.',
        '아, 그건 영혼 파장 쪽 설명을 먼저 드려야 하는데요⋯⋯!'
      ];
    WHEN '양귀비' THEN
      v_role := '담임 교사 · NPC'; v_color := 'var(--red)';
      v_lines := ARRAY[
        '그래, 오늘은 무얼 하고 있었니?',
        '그렇게 서두르지 말렴. 한 번 더 살펴봐도 괜찮잖니.',
        '파장이 흔들리는구나. 잠깐 쉬어 가도 된단다.',
        '같이 돌아오는 게 중요하지. 누가 더 잘했는지는 그다음이란다.',
        '자세한 건 다른 선생님한테 물어보렴. 후후.'
      ];
    WHEN '항아' THEN
      v_role := '전투 교관 · NPC'; v_color := 'var(--violet)';
      v_lines := ARRAY[
        '아~ 뭐야, 벌써 지친 얼굴인데? 허접~♡',
        '그거 재밌겠는데? 직접 가서 확인해 봐~.',
        '잠깐! 생각보다 위험할 수 있으니까 방심하지는 말고.',
        '어이, 한 번 더! 아직 끝난 거 아니잖아~.',
        '하하, 너네 정말 심심할 틈이 없구나?'
      ];
    WHEN '삼장' THEN
      v_role := '보건 교사 · NPC'; v_color := 'var(--ok)';
      v_lines := ARRAY[
        '무리하지 마십시오. 제대로 쉬는 것도 훈련의 일부입니다.',
        '다친 곳이 있다면 보건실로 오십시오. 제가 살펴보겠습니다.',
        '그 말씀에는 조금 더 생각해 볼 여지가 있군요.',
        '음식을 함께 나누는 것도 좋은 경험이 됩니다. 식사는 하셨습니까?',
        '잘 돌아오셨군요. 우선 상태부터 확인하겠습니다.'
      ];
  END CASE;

  -- 상황에 따른 한마디를 우선하되, 같은 화제라도 다양한 말이 나오게 합니다.
  IF random() < 0.66 THEN
    CASE
      WHEN v_topic='food' AND v_name='여와' THEN
        v_lines := ARRAY['매, 매점 물건이요? 제가 먼저 수량을 확인해 볼게요⋯⋯.',
          '마침 새로 들어온 간식이 있는데요⋯⋯. 아, 이번에는 정말 멀쩡해요!',
          '음, 그건 맛있을 것 같은데요⋯⋯. 제가 하나 먹어 봐도 되나요?'];
      WHEN v_topic='food' AND v_name='삼장' THEN
        v_lines := ARRAY['식사는 하셨습니까? 거르는 일이 없도록 하십시오.',
          '함께 만들어 나누어 먹는 음식도 훌륭한 친목 도모가 됩니다.'];
      WHEN v_topic='care' AND v_name='삼장' THEN
        v_lines := ARRAY['몸이 좋지 않다면 보건실로 오십시오. 우선 상태부터 보겠습니다.',
          '무리하지 마십시오. 지금은 충분히 쉬는 편이 낫겠습니다.'];
      WHEN v_topic='training' AND v_name='항아' THEN
        v_lines := ARRAY['아~ 의뢰서 몇 줄만 읽고 다 안다고 생각하는 건 아니지?',
          '허접~♡ 아직 시작도 안 했는데 벌써 지친 거야?',
          '그래, 직접 가서 확인해 봐~. 무리해서 다치지는 말고!'];
      WHEN v_topic='guard' AND v_name='강시' THEN
        v_lines := ARRAY['뭐 잃어버렸어? 일단 경비실부터 와.',
          '혼자 찾아다니지 마. 어디 가는지부터 말해 줘.',
          '어? 그거 뭐야? 어디서 났어?'];
      WHEN v_topic='bond' AND v_name='양귀비' THEN
        v_lines := ARRAY['인연이 깊다고 해서 저절로 공명이 되는 건 아니란다.',
          '서로의 상태를 잘 살펴보렴. 친하다고 늘 같은 마음인 건 아니니까.'];
      WHEN v_topic='bond' AND v_name='염라' THEN
        v_lines := ARRAY['홍홍홍. 곁에 있는 아이를 잘 살펴보거라. 인연이란 참 묘한 것이니.',
          '오늘 어긋났다고 영영 맞지 않는 것은 아니지. 너무 낙심하지 말거라.'];
      WHEN v_topic='class' AND v_name='양귀비' THEN
        v_lines := ARRAY['시험 점수가 높다고 사이가 좋다는 뜻은 아니란다.',
          '오늘은 무얼 배우고 싶니? 자세한 건 다른 선생님께 물어보렴.'];
      WHEN v_topic='class' AND v_name='삼장' THEN
        v_lines := ARRAY['오늘 수업은 무엇을 배웠습니까? 차근차근 정리해 봅시다.',
          '배운 것을 익히려면 시간이 필요합니다. 무리하지 마십시오.'];
    END CASE;
  END IF;

  v_reply := v_lines[1+floor(random()*array_length(v_lines,1))::int];
  INSERT INTO public.messages(tab,scope,from_id,who,body,color,title,mode)
  VALUES ('전체','','mmjy-npc:' || v_name,v_name,v_reply,v_color,v_role,'RP');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mmjy_shared_npc_reply ON public.messages;
CREATE TRIGGER trg_mmjy_shared_npc_reply
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.mmjy_shared_npc_reply();

COMMIT;
