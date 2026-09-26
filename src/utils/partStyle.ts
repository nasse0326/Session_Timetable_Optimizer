/**
 * パート文字列からの担当楽器カテゴリ判定（複数コンポーネントで共通利用）
 */

export type PartCategory = 'vocal' | 'guitar' | 'bass' | 'drum' | 'key' | 'other';

export function getPartCategory(part: string): PartCategory {
  const p = part.toLowerCase();
  // 「Vo&Gt」「GtVo」のように楽器と兼任している場合、どの楽器を弾くのかが一目でわかるように
  // 楽器パート（Gt/Ba/Dr/Key）をVoより優先して判定する
  if (p.includes('gt') || p.includes('ギター') || p.includes('g1') || p.includes('g2')) return 'guitar';
  if (p.includes('ba') || p.includes('ベース')) return 'bass';
  if (p.includes('dr') || p.includes('ドラム')) return 'drum';
  if (p.includes('key') || p.includes('キーボード') || p.includes('pf') || p.includes('syn')) return 'key';
  if (p.includes('vo') || p.includes('ボーカル') || p.includes('うた')) return 'vocal';
  return 'other';
}

export function getPartPriority(part: string): number {
  switch (getPartCategory(part)) {
    case 'vocal': return 1;
    case 'guitar': return 2;
    case 'bass': return 3;
    case 'drum': return 4;
    default: return 5;
  }
}

export function sortMembers<T extends { part: string }>(members: T[]): T[] {
  return [...members].sort((a, b) => getPartPriority(a.part) - getPartPriority(b.part));
}
