import LZString from 'lz-string';
import { ScheduledSong } from '../types';

export interface SharedScheduleData {
  title?: string;
  updatedAt: string;
  eventStartTime?: string;
  openingEndTime?: string;
  eventEndTime?: string;
  isExtended?: boolean;
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

// 超コンパクトミニファイ構造
// [startTime, endTime, title, category, band, artist, rental, bring, [[part, name], ...], isBreak, rawNotes]
type CompactSong = [
  string, // 0: startTime
  string, // 1: endTime
  string, // 2: title
  string, // 3: category
  string, // 4: band
  string, // 5: artist
  string, // 6: rental
  string, // 7: bring
  [string, string][], // 8: members [[part, name], ...]
  number, // 9: isBreakAfter (1 or 0)
  string? // 10: rawNotes (optional)
];

interface CompactPayload {
  t: string; // title
  est?: string; // eventStartTime
  oet?: string; // openingEndTime
  eet?: string; // eventEndTime
  ext?: number; // isExtended (1 or 0)
  s: CompactSong[]; // schedule
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
  }
): string {
  const compactPayload: CompactPayload = {
    t: sessionTitle || '軽音セッション タイムテーブル',
    est: timeline?.eventStartTime,
    oet: timeline?.openingEndTime,
    eet: timeline?.eventEndTime,
    ext: timeline?.isExtended ? 1 : 0,
    s: schedule.map(item => {
      const s = item.song;
      const compact: CompactSong = [
        item.startTime,
        item.endTime,
        s.title,
        s.category || '',
        s.bandName || '',
        s.artist || '',
        s.rental || '',
        s.bring || '',
        s.members.map(m => [m.part, m.name]),
        item.isBreakAfter ? 1 : 0
      ];
      if (s.rawNotes) {
        compact.push(s.rawNotes);
      }
      return compact;
    })
  };

  const jsonStr = JSON.stringify(compactPayload);
  return LZString.compressToEncodedURIComponent(jsonStr);
}

/**
 * URL のハッシュ文字列からスケジュールデータを復元（新旧両対応）
 */
export function decodeScheduleFromUrl(compressedStr: string): SharedScheduleData | null {
  try {
    const jsonStr = LZString.decompressFromEncodedURIComponent(compressedStr);
    if (!jsonStr) return null;
    const parsed = JSON.parse(jsonStr);

    // 新形式 (CompactPayload: { t, s, est, oet, eet, ext }) の判定
    if (parsed && Array.isArray(parsed.s)) {
      const compact = parsed as CompactPayload;
      const isNoneVal = (val?: string) => !val || val === 'なし' || val === '無し' || val === '無' || val === 'none' || val === '-' || val === 'FALSE' || val === 'false';

      return {
        title: compact.t,
        updatedAt: new Date().toISOString(),
        eventStartTime: compact.est,
        openingEndTime: compact.oet,
        eventEndTime: compact.eet,
        isExtended: compact.ext === 1,
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
              category: c[3] || undefined,
              bandName: c[4] || undefined,
              artist: c[5] || undefined,
              rental: rentalVal,
              bring: bringVal,
              requiresLongSetup,
              rawNotes: c[10] || undefined,
              members: (c[8] || []).map(m => ({
                part: m[0],
                name: m[1]
              }))
            }
          };
        })
      };
    }

    // 旧形式 (SharedScheduleData) の互換フォールバック
    if (parsed && Array.isArray(parsed.schedule)) {
      return parsed as SharedScheduleData;
    }

    return null;
  } catch (e) {
    console.error('Failed to decode schedule from URL', e);
    return null;
  }
}
