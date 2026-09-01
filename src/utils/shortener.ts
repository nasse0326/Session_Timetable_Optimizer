/**
 * URL短縮ユーティリティ
 * 
 * タイムテーブルの共有URL（#d=...）は曲数が多いと3,000文字を超えるため、
 * QRコードの国際規格上限（2,953文字）オーバーによるエラーを防ぎ、
 * スマホカメラで0.1秒で高速読み取りできる特大ドットQRを生成するために短縮URLを発行します。
 */

// 短縮URLのメモリキャッシュ（同一セッション内での重複APIリクエストを防止）
const urlCache = new Map<string, string>();

export async function shortenUrl(longUrl: string, timeoutMs: number = 6000): Promise<string> {
  if (!longUrl) return '';

  // 既に短縮済みのURL、または短いURLならそのまま返す
  if (longUrl.length < 80 || longUrl.startsWith('https://tinyurl.com') || longUrl.startsWith('https://is.gd')) {
    return longUrl;
  }

  // キャッシュチェック
  if (urlCache.has(longUrl)) {
    return urlCache.get(longUrl)!;
  }

  // 1. TinyURL API (Primary)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const shortUrl = (await response.text()).trim();
      if (shortUrl.startsWith('http')) {
        urlCache.set(longUrl, shortUrl);
        return shortUrl;
      }
    }
  } catch (err) {
    console.warn('TinyURL shortener failed, trying fallback is.gd...', err);
  }

  // 2. is.gd API (Fallback)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(longUrl)}`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const shortUrl = (await response.text()).trim();
      if (shortUrl.startsWith('http')) {
        urlCache.set(longUrl, shortUrl);
        return shortUrl;
      }
    }
  } catch (err) {
    console.warn('is.gd shortener fallback failed', err);
  }

  // 短縮APIが利用できない場合（オフラインなど）は元のURLを返す
  return longUrl;
}
