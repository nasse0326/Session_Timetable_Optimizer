import LZString from 'lz-string';
import { ScheduledSong } from '../types';

export interface SharedScheduleData {
  title?: string;
  updatedAt: string;
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

/**
 * スケジュールデータを URL-Safe な圧縮文字列にエンコード
 */
export function encodeScheduleToUrl(schedule: ScheduledSong[], sessionTitle?: string): string {
  const data: SharedScheduleData = {
    title: sessionTitle || '軽音セッション タイムテーブル',
    updatedAt: new Date().toISOString(),
    schedule: schedule.map(item => ({
      startTime: item.startTime,
      endTime: item.endTime,
      isBreakAfter: item.isBreakAfter,
      conflicts: item.conflicts.length > 0 ? item.conflicts : undefined,
      song: {
        title: item.song.title,
        category: item.song.category,
        bandName: item.song.bandName,
        artist: item.song.artist,
        rental: item.song.rental,
        bring: item.song.bring,
        rawNotes: item.song.rawNotes,
        requiresLongSetup: item.song.requiresLongSetup,
        members: item.song.members.map(m => ({
          part: m.part,
          name: m.name
        }))
      }
    }))
  };

  const jsonStr = JSON.stringify(data);
  return LZString.compressToEncodedURIComponent(jsonStr);
}

/**
 * URL のハッシュ文字列からスケジュールデータを復元
 */
export function decodeScheduleFromUrl(compressedStr: string): SharedScheduleData | null {
  try {
    const jsonStr = LZString.decompressFromEncodedURIComponent(compressedStr);
    if (!jsonStr) return null;
    return JSON.parse(jsonStr) as SharedScheduleData;
  } catch (e) {
    console.error('Failed to decode schedule from URL', e);
    return null;
  }
}
