import { Song, SongMember, MemberConstraint } from '../types';

export const SAMPLE_TSV = `曲名	Vo	Gt1	Gt2	Ba	Dr	Key	備考
天体観測	田中	佐藤	鈴木	高橋	伊藤		
Pretender	山田		田中	中村	小林	加藤	山田 15:00以降
マリーゴールド	佐藤	鈴木		高橋	伊藤		田中 初参加
Lemon	田中	山田		中村	小林		
群青	加藤	佐藤	鈴木	高橋	伊藤	山田	加藤 16:30まで
白日	山田	田中		中村	小林	加藤	小林 前回トッパー
夜に駆ける	佐藤	鈴木		高橋	伊藤		
ドライフラワー	田中	山田		中村	小林		
紅蓮華	加藤	佐藤	鈴木	高橋	伊藤		伊藤 転換長
炎	山田	田中		中村	小林	加藤	山田 14:00~16:00
Session (Jam)						インスト
怪物	田中	山田		中村	小林		
踊	加藤	佐藤	鈴木	高橋	伊藤	山田	
廻廻奇譚	山田	田中		中村	小林		高橋 前回トリ
Cry Baby	佐藤	鈴木		高橋	伊藤		`;

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
  const rentalIdx = headers.findIndex(h => h.includes('レンタル'));
  const bringIdx = headers.findIndex(h => h.includes('持込') || h.includes('持ち込み'));
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
        // Try to find corresponding part
        const prefix = headers[i].replace('名前', '').trim();
        const partIdx = headers.findIndex((h, idx) => idx !== i && h.includes('パート') && h.startsWith(prefix));
        if (partIdx !== -1) {
          namePartPairs.push({ nameIdx: i, partIdx: partIdx });
        }
      }
    }
  } else {
    headers.forEach((h, idx) => {
      if (idx !== titleIdx && idx !== notesIdx && idx !== rentalIdx && idx !== bringIdx && idx !== assignmentIdx && h) {
        partIndices.push({ index: idx, part: h });
      }
    });
  }

  for (let i = 1; i < parsedRows.length; i++) {
    const row = parsedRows[i].map(c => c.trim());
    if (row.length === 0 || !row[titleIdx]) continue;

    const title = row[titleIdx];
    let rawNotes = notesIdx !== -1 ? row[notesIdx] : '';
    
    // If Format B and no notes column, concat unused columns? 
    // Actually, user said they will add a notes column, but we can also just use existing rawNotes.
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

    const isSession = rawNotes ? (rawNotes.includes('インスト') || rawNotes.includes('セッション')) : false;
    
    // Check rental/bring for long setup
    let requiresLongSetup = false;
    const isNoneVal = (val?: string) => !val || val === 'なし' || val === '無し' || val === '無' || val === 'none' || val === '-' || val === 'FALSE' || val === 'false';
    if (rentalIdx !== -1 && row[rentalIdx] && !isNoneVal(row[rentalIdx])) requiresLongSetup = true;
    if (bringIdx !== -1 && row[bringIdx] && !isNoneVal(row[bringIdx])) requiresLongSetup = true;
    if (rawNotes && (rawNotes.includes('転換長') || rawNotes.includes('セッティング長') || rawNotes.includes('セッティング') || rawNotes.includes('持込') || rawNotes.includes('レンタル'))) {
      requiresLongSetup = true;
    }

    // Assignment song
    let isAssignment = false;
    if (assignmentIdx !== -1 && row[assignmentIdx] && !isNoneVal(row[assignmentIdx])) {
      isAssignment = true;
    }

    songs.push({
      id: `song-${i}`,
      title,
      members,
      rawNotes: rawNotes || undefined,
      isSession,
      isAssignment,
      requiresLongSetup
    });

    // Parse constraints from notes
    if (rawNotes) {
      const allNames = Array.from(new Set(members.map(m => m.name)));
      for (const name of allNames) {
        if (rawNotes.includes(name)) {
          const constraint = parseTimeConstraint(rawNotes);
          const isFirstTime = rawNotes.includes(`${name} 初参加`) || rawNotes.includes(`${name}初参加`);
          const prevTopper = rawNotes.includes(`${name} 前回トッパー`) || rawNotes.includes(`${name}前回トッパー`);
          const prevTori = rawNotes.includes(`${name} 前回トリ`) || rawNotes.includes(`${name}前回トリ`);
          const memberLongSetup = rawNotes.includes(`${name} 転換長`) || rawNotes.includes(`${name}転換長`) || rawNotes.includes(`${name} セッティング長`) || rawNotes.includes(`${name}セッティング長`) || rawNotes.includes(`${name} セッティング`);
          
          if (constraint || isFirstTime || prevTopper || prevTori || memberLongSetup) {
            constraintsMap.set(name, {
              name,
              startMinutes: constraint?.startMinutes,
              endMinutes: constraint?.endMinutes,
              formattedText: rawNotes,
              isFirstTime,
              prevTopper,
              prevTori,
              requiresLongSetup: memberLongSetup
            });
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
