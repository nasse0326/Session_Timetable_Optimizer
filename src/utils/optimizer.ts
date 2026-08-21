import { Song, MemberConstraint, SessionConfig, ScheduledSong, OptimizationResult, SongMember } from '../types';

function parseTimeStrToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatMinutesToStr(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

export function generateSchedule(
  songs: Song[],
  config: SessionConfig
): ScheduledSong[] {
  const opening = config.openingMinutes ?? 0;
  let currentMinutes = parseTimeStrToMinutes(config.startTime) + opening;
  const schedule: ScheduledSong[] = [];

  const partSize = Math.ceil(songs.length / Math.max(1, config.numberOfParts));

  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    const startTime = formatMinutesToStr(currentMinutes);
    currentMinutes += config.defaultPlayMinutes;
    const endTime = formatMinutesToStr(currentMinutes);
    
    // Check if break should be after this song
    const isBreakAfter = (i + 1) % partSize === 0 && i !== songs.length - 1;
    
    schedule.push({
      song,
      startTime,
      endTime,
      isBreakAfter,
      conflicts: []
    });

    currentMinutes += config.transitionMinutes;
    if (isBreakAfter) {
      currentMinutes += config.breakMinutes;
    }
  }

  return schedule;
}

export function evaluateSchedule(
  schedule: ScheduledSong[],
  constraints: MemberConstraint[],
  config: SessionConfig
): OptimizationResult {
  let score = 0;
  const violations = {
    timeConstraint: 0,
    drumTransition: 0,
    consecutivePlay: 0,
    placement: 0,
    vocalConsecutive: 0
  };

  const constraintMap = new Map(constraints.map(c => [c.name, c]));
  const W = {
    consecutive: config.weights?.consecutive ?? 1.0,
    drum: config.weights?.drum ?? 1.0,
    vocal: config.weights?.vocal ?? 1.0,
    placement: config.weights?.placement ?? 1.0,
    efficiency: config.weights?.efficiency ?? 1.0,
    longSetup: config.weights?.longSetup ?? 1.0,
    assignment: config.weights?.assignment ?? 1.0,
  };
  const isLive = config.mode === 'live';
  
  const partSize = Math.ceil(schedule.length / Math.max(1, config.numberOfParts));
  const lastPartStartIndex = partSize * (config.numberOfParts - 1);

  // Track part appearances for multi-player ordering (Other -> Dr)
  const partAppearances = new Map<string, { part: string, index: number }[]>();

  for (let i = 0; i < schedule.length; i++) {
    const item = schedule[i];
    const startMins = parseTimeStrToMinutes(item.startTime);
    const endMins = parseTimeStrToMinutes(item.endTime);
    
    item.conflicts = [];

    // 0. Session/Inst placement
    if (item.song.isSession && !isLive) {
      if (i !== 0 && (!schedule[i-1].isBreakAfter)) {
        score += 200 * W.placement;
        violations.placement++;
        item.conflicts.push(`セッション曲の配置位置不適切 (休憩明け推奨)`);
      }
    }

    // 0.5. Assignment song placement (課題曲を開始側に集約)
    if (item.song.isAssignment && W.assignment > 0) {
      // 曲順インデックス i が後ろになるほどペナルティ
      score += i * 40 * W.assignment;

      // 前半（全体の半分）以降に配置された場合の追加ペナルティ
      const midpoint = Math.ceil(schedule.length / 2);
      if (i >= midpoint) {
        score += 150 * W.assignment;
        violations.placement++;
        if (W.assignment >= 1.2 && !item.conflicts.includes('課題曲の後半配置 (前半推奨)')) {
          item.conflicts.push('課題曲の後半配置 (前半推奨)');
        }
      }
    }

    const currentMemberNames = new Set(item.song.members.map(m => m.name));

    // 1. Song-level Long Setup (転換長) Check
    const hasLongSetupMember = item.song.members.some(m => constraintMap.get(m.name)?.requiresLongSetup);
    const isSongLongSetup = item.song.requiresLongSetup || hasLongSetupMember;

    if (isSongLongSetup && W.longSetup > 0) {
      const isTopper = i === 0;
      const isAfterBreak = i > 0 && schedule[i - 1].isBreakAfter;
      const isBeforeBreak = item.isBreakAfter;
      const isConsecutive = i > 0 && schedule[i - 1].song.members.some(prevM => currentMemberNames.has(prevM.name));
      const isInLastPart = i >= lastPartStartIndex && config.numberOfParts > 1;

      if (isTopper || isAfterBreak) {
        // 休憩明け直後・トッパーは最高の配置
        if (isInLastPart) {
          // 最終部の休憩明け（最終部回避は緩やかな減点のみで許容）
          score += 25 * W.longSetup;
        } else {
          score += 0;
        }
      } else if (isBeforeBreak || isConsecutive) {
        // 休憩前または同一メンバー連続（機材据置可能）
        score += (isInLastPart ? 60 : 35) * W.longSetup;
      } else {
        // 通常枠（休憩から離れた単独枠）
        score += (isInLastPart ? 100 : 70) * W.longSetup;
        if (W.longSetup >= 1.2) {
          // 重みを高めに設定している場合のみ注意喚起を表示
          if (!item.conflicts.includes('転換時間注意 (休憩前後推奨)')) {
            item.conflicts.push('転換時間注意 (休憩前後推奨)');
          }
        }
      }
    }

    // 2. Time & Member Constraints
    for (const member of item.song.members) {
      // Record appearance for global order check
      let apps = partAppearances.get(member.name);
      if (!apps) {
        apps = [];
        partAppearances.set(member.name, apps);
      }
      apps.push({ part: member.part, index: i });

      const constraint = constraintMap.get(member.name);
      if (constraint) {
        // Time Constraints (Strict penalty)
        if (constraint.startMinutes !== undefined && startMins < constraint.startMinutes) {
          score += 10000;
          violations.timeConstraint++;
          if (!item.conflicts.includes(`${member.name}: 早退・遅刻違反`)) item.conflicts.push(`${member.name}: 早退・遅刻違反`);
        }
        if (constraint.endMinutes !== undefined && endMins > constraint.endMinutes) {
          score += 10000;
          violations.timeConstraint++;
          if (!item.conflicts.includes(`${member.name}: 早退・遅刻違反`)) item.conflicts.push(`${member.name}: 早退・遅刻違反`);
        }
        
        if (!isLive) {
          // First time
          if (constraint.isFirstTime && i >= Math.floor(schedule.length / 2)) {
            score += 100 * W.placement;
            violations.placement++;
            if (!item.conflicts.includes(`${member.name}: 初参加は前半推奨`)) item.conflicts.push(`${member.name}: 初参加は前半推奨`);
          }

          // Prev Topper
          if (constraint.prevTopper && i === 0) {
            score += 500 * W.placement;
            violations.placement++;
            if (!item.conflicts.includes(`${member.name}: 前回トッパー重複`)) item.conflicts.push(`${member.name}: 前回トッパー重複`);
          }

          // Prev Tori
          if (constraint.prevTori && i === schedule.length - 1) {
            score += 500 * W.placement;
            violations.placement++;
            if (!item.conflicts.includes(`${member.name}: 前回トリ重複`)) item.conflicts.push(`${member.name}: 前回トリ重複`);
          }
        }
      }
    }

    // 3. Consecutive plays, Vocal Dispersion & Band Overlap
    if (i > 0) {
      const prevItem = schedule[i - 1];
      const prevMemberNames = new Set(prevItem.song.members.map(m => m.name));
      
      // Calculate overlap
      let overlapCount = 0;
      for (const name of currentMemberNames) {
        if (prevMemberNames.has(name)) overlapCount++;
      }
      
      const totalUnique = new Set([...Array.from(currentMemberNames), ...Array.from(prevMemberNames)]).size;
      const overlapRatio = totalUnique > 0 ? overlapCount / totalUnique : 0;
      const isHighOverlap = overlapRatio >= 0.49; // approx >= 50%

      const isBreakBetween = prevItem.isBreakAfter;

      if (!isBreakBetween) {
        if (isHighOverlap) {
          // Band overlap bonus (Transition Efficiency)
          score -= 30 * W.efficiency; // Bonus
          // Check for vocal consecutive even in overlap unless assignment
          const currentVo = item.song.members.filter(m => m.part.includes('Vo') || m.part.includes('ボーカル'));
          const prevVo = prevItem.song.members.filter(m => m.part.includes('Vo') || m.part.includes('ボーカル'));
          
          if (!item.song.isAssignment && !prevItem.song.isAssignment) {
            for (const cV of currentVo) {
              if (prevVo.some(pV => pV.name === cV.name)) {
                score += 100 * W.vocal;
                violations.vocalConsecutive++;
                if (!item.conflicts.includes(`${cV.name}: ボーカル連続出演`)) item.conflicts.push(`${cV.name}: ボーカル連続出演`);
              }
            }
          }

          for (const prevMember of prevItem.song.members) {
            const currentMember = item.song.members.find(m => m.name === prevMember.name);
            if (currentMember) {
              const wasDrum = prevMember.part.includes('Dr') || prevMember.part.includes('ドラム');
              const isDrum = currentMember.part.includes('Dr') || currentMember.part.includes('ドラム');
              if (wasDrum !== isDrum) {
                score += 50 * W.drum;
                violations.drumTransition++;
                if (!item.conflicts.includes(`${currentMember.name}: ドラム転換あり連続`)) item.conflicts.push(`${currentMember.name}: ドラム転換あり連続`);
              }
            }
          }
        } else {
          // Normal consecutive play check
          for (const prevMember of prevItem.song.members) {
            const currentMember = item.song.members.find(m => m.name === prevMember.name);
            if (currentMember) {
              const wasDrum = prevMember.part.includes('Dr') || prevMember.part.includes('ドラム');
              const isDrum = currentMember.part.includes('Dr') || currentMember.part.includes('ドラム');
              const wasVo = prevMember.part.includes('Vo') || prevMember.part.includes('ボーカル');
              const isVo = currentMember.part.includes('Vo') || currentMember.part.includes('ボーカル');
              
              if (wasVo && isVo && !item.song.isAssignment && !prevItem.song.isAssignment) {
                score += 100 * W.vocal;
                violations.vocalConsecutive++;
                if (!item.conflicts.includes(`${currentMember.name}: ボーカル連続出演`)) item.conflicts.push(`${currentMember.name}: ボーカル連続出演`);
              }

              if (wasDrum && isDrum) {
                // Dr <-> Dr is encouraged! Bonus
                score -= 10 * W.drum;
              } else if (wasDrum !== isDrum) {
                // Dr <-> Other part
                score += 50 * W.drum;
                violations.drumTransition++;
                if (!item.conflicts.includes(`${currentMember.name}: ドラム転換あり連続`)) item.conflicts.push(`${currentMember.name}: ドラム転換あり連続`);
              } else {
                // Normal consecutive
                score += 10 * W.consecutive;
                violations.consecutivePlay++;
                if (!item.conflicts.includes(`${currentMember.name}: 連続出演`)) item.conflicts.push(`${currentMember.name}: 連続出演`);
              }
            }
          }
        }
      }
    }
  }

  // Global pass: Multi-player (Other -> Dr) ordering
  for (const [name, apps] of Array.from(partAppearances.entries())) {
    const drIndices = apps.filter(a => a.part.includes('Dr') || a.part.includes('ドラム')).map(a => a.index);
    const otherIndices = apps.filter(a => !(a.part.includes('Dr') || a.part.includes('ドラム'))).map(a => a.index);
    
    if (drIndices.length > 0 && otherIndices.length > 0) {
      for (const drIdx of drIndices) {
        for (const otherIdx of otherIndices) {
          if (drIdx < otherIdx) {
            // Dr appears before Other -> stamina penalty
            score += 100 * W.drum;
            violations.placement++;
            schedule[drIdx].conflicts.push(`${name}: ドラムより後に他パート演奏あり (体力配慮)`);
          }
        }
      }
    }
  }

  const eventStartMins = parseTimeStrToMinutes(config.startTime);
  const opening = config.openingMinutes ?? 0;
  const openingEndMins = eventStartMins + opening;
  const songsEndMins = schedule.length > 0 
    ? parseTimeStrToMinutes(schedule[schedule.length - 1].endTime) 
    : openingEndMins;
  
  const closing = config.closingMinutes ?? 0;
  let finalEndMins = songsEndMins + closing;
  let isExtended = false;

  if (config.targetEndTime) {
    const targetEndMins = parseTimeStrToMinutes(config.targetEndTime);
    if (finalEndMins > targetEndMins) {
      isExtended = true;
    } else {
      finalEndMins = targetEndMins;
    }
  }

  return {
    score,
    schedule,
    eventStartTime: formatMinutesToStr(eventStartMins),
    openingEndTime: formatMinutesToStr(openingEndMins),
    songsEndTime: formatMinutesToStr(songsEndMins),
    eventEndTime: formatMinutesToStr(finalEndMins),
    isExtended,
    totalViolations: violations
  };
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function optimizeSchedule(
  songs: Song[],
  constraints: MemberConstraint[],
  config: SessionConfig
): OptimizationResult {
  const NUM_RESTARTS = 60;
  const NUM_ITERATIONS = 500;
  
  let bestResult: OptimizationResult | null = null;
  let bestOrder: Song[] = [];

  const topper = config.fixedTopperId ? songs.find(s => s.id === config.fixedTopperId) : null;
  const tori = config.fixedToriId ? songs.find(s => s.id === config.fixedToriId) : null;
  
  const movableSongs = songs.filter(s => s.id !== config.fixedTopperId && s.id !== config.fixedToriId);

  for (let r = 0; r < NUM_RESTARTS; r++) {
    let shuffledMovable: Song[];
    if (r % 2 === 0 && movableSongs.some(s => s.isAssignment)) {
      // 偶数回目の再起動では課題曲を前方に寄せた初期解からスタート
      const assignments = movableSongs.filter(s => s.isAssignment);
      const nonAssignments = movableSongs.filter(s => !s.isAssignment);
      shuffledMovable = [...shuffle(assignments), ...shuffle(nonAssignments)];
    } else {
      shuffledMovable = shuffle(movableSongs);
    }

    let currentOrder = [...shuffledMovable];
    if (topper) currentOrder.unshift(topper);
    if (tori) currentOrder.push(tori);

    let currentSchedule = generateSchedule(currentOrder, config);
    let currentResult = evaluateSchedule(currentSchedule, constraints, config);

    for (let i = 0; i < NUM_ITERATIONS; i++) {
      if (currentResult.score === 0) break; // Found perfect solution

      const startIdx = topper ? 1 : 0;
      const endIdx = tori ? currentOrder.length - 2 : currentOrder.length - 1;
      
      if (endIdx <= startIdx) break; // Not enough songs to swap

      const idx1 = startIdx + Math.floor(Math.random() * (endIdx - startIdx + 1));
      const idx2 = startIdx + Math.floor(Math.random() * (endIdx - startIdx + 1));
      if (idx1 === idx2) continue;

      const neighborOrder = [...currentOrder];
      if (Math.random() < 0.5) {
        // Swap move
        [neighborOrder[idx1], neighborOrder[idx2]] = [neighborOrder[idx2], neighborOrder[idx1]];
      } else {
        // Insertion / move move
        const [movedSong] = neighborOrder.splice(idx1, 1);
        neighborOrder.splice(idx2, 0, movedSong);
      }
      
      const neighborSchedule = generateSchedule(neighborOrder, config);
      const neighborResult = evaluateSchedule(neighborSchedule, constraints, config);

      if (neighborResult.score < currentResult.score) {
        currentOrder = neighborOrder;
        currentResult = neighborResult;
      }
    }

    if (!bestResult || currentResult.score < bestResult.score) {
      bestResult = currentResult;
      bestOrder = currentOrder;
    }
    
    if (bestResult && bestResult.score === 0) break;
  }

  return bestResult!;
}
