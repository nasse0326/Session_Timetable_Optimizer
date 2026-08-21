import { Song, SongMember, MemberConstraint } from '../types';

export const SAMPLE_TSV = `連番	カテゴリ	バンド名	アーティスト名	曲名	レンタル	持込	SNS投稿	"メンバー1
名前"	"メンバー1
パート"	"メンバー2
名前"	"メンバー2
パート"	"メンバー3
名前"	"メンバー3
パート"	"メンバー4
名前"	"メンバー4
パート"	"メンバー5
名前"	"メンバー5
パート"	音合わせ	備考
1	自由曲	ブランデー戦記	ブランデー戦記	Kids	なし	なし	SNS投稿OK（モザイクあり）	ももこ	Vo&Gt	なおき	Ba	Chie Oda	Dr					1サビ	
2	自由曲	BBQ	神様僕は気づいてしまった	CQCQ	なし	なし	SNS投稿OK（モザイクあり）	kitaryu	Vo&Ba	木戸えみな	Gt	蘭丸	Gt	おばたこうき	Dr			1サビ	木戸えみな 14時以降
3	自由曲	藤くんが踊った〜！！！	BUMP OF CHICKEN	ray	なし	ユウキサイトウ マイク みりん+ Key	SNS投稿OK（モザイクあり）	イトウリョウタ	Gt	ユウキサイトウ	Vo&Gt	青山	Ba	裕子(ひろこ)	Dr	みりん+	Key	1サビ	
4	自由曲	Claris	Claris	コネクト	なし	なし	SNS投稿OK（モザイクあり）	木戸えみな	Gt	真悠子	Vo	Chie Oda	Dr	瑠来	Key	kitaryu	Ba	1サビ	木戸えみな 14時以降
5	自由曲	フレンズ	フレンズ	Night town	エレキピアノ	ボイスエフェクター	SNS投稿NG	りりか	Vo	Hiroki SATO	Ba	Tomoki	Vo&Gt	みりん+	Key	おばたこうき	Dr	1サビ〜2Aメロ	
6	自由曲	運営バンド	GO!GO!7188	こいのうた	なし	なし	SNS投稿OK（モザイクあり）	のざわよしみ	Vo&Gt	Mii	Vo	Gatami	Vo&Dr	晃弘	Ba			1サビ	
7	自由曲	Age factory	Age factory	Dance all night my friend	なし	佐藤雄一郎 マイク	SNS投稿OK（モザイクあり）	Hiroki SATO	Ba	佐藤雄一郎	Vo&Gt	田中京介	Dr					1サビ	田中京介 初参加
8	自由曲	相対性理論	相対性理論	ミスパラレルワールド	なし	なし	SNS投稿OK（モザイクあり）	中山智貴	Gt	風音	Vo&Gt	しん	Ba	野島弘太郎	Dr			1サビ	
9	自由曲	相対性理論	相対性理論	チャイナアドバイス	エレキピアノ	なし	SNS投稿NG	K.Haruka	Dr	ほしのゆりあ	Vo&Gt	青山	Ba	Moringo	Gt	kesalanpatharan	Key	最初から	
10	自由曲	シンガーズハイ	シンガーズハイ	Kid	なし	なし	SNS投稿OK（モザイクあり）	yuko	Dr	かくぎょ	Vo&Gt	木戸えみな	Gt	なおき	Ba			1サビ	木戸えみな 14時以降, かくぎょ 16:30以降
11	自由曲	九月魔Ⅱ	聖飢魔II	地獄の皇太子	なし	なし	SNS投稿OK（モザイクあり）	中山智貴	Vo	キクチ(タ)	Ba	三浦友彰	Gt	ほしの	Gt	アキセル	Dr	1サビ	
12	自由曲	ウェカデモ	Bullet For My Valentine	Waking the Demon	なし	山田、マイク(SENNHEISER e945)	SNS投稿OK（モザイクあり）	中山智貴	Gt	山田	Vo	s.wada	Gt	キクチ(タ)	Ba	サブロー	Dr	1サビ	
13	自由曲	SHISHAMO	SHISHAMO	夏恋注意報	なし	マイク？	SNS投稿OK（モザイクあり）	みりん+	Vo&Gt	キクチ(タ)	Ba	アキセル	Dr					2Bメロ	
14	自由曲	瞬間センチメンタル	結束バンド	青春コンプレックス	なし	kesalanpatharan(マイク)	SNS投稿OK（モザイクあり）	kesalanpatharan	Vo	Gatami	Gt	Amikun	Gt	蘭丸	Vo&Ba	あやか	Dr	1サビ	
15	自由曲	BUMP OF CHICKEN	BUMP OF CHICKEN	ラフ・メイカー	なし	なし	SNS投稿OK（モザイクあり）	のざわよしみ	Dr	Gatami	Vo&Gt	一冴	Gt	青山	Ba			1サビ	
16	自由曲	ヨルシカ	ヨルシカ	忘れてください	なし	なし	SNS投稿OK（モザイクあり）	𝒮𝑒𝒾𝓃𝒶	Vo	一冴	Gt	kitaryu	Ba	伊藤亮太	Dr	瑠来	Vo&Key	1サビ	
17	自由曲	シド	シド	妄想日記2	なし	なし	SNS投稿OK（モザイクあり）	もえおかだ	Dr	Amikun	Gt	Mii	Vo	晃弘	Ba			1サビ	
18	自由曲	あいみょん	あいみょん	マリーゴールド	なし	なし	SNS投稿NG	かくぎょ	Dr	もえおかだ	Gt	中川ひなた	Gt	りりか	Vo	Mii	Ba	1サビ	かくぎょ 16:30以降
19	自由曲	BSC激辛部	WANIMA	THANX	なし	佐藤雄一郎 マイク	SNS投稿OK（モザイクあり）	佐藤雄一郎	Vo&Ba	Tomoki	Vo&Gt	伊藤亮太	Vo&Dr					イントロからの歌入り	
20	自由曲	美意識向上委員会	マカロニえんぴつ	レモンパイ	エレキピアノ	佐藤雄一郎 マイク	SNS投稿OK（モザイクあり）	佐藤雄一郎	Vo&Gt	イトウリョウタ	Gt	蘭丸	Vo&Ba	真悠子	Key	伊藤亮太	Vo&Dr	1サビ	
	課題曲		SHISHAMO	僕に彼女ができたんだ				ももこ	Vo＆Gt	Hiroki SATO	Ba	あやか	Dr					1サビ	
	課題曲		放課後ティータイム	Don't say“lazy”				𝒮𝑒𝒾𝓃𝒶	Vo＆Gt	真悠子	Gt	盛 貴大	Ba	あやか	Dr	K.Haruka	Key	1サビ	
	課題曲		放課後ティータイム	Don't say“lazy”				𝒮𝑒𝒾𝓃𝒶	Vo＆Gt	星野 眞樹	Gt	Hiroki SATO	Ba	ムヒ	Dr	K.Haruka	Key	1サビ	
	課題曲		レベッカ	フレンズ				風音	Vo	野島弘太郎	Gt	Hiroki SATO	Ba	ムヒ	Dr	K.Haruka	Key	1サビ	
	課題曲		レベッカ	フレンズ				のざわよしみ	Vo	星野 眞樹	Gt	Hiroki SATO	Ba	ムヒ	Dr	みりん+	Key	1サビ	
	課題曲		DOSE	曇天				藤田敏彰	Vo	星野 眞樹	Gt	盛 貴大	Ba	アキセル	Dr			1サビ	
	課題曲		ELLEGARDEN	カーマイン				ユウキサイトウ	Vo	星野 眞樹	Gt(Back)	みりん+	Gt(Lead)	盛 貴大	Ba	アキセル	Dr	1サビ	
	シャッフル		シャッフル	A				風音	Vo＆Gt	Tomoki	Gt	盛 貴大	Ba	徳本 光芳	Dr	伏見 瑠捺	Key		
	シャッフル		シャッフル	B				藤田敏彰	Vo	みりん+	Gt	Moringo	Ba	ムヒ	Dr				
	シャッフル		シャッフル	Ｃ				山田	Vo	野島弘太郎	Gt	キクチ(タ)	Ba	徳本 光芳	Dr				
	シャッフル		シャッフル	D				野島弘太郎	Vo＆Gt	gatami	Gt	盛 貴大	Ba	ムヒ	Dr				
	シャッフル		シャッフル	E				ユウキサイトウ	Vo＆Gt	Moringo	Gt	晃弘	Ba	Yoko	Dr				`;

