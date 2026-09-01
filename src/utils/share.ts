import LZString from 'lz-string';
import { ScheduledSong } from '../types';

export interface SharedScheduleData {
  title?: string;
  updatedAt: string;
  eventStartTime?: string;
  openingEndTime?: string;
  eventEndTime?: string;
  isExtended?: boolean;
  spreadsheetWebhookUrl?: string;
  schedule: {
    startTime: string;
    endTime: string;
    isBreakAfter: boolean;
    conflicts?: string[];
    song: {
      title: string;
      category?: string;
      bandName?: string;
      artist?: string;
      rental?: string;
      bring?: string;
      rawNotes?: string;
      requiresLongSetup?: boolean;
      members: {
        part: string;
        name: string;
      }[];
    };
  }[];
}

// 辞書型圧縮対応の構造
// [startTime, endTime, title, categoryIdx, bandIdx, artistIdx, rental, bring, [[partIdx, nameIdx], ...], isBreak, rawNotes]
type DictionarySong = [
  string, // 0: startTime
  string, // 1: endTime
  string, // 2: title
  number, // 3: category (index in dict, or -1)
  number, // 4: band (index in dict, or -1)
  number, // 5: artist (index in dict, or -1)
  string, // 6: rental
  string, // 7: bring
  [number, number][], // 8: members [[partIdx, nameIdx], ...]
  number, // 9: isBreakAfter (1 or 0)
  string? // 10: rawNotes (optional)
];

interface CompactPayload {
  t: string; // title
  est?: string; // eventStartTime
  oet?: string; // openingEndTime
  eet?: string; // eventEndTime
  ext?: number; // isExtended (1 or 0)
  swu?: string; // spreadsheetWebhookUrl
  d: string[]; // dictionary of common strings (new format)
  s: DictionarySong[]; // schedule
}

class StringDictionary {
  strings: string[] = [];
  dict: Map<string, number> = new Map();

  getIndex(str: string | undefined | null): number {
    if (!str) return -1;
    if (this.dict.has(str)) {
      return this.dict.get(str)!;
    }
    const idx = this.strings.length;
    this.strings.push(str);
    this.dict.set(str, idx);
    return idx;
  }
}

/**
 * スケジュールデータを URL-Safe かつ QRコード制限（約500〜1000文字以内）に収まる超小型データにエンコード
 */
export function encodeScheduleToUrl(
  schedule: ScheduledSong[], 
  sessionTitle?: string,
  timeline?: {
    eventStartTime?: string;
    openingEndTime?: string;
    eventEndTime?: string;
    isExtended?: boolean;
    spreadsheetWebhookUrl?: string;
  }
): string {
  const dictionary = new StringDictionary();

  const compactSongs: DictionarySong[] = schedule.map(item => {
    const s = item.song;
    const compact: DictionarySong = [
      item.startTime,
      item.endTime,
      s.title,
      dictionary.getIndex(s.category),
      dictionary.getIndex(s.bandName),
      dictionary.getIndex(s.artist),
      s.rental || '',
      s.bring || '',
      s.members.map(m => [dictionary.getIndex(m.part), dictionary.getIndex(m.name)]),
      item.isBreakAfter ? 1 : 0
    ];
    if (s.rawNotes) {
      compact.push(s.rawNotes);
    }
    return compact;
  });

  const compactPayload: CompactPayload = {
    t: sessionTitle || '軽音セッション タイムテーブル',
    est: timeline?.eventStartTime,
    oet: timeline?.openingEndTime,
    eet: timeline?.eventEndTime,
    ext: timeline?.isExtended ? 1 : 0,
    swu: timeline?.spreadsheetWebhookUrl,
    d: dictionary.strings,
    s: compactSongs
  };

  const jsonStr = JSON.stringify(compactPayload);
  return LZString.compressToEncodedURIComponent(jsonStr);
}

/**
 * URL のハッシュ文字列からスケジュールデータを復元
 */
export function decodeScheduleFromUrl(compressedStr: string): SharedScheduleData | null {
  try {
    const jsonStr = LZString.decompressFromEncodedURIComponent(compressedStr);
    if (!jsonStr) return null;
    const parsed = JSON.parse(jsonStr);

    if (parsed && Array.isArray(parsed.s)) {
      const compact = parsed as CompactPayload;
      const dict = compact.d || [];
      const isNoneVal = (val?: string) => !val || val === 'なし' || val === '無し' || val === '無' || val === 'none' || val === '-' || val === 'FALSE' || val === 'false';
      
      const resolveString = (val: number): string => {
        return val >= 0 && val < dict.length ? dict[val] : '';
      };

      return {
        title: compact.t,
        updatedAt: new Date().toISOString(),
        eventStartTime: compact.est,
        openingEndTime: compact.oet,
        eventEndTime: compact.eet,
        isExtended: compact.ext === 1,
        spreadsheetWebhookUrl: compact.swu,
        schedule: compact.s.map(c => {
          const rentalVal = !isNoneVal(c[6]) ? c[6] : undefined;
          const bringVal = !isNoneVal(c[7]) ? c[7] : undefined;
          const hasLongNote = Boolean(c[10]?.includes('転換長') || c[10]?.includes('セッティング長'));
          const requiresLongSetup = Boolean(rentalVal || bringVal || hasLongNote);

          return {
            startTime: c[0],
            endTime: c[1],
            isBreakAfter: c[9] === 1,
            song: {
              title: c[2],
              category: resolveString(c[3]) || undefined,
              bandName: resolveString(c[4]) || undefined,
              artist: resolveString(c[5]) || undefined,
              rental: rentalVal,
              bring: bringVal,
              requiresLongSetup,
              rawNotes: c[10] || undefined,
              members: (c[8] || []).map(m => ({
                part: resolveString(m[0]),
                name: resolveString(m[1])
              }))
            }
          };
        })
      };
    }

    return null;
  } catch (e) {
    console.error('Failed to decode schedule from URL', e);
    return null;
  }
}
