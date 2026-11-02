/**
 * 無明長夜 · 사무전 — 건의함 저장소
 *
 * 구글 스프레드시트에 붙여서 쓰는 코드입니다.
 * 설치 방법은 함께 드린 「설치안내서.md」의 3단계를 보세요.
 * 코드를 고칠 필요는 없습니다. 그대로 붙여 넣고 배포만 하면 됩니다.
 */

var SHEET_NAME = '건의함';
var HEADER = ['id', '올린 때', '쓴 사람', '분류', '제목', '내용', '비공개', '공감', '상태', '답변'];

/** 시트를 가져오고, 없으면 만들어 머리글을 넣습니다. */
function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
  }
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADER);
    sh.getRange(1, 1, 1, HEADER.length).setFontWeight('bold').setBackground('#efe7d2');
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 120);  // id
    sh.setColumnWidth(2, 150);  // 올린 때
    sh.setColumnWidth(5, 260);  // 제목
    sh.setColumnWidth(6, 420);  // 내용
    sh.setColumnWidth(10, 420); // 답변
  }
  return sh;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** 게임이 목록을 불러갈 때 */
function doGet(e) {
  try {
    var sh = getSheet_();
    var last = sh.getLastRow();
    var rows = [];
    if (last > 1) {
      var values = sh.getRange(2, 1, last - 1, HEADER.length).getValues();
      for (var i = 0; i < values.length; i++) {
        var v = values[i];
        if (!v[0]) continue;
        var secret = (v[6] === true || v[6] === 1 || v[6] === '1' || v[6] === 'Y' || v[6] === 'y');
        rows.push({
          id:     String(v[0]),
          time:   v[1] instanceof Date ? v[1].toISOString() : String(v[1]),
          name:   String(v[2] || ''),
          cat:    String(v[3] || '기타'),
          title:  String(v[4] || ''),
          // 비공개 글의 내용은 게임에 내려보내지 않습니다. 운영진은 시트에서 직접 봅니다.
          body:   secret ? '(비공개 글입니다. 운영진만 시트에서 볼 수 있습니다.)' : String(v[5] || ''),
          secret: secret ? 1 : 0,
          likes:  Number(v[7] || 0),
          status: String(v[8] || '접수'),
          reply:  String(v[9] || '')
        });
      }
    }
    return json_({ ok: true, rows: rows });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/** 게임이 글을 올리거나 공감을 누를 때 */
function doPost(e) {
  try {
    var p = JSON.parse(e.postData.contents);
    var sh = getSheet_();

    if (p.action === 'add') {
      var title = String(p.title || '').slice(0, 80);
      var body  = String(p.body  || '').slice(0, 3000);
      if (!title || !body) return json_({ ok: false, error: '제목과 내용이 필요합니다' });

      // 같은 사람이 연달아 올리는 것을 1분에 한 번으로 제한합니다.
      var last = sh.getLastRow();
      if (last > 1) {
        var recent = sh.getRange(Math.max(2, last - 4), 1, Math.min(5, last - 1), 3).getValues();
        var now = new Date().getTime();
        for (var i = 0; i < recent.length; i++) {
          var t = recent[i][1] instanceof Date ? recent[i][1].getTime() : 0;
          if (String(recent[i][2]) === String(p.name || '') && now - t < 60 * 1000) {
            return json_({ ok: false, error: '조금 뒤에 다시 올려 주세요 (1분에 한 번)' });
          }
        }
      }

      sh.appendRow([
        'B' + new Date().getTime(),
        new Date(),
        String(p.name || '이름 없는 차사').slice(0, 20),
        String(p.cat || '기타'),
        title,
        body,
        p.secret ? 1 : '',
        0,
        '접수',
        ''
      ]);
      return json_({ ok: true });
    }

    if (p.action === 'like') {
      var lastRow = sh.getLastRow();
      if (lastRow > 1) {
        var ids = sh.getRange(2, 1, lastRow - 1, 1).getValues();
        for (var k = 0; k < ids.length; k++) {
          if (String(ids[k][0]) === String(p.id)) {
            var cell = sh.getRange(k + 2, 8);
            cell.setValue(Number(cell.getValue() || 0) + 1);
            return json_({ ok: true });
          }
        }
      }
      return json_({ ok: false, error: '글을 찾지 못했습니다' });
    }

    return json_({ ok: false, error: '알 수 없는 요청입니다' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/**
 * 처음 한 번 눌러서 시트를 만들어 두고 싶을 때 쓰는 함수입니다.
 * Apps Script 편집기 위쪽에서 이 함수를 고르고 「실행」을 누르면 됩니다. (선택 사항)
 */
function 건의함_시트_만들기() {
  getSheet_();
  SpreadsheetApp.getActiveSpreadsheet().toast('건의함 시트를 준비했습니다.');
}
