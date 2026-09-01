/**
 * Googleスプレッドシート（Google Apps Script: GAS）用コードテンプレート
 * 主催者が新規スプレッドシートの「拡張機能」→「Apps Script」に貼り付けるスクリプトです。
 */

export const GAS_SCRIPT_CODE = `/**
 * ===================================================================
 * 軽音セッション タイムテーブル＆受付・集金リアルタイム同期スクリプト (GAS)
 * ===================================================================
 * 【設定手順】
 * 1. このコードをすべてコピーして、スプレッドシートの「拡張機能」→「Apps Script」に貼り付けます。
 * 2. 右上の「デプロイ」→「新しいデプロイ」をクリック。
 * 3. 種類の選択で「ウェブアプリ」を選択。
 * 4. 設定項目：
 *    - 次のユーザーとして実行: 「自分」
 *    - アクセスできるユーザー: 「全員 (Anyone)」
 * 5. 「デプロイ」をクリックし、発行された「ウェブアプリのURL」をコピーしてアプリに登録します。
 */

// ヘッダー列定義
const HEADERS = [
  "名前",
  "参加曲数",
  "担当パート",
  "レンタル機材",
  "懇親会",
  "参加費(円)",
  "支払状況",
  "入場状況",
  "チェックイン時刻",
  "備考",
  "最終更新日時"
];

/**
 * GETリクエスト処理：スプレッドシートの最新データをJSON形式で返却
 */
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const lastRow = sheet.getLastRow();
    
    if (lastRow < 2) {
      return createJsonResponse({
        success: true,
        initialized: false,
        records: {},
        message: "スプレッドシートはまだ初期化されていません"
      });
    }

    const data = sheet.getRange(1, 1, lastRow, HEADERS.length).getValues();
    const headers = data[0];
    const records = {};

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const name = String(row[0] || "").trim();
      if (!name) continue;

      const songCount = Number(row[1]) || 0;
      const parts = String(row[2] || "");
      const rentalVal = String(row[3] || "");
      const hasRental = rentalVal.includes("有") || rentalVal.includes("レンタル") || rentalVal === "TRUE" || rentalVal === "true";
      const partyVal = String(row[4] || "");
      const partyJoined = partyVal.includes("参加") || partyVal === "TRUE" || partyVal === "true";
      const fee = Number(row[5]) || 0;
      const paidVal = String(row[6] || "");
      const paid = paidVal.includes("済") || paidVal === "TRUE" || paidVal === "true";
      const checkInVal = String(row[7] || "");
      const checkedIn = checkInVal.includes("済") || checkInVal === "TRUE" || checkInVal === "true";
      const checkInTime = String(row[8] || "");
      const notes = String(row[9] || "");
      const updatedAt = String(row[10] || "");

      records[name] = {
        memberName: name,
        songCount: songCount,
        parts: parts,
        hasRental: hasRental,
        rentalItemName: hasRental ? rentalVal : "",
        partyJoined: partyJoined,
        calculatedFee: fee,
        paid: paid,
        checkedIn: checkedIn,
        checkInTime: checkInTime,
        notes: notes,
        updatedAt: updatedAt
      };
    }

    return createJsonResponse({
      success: true,
      initialized: true,
      records: records,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    return createJsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

/**
 * POSTリクエスト処理：受付操作・初期化データの反映
 */
function doPost(e) {
  try {
    const rawContent = e.postData ? e.postData.contents : "";
    if (!rawContent) {
      return createJsonResponse({ success: false, error: "リクエストデータが空です" });
    }

    const payload = JSON.parse(rawContent);
    const action = payload.action;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // アクション 1: 初回自動セットアップ（空のスプシに見出しと参加者行を自動作成）
    if (action === "init" || action === "syncAll") {
      const participants = payload.participants || [];
      sheet.clear();

      // 見出し行の作成とスタイリング
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
      headerRange.setBackground("#4f46e5"); // Indigo
      headerRange.setFontColor("#ffffff");
      headerRange.setFontWeight("bold");
      headerRange.setHorizontalAlignment("center");

      // 参加者データの書き込み
      if (participants.length > 0) {
        const rows = participants.map(p => {
          const nowStr = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy/MM/dd HH:mm:ss");
          return [
            p.memberName,
            p.songCount || 0,
            Array.isArray(p.parts) ? p.parts.join("/") : (p.parts || ""),
            p.hasRental ? (p.rentalItemName ? "有 (" + p.rentalItemName + ")" : "有") : "なし",
            p.partyJoined ? "参加" : "不参加",
            p.calculatedFee || 0,
            p.paid ? "済" : "未払い",
            p.checkedIn ? "済" : "未入場",
            p.checkInTime || "",
            p.notes || "",
            nowStr
          ];
        });

        sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);

        // 各列の表示形式
        sheet.getRange(2, 6, rows.length, 1).setNumberFormat("#,##0"); // 金額フォーマット
        sheet.setFrozenRows(1); // 1行目を固定
      }

      // 列幅の自動調整
      sheet.autoResizeColumns(1, HEADERS.length);

      return createJsonResponse({
        success: true,
        message: "スプレッドシートを正常に初期化・同期しました",
        count: participants.length
      });
    }

    // アクション 2: 単一参加者のステータス更新（支払・入場・懇親会・レンタル等）
    if (action === "update") {
      const p = payload.record;
      if (!p || !p.memberName) {
        return createJsonResponse({ success: false, error: "参加者名が指定されていません" });
      }

      const lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        return createJsonResponse({ success: false, error: "シートが初期化されていません" });
      }

      const names = sheet.getRange(2, 1, lastRow - 1, 1).getValues().map(r => String(r[0]).trim());
      const rowIndex = names.indexOf(p.memberName.trim());

      const nowStr = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy/MM/dd HH:mm:ss");

      if (rowIndex !== -1) {
        const targetRow = rowIndex + 2;
        const updates = [
          p.memberName,
          p.songCount !== undefined ? p.songCount : sheet.getRange(targetRow, 2).getValue(),
          p.parts ? (Array.isArray(p.parts) ? p.parts.join("/") : p.parts) : sheet.getRange(targetRow, 3).getValue(),
          p.hasRental ? (p.rentalItemName ? "有 (" + p.rentalItemName + ")" : "有") : "なし",
          p.partyJoined ? "参加" : "不参加",
          p.calculatedFee !== undefined ? p.calculatedFee : sheet.getRange(targetRow, 6).getValue(),
          p.paid ? "済" : "未払い",
          p.checkedIn ? "済" : "未入場",
          p.checkInTime || (p.checkedIn ? Utilities.formatDate(new Date(), "Asia/Tokyo", "HH:mm") : ""),
          p.notes !== undefined ? p.notes : sheet.getRange(targetRow, 10).getValue(),
          nowStr
        ];

        sheet.getRange(targetRow, 1, 1, HEADERS.length).setValues([updates]);
        return createJsonResponse({ success: true, message: p.memberName + " を更新しました" });
      } else {
        // 新規参加者行の追加
        const newRow = [
          p.memberName,
          p.songCount || 0,
          Array.isArray(p.parts) ? p.parts.join("/") : (p.parts || ""),
          p.hasRental ? (p.rentalItemName ? "有 (" + p.rentalItemName + ")" : "有") : "なし",
          p.partyJoined ? "参加" : "不参加",
          p.calculatedFee || 0,
          p.paid ? "済" : "未払い",
          p.checkedIn ? "済" : "未入場",
          p.checkInTime || "",
          p.notes || "",
          nowStr
        ];
        sheet.appendRow(newRow);
        return createJsonResponse({ success: true, message: p.memberName + " を追加・更新しました" });
      }
    }

    return createJsonResponse({ success: false, error: "不明なアクションです: " + action });
  } catch (error) {
    return createJsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

/**
 * JSON形式でHTTPレスポンスを返却（CORS対応）
 */
function createJsonResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
`;