function parseTimeStr(timeStr: string): number | null {
  // "15:30", "15時30分", "15時半", "15時"
  let match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    return parseInt(match[1]) * 60 + parseInt(match[2]);
  }
  match = timeStr.match(/(\d{1,2})時(\d{1,2})分/);
  if (match) {
    return parseInt(match[1]) * 60 + parseInt(match[2]);
  }
  match = timeStr.match(/(\d{1,2})時半/);
  if (match) {
    return parseInt(match[1]) * 60 + 30;
  }
  match = timeStr.match(/(\d{1,2})時/);
  if (match) {
    return parseInt(match[1]) * 60;
  }
  return null;
}

export function parseTimeConstraint(text: string): { startMinutes?: number; endMinutes?: number } | null {
  let startMinutes: number | undefined;
  let endMinutes: number | undefined;

  // 14:00~16:30
  const rangeMatch = text.match(/(\d{1,2}[:時]\d{0,2}分?半?)[\s~〜-ー]+(\d{1,2}[:時]\d{0,2}分?半?)/);
  if (rangeMatch) {
    const start = parseTimeStr(rangeMatch[1]);
    const end = parseTimeStr(rangeMatch[2]);
    if (start !== null) startMinutes = start;
    if (end !== null) endMinutes = end;
    if (startMinutes !== undefined || endMinutes !== undefined) {
      return { startMinutes, endMinutes };
    }
  }

  // 15時以降, 15:00から
  const startMatch = text.match(/(\d{1,2}[:時]\d{0,2}分?半?)\s*(以降|から)/);
  if (startMatch) {
    const start = parseTimeStr(startMatch[1]);
    if (start !== null) {
      return { startMinutes: start };
    }
  }

  // 〜16:30, 16時まで
  const endMatch = text.match(/[~〜-ー]?\s*(\d{1,2}[:時]\d{0,2}分?半?)\s*(まで|以前)/);
  if (endMatch) {
    const end = parseTimeStr(endMatch[1]);
    if (end !== null) {
      return { endMinutes: end };
    }
  }

  return null;
}

