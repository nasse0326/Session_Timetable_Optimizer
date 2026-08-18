import { Song, SongMember, MemberConstraint } from '../types';

export const SAMPLE_TSV = `曲名	カテゴリ	バンド名	アーティスト	レンタル	持込	Vo	Gt1	Gt2	Ba	Dr	Key	備考
天体観測	通常	Aバンド	BUMP OF CHICKEN	なし	なし	田中	佐藤	鈴木	高橋	伊藤		
Pretender	課題曲	Bバンド	Official髭男dism	なし	Gtエフェクター	山田		田中	中村	小林	加藤	山田 15:00以降, 転換長
マリーゴールド	通常	Cバンド	あいみょん	なし	なし	佐藤	鈴木		高橋	伊藤		田中 初参加
Lemon	通常	Dバンド	米津玄師	なし	なし	田中	山田		中村	小林		
群青	課題曲	Eバンド	YOASOBI	Keyスタンド	なし	加藤	佐藤	鈴木	高橋	伊藤	山田	加藤 16:30まで
白日	通常	Fバンド	King Gnu	なし	なし	山田	田中		中村	小林	加藤	小林 前回トッパー
夜に駆ける	通常	Gバンド	YOASOBI	なし	なし	佐藤	鈴木		高橋	伊藤		
ドライフラワー	通常	Hバンド	優里	なし	なし	田中	山田		中村	小林		
紅蓮華	課題曲	Iバンド	LiSA	なし	ツインペダル	加藤	佐藤	鈴木	高橋	伊藤		転換長
炎	通常	Jバンド	LiSA	なし	なし	山田	田中		中村	小林	加藤	山田 14:00~16:00
Session (Jam)	インスト	セッション隊	Original	なし	なし						インスト, 転換長
怪物	通常	Kバンド	YOASOBI	なし	なし	田中	山田		中村	小林		
踊	通常	Lバンド	Ado	なし	なし	加藤	佐藤	鈴木	高橋	伊藤	山田	
廻廻奇譚	通常	Mバンド	Eve	なし	なし	山田	田中		中村	小林		高橋 前回トリ
Cry Baby	通常	Nバンド	Official髭男dism	なし	なし	佐藤	鈴木		高橋	伊藤		`;

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
  
  const titleIdx = headers.findIndex(h => h.includes('曲') || h.toLowerCase() === 'title');
  const notesIdx = headers.findIndex(h => h.includes('備考') || h.toLowerCase() === 'notes');
  const categoryIdx = headers.findIndex(h => h.includes('カテゴリ') || h.toLowerCase() === 'category');
  const bandNameIdx = headers.findIndex(h => h.includes('バンド') || h.toLowerCase() === 'band');
  const artistIdx = headers.findIndex(h => h.includes('アーティスト') || h.toLowerCase() === 'artist');
  const rentalIdx = headers.findIndex(h => h.includes('レンタル') || h.toLowerCase() === 'rental');
  const bringIdx = headers.findIndex(h => h.includes('持込') || h.includes('持ち込み') || h.toLowerCase() === 'bring');
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
    if (rentalIdx !== -1 && row[rentalIdx] && !isNoneVal(row[rentalIdx])) requiresLongSetup = true;
    if (bringIdx !== -1 && row[bringIdx] && !isNoneVal(row[bringIdx])) requiresLongSetup = true;
    if (rawNotes && (rawNotes.includes('転換長') || rawNotes.includes('セッティング長') || rawNotes.includes('セッティング') || rawNotes.includes('持込') || rawNotes.includes('レンタル'))) {
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
      rental: rentalVal || undefined,
      bring: bringVal || undefined,
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
            const memberLongSetup = item.includes('転換長') || item.includes('セッティング長') || item.includes('セッティング');

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
