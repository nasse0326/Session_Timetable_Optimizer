export interface SongMember {
  part: string;
  name: string;
}

export interface Song {
  id: string;
  title: string;
  members: SongMember[];
  rawNotes?: string;
  isSession?: boolean; // インスト・セッション曲フラグ
  isAssignment?: boolean; // 課題曲フラグ
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
  totalViolations: {
    timeConstraint: number;
    drumTransition: number;
    consecutivePlay: number;
    placement: number;
    vocalConsecutive: number;
  };
}