function parseCSVText(text: string, separator: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          current += '"';
          i++; // skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === separator) {
        row.push(current);
        current = '';
      } else if (char === '\n' || (char === '\r' && text[i+1] === '\n')) {
        if (char === '\r') i++;
        row.push(current);
        result.push(row);
        row = [];
        current = '';
      } else if (char !== '\r') {
        current += char;
      }
    }
  }
  
  if (current !== '' || row.length > 0) {
    row.push(current);
    result.push(row);
  }
  
  return result.filter(r => r.length > 0 && r.some(c => c.trim() !== ''));
}

export function parseTsv(tsv: string): { songs: Song[]; constraints: MemberConstraint[] } {
  const trimmed = tsv.trim();
  if (!trimmed) return { songs: [], constraints: [] };

  const firstLine = trimmed.split('\n')[0];
  const separator = firstLine.includes('\t') ? '\t' : ',';
  
  const parsedRows = parseCSVText(trimmed, separator);
  if (parsedRows.length < 2) return { songs: [], constraints: [] };

  // Remove newlines from headers for easier matching
  const headers = parsedRows[0].map(h => h.replace(/\r?\n/g, '').trim());
  
  const titleIdx = headers.findIndex(h => h.includes('曲') || h.includes('タイトル') || h.toLowerCase() === 'title' || h.toLowerCase() === 'song');
  const notesIdx = headers.findIndex(h => h.includes('備考') || h.includes('メモ') || h.toLowerCase() === 'notes' || h.toLowerCase() === 'memo');
  const categoryIdx = headers.findIndex(h => h.includes('カテゴリ') || h.includes('区分') || h.includes('種別') || h.toLowerCase() === 'category' || h.toLowerCase() === 'type');
  const bandNameIdx = headers.findIndex(h => h.includes('バンド') || h.toLowerCase() === 'band' || h.includes('グループ') || h.includes('ユニット'));
  const artistIdx = headers.findIndex(h => h.includes('アーティスト') || h.includes('原曲') || h.includes('歌手') || h.includes('本家') || h.toLowerCase() === 'artist');
  const rentalIdx = headers.findIndex(h => h.includes('レンタル') || h.toLowerCase() === 'rental');
  const bringIdx = headers.findIndex(h => h.includes('持込') || h.includes('持ち込み') || h.includes('持参') || h.toLowerCase() === 'bring');
  const assignmentIdx = headers.findIndex(h => h.includes('課題曲'));

  // Detect Format B (Name-Part pairs) vs Format A (Part columns)
  const isFormatB = headers.some(h => h.includes('名前')) && headers.some(h => h.includes('パート'));

  const songs: Song[] = [];
  const constraintsMap = new Map<string, MemberConstraint>();

  // For Format A
  const partIndices: { index: number; part: string }[] = [];
  // For Format B
  const namePartPairs: { nameIdx: number; partIdx: number }[] = [];

  if (isFormatB) {
    // Find all '名前' and 'パート' pairs by prefix or just matching 'メンバー1名前', 'メンバー1パート'
    for (let i = 0; i < headers.length; i++) {
      if (headers[i].includes('名前')) {
        const prefix = headers[i].replace('名前', '').trim();
        const partIdx = headers.findIndex((h, idx) => idx !== i && h.includes('パート') && h.startsWith(prefix));
        if (partIdx !== -1) {
          namePartPairs.push({ nameIdx: i, partIdx: partIdx });
        }
      }
    }
  } else {
    headers.forEach((h, idx) => {
      if (
        idx !== titleIdx &&
        idx !== notesIdx &&
        idx !== categoryIdx &&
        idx !== bandNameIdx &&
        idx !== artistIdx &&
        idx !== rentalIdx &&
        idx !== bringIdx &&
        idx !== assignmentIdx &&
        h
      ) {
        partIndices.push({ index: idx, part: h });
      }
    });
  }

  for (let i = 1; i < parsedRows.length; i++) {
    const row = parsedRows[i].map(c => c.trim());
    if (row.length === 0 || !row[titleIdx]) continue;

    const title = row[titleIdx];
    let rawNotes = notesIdx !== -1 ? row[notesIdx] : '';
    const categoryVal = categoryIdx !== -1 ? row[categoryIdx] : '';
    const bandNameVal = bandNameIdx !== -1 ? row[bandNameIdx] : '';
    const artistVal = artistIdx !== -1 ? row[artistIdx] : '';
    const rentalVal = rentalIdx !== -1 ? row[rentalIdx] : '';
    const bringVal = bringIdx !== -1 ? row[bringIdx] : '';
    
    const members: SongMember[] = [];

    if (isFormatB) {
      for (const pair of namePartPairs) {
        const nameRaw = row[pair.nameIdx];
        const partRaw = row[pair.partIdx];
        if (nameRaw && partRaw) {
          const splitNames = nameRaw.split(/[,、/／]+/).map(n => n.trim()).filter(n => n.length > 0);
          for (const n of splitNames) {
            members.push({ part: partRaw, name: n });
          }
        }
      }
    } else {
      for (const p of partIndices) {
        const name = row[p.index];
        if (name) {
          const splitNames = name.split(/[,、/／]+/).map(n => n.trim()).filter(n => n.length > 0);
          for (const n of splitNames) {
            members.push({ part: p.part, name: n });
          }
        }
      }
    }

    const isSession = Boolean(
      (rawNotes && (rawNotes.includes('インスト') || rawNotes.includes('セッション'))) ||
      (categoryVal && (categoryVal.includes('インスト') || categoryVal.includes('セッション')))
    );
    
    // Check rental/bring or notes for long setup
    let requiresLongSetup = false;
    const isNoneVal = (val?: string) => !val || val === 'なし' || val === '無し' || val === '無' || val === 'none' || val === '-' || val === 'FALSE' || val === 'false';
    const cleanRental = !isNoneVal(rentalVal) ? rentalVal : undefined;
    const cleanBring = !isNoneVal(bringVal) ? bringVal : undefined;

    if (cleanRental) requiresLongSetup = true;
    if (cleanBring) requiresLongSetup = true;
    if (rawNotes && (rawNotes.includes('転換長') || rawNotes.includes('セッティング長'))) {
      requiresLongSetup = true;
    }

    // Assignment song check (課題曲列, カテゴリ列, 備考欄)
    let isAssignment = false;
    if (assignmentIdx !== -1 && row[assignmentIdx] && !isNoneVal(row[assignmentIdx])) {
      isAssignment = true;
    }
    if (categoryVal && (categoryVal.includes('課題曲') || categoryVal.includes('課題'))) {
      isAssignment = true;
    }
    if (rawNotes && rawNotes.includes('課題曲')) {
      isAssignment = true;
    }

    songs.push({
      id: `song-${i}`,
      title,
      category: categoryVal || (isAssignment ? '課題曲' : (isSession ? 'セッション' : undefined)),
      bandName: bandNameVal || undefined,
      artist: artistVal || undefined,
      rental: cleanRental,
      bring: cleanBring,
      members,
      rawNotes: rawNotes || undefined,
      isSession,
      isAssignment,
      requiresLongSetup
    });

    // Parse constraints from notes (カンマ(,)や「、」、改行で区切られた各項目を解釈)
    if (rawNotes) {
      const allNames = Array.from(new Set(members.map(m => m.name)));
      const noteItems = rawNotes.split(/[,、\n\r]+/).map(s => s.trim()).filter(Boolean);

      for (const item of noteItems) {
        for (const name of allNames) {
          if (item.includes(name)) {
            const timeConstraint = parseTimeConstraint(item);
            const isFirstTime = item.includes('初参加');
            const prevTopper = item.includes('前回トッパー') || item.includes('前トッパー');
            const prevTori = item.includes('前回トリ') || item.includes('前トリ');
            const memberLongSetup = item.includes('転換長') || item.includes('セッティング長');

            const existing = constraintsMap.get(name) || { name, formattedText: '' };
            
            if (timeConstraint?.startMinutes !== undefined) existing.startMinutes = timeConstraint.startMinutes;
            if (timeConstraint?.endMinutes !== undefined) existing.endMinutes = timeConstraint.endMinutes;
            if (isFirstTime) existing.isFirstTime = true;
            if (prevTopper) existing.prevTopper = true;
            if (prevTori) existing.prevTori = true;
            if (memberLongSetup) existing.requiresLongSetup = true;

            existing.formattedText = existing.formattedText 
              ? `${existing.formattedText}, ${item}` 
              : item;

            constraintsMap.set(name, existing);
          }
        }
      }
    }
  }

  return {
    songs,
    constraints: Array.from(constraintsMap.values())
  };
}
