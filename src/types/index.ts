export interface SongMember {
  part: string;
  name: string;
}

export interface Song {
  id: string;
  title: string;
  category?: string;       // カテゴリ（「通常」「課題曲」「セッション」など）
  bandName?: string;       // バンド名
  artist?: string;         // アーティスト名 / 原曲アーティスト
  rental?: string;         // レンタル機材情報
  bring?: string;          // 持込機材情報
  members: SongMember[];
  rawNotes?: string;
  isSession?: boolean;     // インスト・セッション曲フラグ
  isAssignment?: boolean;  // 課題曲フラグ
  requiresLongSetup?: boolean; // 転換長（持込機材など）
}

export interface MemberConstraint {
  name: string;
  startMinutes?: number; // 0:00からの経過分数 (例: 13:00なら 13 * 60 = 780)
  endMinutes?: number;   // 0:00からの経過分数
  formattedText?: string;
  isFirstTime?: boolean; // 初参加
  prevTopper?: boolean;  // 前回トッパー
  prevTori?: boolean;    // 前回トリ
  requiresLongSetup?: boolean; // 転換長（ドラム等）
}

export interface SessionConfig {
  startTime: string;
  defaultPlayMinutes: number;
  transitionMinutes: number;
  breakIntervalSongs: number; // ※従来の機能（後方互換用）
  breakMinutes: number;
  
  openingMinutes?: number;   // 集合・機材セッティング・オープニング時間（分）
  targetEndTime?: string;    // 希望終了時刻（例: '18:00'）
  closingMinutes?: number;   // 演奏終了後の片付け・完全撤収時間（分）
  
  mode: 'session' | 'live';
  numberOfParts: number; // 1, 2, 3, 4部構成
  fixedTopperId?: string;
  fixedToriId?: string;
  
  weights: {
    consecutive: number;
    drum: number;
    vocal: number;
    placement: number;
    efficiency: number;
    longSetup: number;
    assignment?: number;
  };
}

export interface ScheduledSong {
  song: Song;
  startTime: string;     // "13:00"
  endTime: string;       // "13:05"
  isBreakAfter: boolean;
  conflicts: string[];   // 警告メッセージ一覧
}

export interface OptimizationResult {
  score: number;
  schedule: ScheduledSong[];
  eventStartTime?: string;   // イベント開始・集合時刻（例: "13:00"）
  openingEndTime?: string;   // 1曲目開始直前・セッティング完了時刻（例: "13:15"）
  songsEndTime?: string;     // 最終曲の演奏終了時刻（例: "17:45"）
  eventEndTime?: string;     // イベント完全撤収・終了時刻（例: "18:00"）
  isExtended?: boolean;      // targetEndTimeを超えて自動延長されたかどうかのフラグ
  totalViolations: {
    timeConstraint: number;
    drumTransition: number;
    consecutivePlay: number;
    placement: number;
    vocalConsecutive: number;
  };
}
