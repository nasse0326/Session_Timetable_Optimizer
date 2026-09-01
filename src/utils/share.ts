import { deflateRaw, inflateRaw } from 'pako';
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
  adminPassword?: string;
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

// 0:00からの経過分数を計算
function toMinutes(t?: string): number | undefined {
  if (!t) return undefined;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// 分数を "HH:MM" 形式に復元
function fromMinutes(mins?: number): string | undefined {
  if (mins === undefined || isNaN(mins)) return undefined;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Base64URL 相互変換
function uint8ArrayToBase64Url(uint8Array: Uint8Array): string {
  let binary = '';
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

class StringDictionary {
  strings: string[] = [];
  dict: Map<string, number> = new Map();

  getIndex(str: string | undefined | null): number | undefined {
    if (!str || str === 'なし' || str === '無し' || str === '無' || str === 'none' || str === '-') return undefined;
    if (this.dict.has(str)) {
      return this.dict.get(str)!;
    }
    const idx = this.strings.length;
    this.strings.push(str);
    this.dict.set(str, idx);
    return idx;
  }
}

// [startMin, endMin, title, [partIdx, nameIdx, ...], catIdx?, bandIdx?, artIdx?, rentIdx?, bringIdx?, isBreak?, notesIdx?]
type UltraCompactSong = [
  number | undefined,
  number | undefined,
  string,
  number[],
  (number | undefined)?,
  (number | undefined)?,
  (number | undefined)?,
  (number | undefined)?,
  (number | undefined)?,
  (number | undefined)?,
  (number | undefined)?
];

interface UltraCompactPayload {
  t: string;
  est?: number;
  oet?: number;
  eet?: number;
  ext?: number;
  swu?: string;
  pw?: string;
  d: string[];
  s: UltraCompactSong[];
}

/**
 * スケジュールデータを Deflate (pako) + 辞書/数値パッキングにより超極小 Base64URL にエンコード
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
    adminPassword?: string;
  }
): string {
  const dictionary = new StringDictionary();

  const compactSongs: UltraCompactSong[] = schedule.map(item => {
    const s = item.song;
    const memsFlat: number[] = [];
    for (const m of s.members) {
      const pIdx = dictionary.getIndex(m.part);
      const nIdx = dictionary.getIndex(m.name);
      memsFlat.push(pIdx !== undefined ? pIdx : -1, nIdx !== undefined ? nIdx : -1);
    }

    const arr: UltraCompactSong = [
      toMinutes(item.startTime),
      toMinutes(item.endTime),
      s.title,
      memsFlat,
      dictionary.getIndex(s.category),
      dictionary.getIndex(s.bandName),
      dictionary.getIndex(s.artist),
      dictionary.getIndex(s.rental),
      dictionary.getIndex(s.bring),
      item.isBreakAfter ? 1 : undefined,
      dictionary.getIndex(s.rawNotes)
    ];

    // 末尾の不要な undefined を切り詰めてデータサイズを節約
    while (arr.length > 4 && arr[arr.length - 1] === undefined) {
      arr.pop();
    }
    return arr;
  });

  const payload: UltraCompactPayload = {
    t: sessionTitle || 'セッション タイムテーブル',
    est: toMinutes(timeline?.eventStartTime),
    oet: toMinutes(timeline?.openingEndTime),
    eet: toMinutes(timeline?.eventEndTime),
    ext: timeline?.isExtended ? 1 : undefined,
    swu: timeline?.spreadsheetWebhookUrl,
    pw: timeline?.adminPassword,
    d: dictionary.strings,
    s: compactSongs
  };

  const jsonStr = JSON.stringify(payload);
  const compressedBytes = deflateRaw(new TextEncoder().encode(jsonStr), { level: 9 });
  return 'z_' + uint8ArrayToBase64Url(compressedBytes);
}

/**
 * URL のハッシュ文字列からスケジュールデータを復元（pako Deflate 及び LZString フォールバック）
 */
export function decodeScheduleFromUrl(compressedStr: string): SharedScheduleData | null {
  try {
    // 1. 新方式: pako Deflate Raw ('z_' プレフィックス)
    if (compressedStr.startsWith('z_')) {
      const base64Url = compressedStr.slice(2);
      const bytes = base64UrlToUint8Array(base64Url);
      const decompressedJson = new TextDecoder().decode(inflateRaw(bytes));
      const p = JSON.parse(decompressedJson) as UltraCompactPayload;
      const dict = p.d || [];
      const resolve = (idx?: number) => (idx !== undefined && idx >= 0 && idx < dict.length ? dict[idx] : undefined);

      return {
        title: p.t,
        updatedAt: new Date().toISOString(),
        eventStartTime: fromMinutes(p.est),
        openingEndTime: fromMinutes(p.oet),
        eventEndTime: fromMinutes(p.eet),
        isExtended: p.ext === 1,
        spreadsheetWebhookUrl: p.swu,
        adminPassword: p.pw,
        schedule: p.s.map(c => {
          const [startMin, endMin, title, memsFlat, catIdx, bandIdx, artIdx, rentIdx, bringIdx, isBreak, notesIdx] = c;
          const mems: { part: string; name: string }[] = [];
          for (let i = 0; i < (memsFlat || []).length; i += 2) {
            mems.push({
              part: resolve(memsFlat[i]) || '',
              name: resolve(memsFlat[i + 1]) || ''
            });
          }

          const rental = resolve(rentIdx);
          const bring = resolve(bringIdx);
          const rawNotes = resolve(notesIdx);
          const requiresLongSetup = Boolean(rental || bring || rawNotes?.includes('転換長') || rawNotes?.includes('セッティング長'));

          return {
            startTime: fromMinutes(startMin) || '12:00',
            endTime: fromMinutes(endMin) || '12:30',
            isBreakAfter: isBreak === 1,
            song: {
              title,
              category: resolve(catIdx),
              bandName: resolve(bandIdx),
              artist: resolve(artIdx),
              rental,
              bring,
              requiresLongSetup,
              rawNotes,
              members: mems
            }
          };
        })
      };
    }

    // 2. 旧方式: LZString フォールバック
    const jsonStr = LZString.decompressFromEncodedURIComponent(compressedStr);
    if (!jsonStr) return null;
    const parsed = JSON.parse(jsonStr);

    if (parsed && Array.isArray(parsed.s)) {
      const compact = parsed as any;
      const dict = compact.d || [];
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
        adminPassword: compact.pw,
        schedule: compact.s.map((c: any) => {
          return {
            startTime: c[0],
            endTime: c[1],
            isBreakAfter: c[9] === 1,
            song: {
              title: c[2],
              category: resolveString(c[3]) || undefined,
              bandName: resolveString(c[4]) || undefined,
              artist: resolveString(c[5]) || undefined,
              rental: c[6] || undefined,
              bring: c[7] || undefined,
              requiresLongSetup: Boolean(c[6] || c[7] || c[10]?.includes('転換長')),
              rawNotes: c[10] || undefined,
              members: (c[8] || []).map((m: any) => ({
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

