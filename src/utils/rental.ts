/**
 * レンタル機材の個人自動紐づけロジック
 * 曲ごとのレンタル情報（「エレキピアノ」「ベースアンプ」「佐藤(Gt)」等）から、
 * 実際にその機材を利用・レンタルしている該当パートの個人を特定します。
 */

export interface MemberRentalDetail {
  memberName: string;
  rentalItem: string;
  songTitle: string;
}

const PART_KEYWORDS: { partPattern: RegExp; keywords: string[] }[] = [
  {
    partPattern: /(key|キーボード|pf|piano|ピアノ|シンセ|オルガン|鍵盤)/i,
    keywords: ['ピアノ', 'piano', 'key', 'pf', 'シンセ', 'オルガン', 'エレピ', 'エレキピアノ', '電子ピアノ', 'キーボード', 'nord', 'roland']
  },
  {
    partPattern: /(ba|bass|ベース)/i,
    keywords: ['ベース', 'ba', 'bass', 'ベースアンプ', 'ampeg', 'アンペグ']
  },
  {
    partPattern: /(gt|guitar|ギター)/i,
    keywords: ['ギター', 'gt', 'guitar', 'ギターアンプ', 'jc-120', 'jc', 'マーシャル', 'marshall', 'ジャズコ']
  },
  {
    partPattern: /(dr|drum|ドラム)/i,
    keywords: ['ドラム', 'dr', 'drum', 'ペダル', 'ツインペダル', 'スネア', 'シンバル', 'スティック']
  },
  {
    partPattern: /(vo|vocal|ボーカル|マイク)/i,
    keywords: ['マイク', 'vo', 'ボーカル', 'mic', 'ワイヤレス', 'shure', 'sennheiser']
  }
];

const isNoneVal = (val?: string) => {
  if (!val) return true;
  const v = val.trim().toLowerCase();
  return v === 'なし' || v === '無し' || v === '無' || v === 'none' || v === '-' || v === 'false' || v === 'null';
};

/**
 * 1曲の情報から、レンタル対象となる個人メンバーを特定
 */
export function detectRentalMembersForSong(song: {
  title?: string;
  rental?: string;
  rawNotes?: string;
  members: { part: string; name: string }[];
}): MemberRentalDetail[] {
  const results: MemberRentalDetail[] = [];
  const rentalText = (song.rental || '').trim();
  const notesText = (song.rawNotes || '').trim();
  const songTitle = song.title || '楽曲';

  if (isNoneVal(rentalText) && !notesText.includes('レンタル') && !notesText.includes('借用')) {
    return results;
  }

  const combinedText = `${rentalText} ${notesText}`.toLowerCase();

  // 1. レンタル欄または備考欄にメンバーの「名前」が明記されている場合
  for (const m of song.members) {
    const name = m.name?.trim();
    if (name && (rentalText.includes(name) || (notesText.includes(name) && notesText.includes('レンタル')))) {
      results.push({
        memberName: name,
        rentalItem: rentalText || '機材レンタル',
        songTitle
      });
    }
  }

  if (results.length > 0) {
    return results;
  }

  // 2. レンタル機材名（エレキピアノ、ベースアンプ等）から担当パートのメンバーを特定
  if (!isNoneVal(rentalText)) {
    for (const item of PART_KEYWORDS) {
      const isKeywordPresent = item.keywords.some(kw => combinedText.includes(kw));
      if (isKeywordPresent) {
        const matchingMembers = song.members.filter(m => item.partPattern.test(m.part));
        for (const mm of matchingMembers) {
          const name = mm.name?.trim();
          if (name && !results.some(r => r.memberName === name)) {
            results.push({
              memberName: name,
              rentalItem: rentalText,
              songTitle
            });
          }
        }
      }
    }
  }

  return results;
}

/**
 * 全スケジュールデータから、全参加者の個人別レンタル情報を集計
 */
export function aggregateMemberRentalInfo(schedule: {
  song: {
    title: string;
    rental?: string;
    rawNotes?: string;
    members: { part: string; name: string }[];
  };
}[]): Map<string, { hasRental: boolean; rentalItems: string[] }> {
  const map = new Map<string, { hasRental: boolean; rentalItems: string[] }>();

  schedule.forEach(item => {
    const rentals = detectRentalMembersForSong(item.song);
    rentals.forEach(r => {
      const existing = map.get(r.memberName) || { hasRental: true, rentalItems: [] };
      if (!existing.rentalItems.includes(r.rentalItem)) {
        existing.rentalItems.push(r.rentalItem);
      }
      existing.hasRental = true;
      map.set(r.memberName, existing);
    });
  });

  return map;
}
