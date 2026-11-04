// Синхронизация метаданных с Яндекс Музыки (только описания релизов, без аудио).
// Запускается в GitHub Actions перед сборкой и пишет public/yandex.json.
// Если Яндекс недоступен, сайт собирается как обычно: скрипт никогда не падает.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const ARTIST_ID = 16514152;
const OUT = resolve(process.cwd(), 'public/yandex.json');
const API = 'https://api.music.yandex.net';
const WEB = 'https://music.yandex.ru';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept-Language': 'ru-RU,ru;q=0.9',
  'X-Yandex-Music-Client': 'YandexMusicWebNext/1.0.0',
};
const DEBUG = process.env.YANDEX_DEBUG === '1';

const log = (...a) => console.log('[yandex-sync]', ...a);
const cover = (uri, size = '1000x1000') => (uri ? `https://${String(uri).replace('%%', size)}` : null);
const names = (artists) => (artists || []).map((a) => a.name).filter(Boolean).join(', ');
const albumUrl = (id) => `${WEB}/album/${id}`;

async function getJson(url) {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
    const text = await res.text();
    log(`GET ${url} → ${res.status}, ${text.length} байт`);
    if (!res.ok) { log('  тело:', text.slice(0, 300)); return null; }
    try { return JSON.parse(text); } catch { log('  не JSON:', text.slice(0, 200)); return null; }
  } catch (e) {
    log(`GET ${url} → ошибка: ${e.message}`);
    return null;
  }
}

// Ищем по всему ответу ключи, похожие на «предстоящий релиз»
function scanKeys(obj, path = '', hits = [], depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 6) return hits;
  for (const [k, v] of Object.entries(obj)) {
    const p = path ? `${path}.${k}` : k;
    if (/upcoming|presave|pre_save|future|soon|announce|preorder/i.test(k)) hits.push(p);
    if (v && typeof v === 'object') scanKeys(v, p, hits, depth + 1);
  }
  return hits;
}

function normAlbum(a) {
  if (!a || !a.id || !a.title) return null;
  return {
    id: a.id,
    title: a.version ? `${a.title} (${a.version})` : a.title,
    year: a.year || (a.releaseDate ? new Date(a.releaseDate).getFullYear() : null),
    type: a.type === 'single' ? 'single' : a.metaType === 'single' ? 'single' : (a.trackCount === 1 ? 'single' : a.type || 'album'),
    artists: names(a.artists),
    cover: cover(a.coverUri || a.ogImage),
    url: albumUrl(a.id),
    releaseDate: a.releaseDate || null,
    available: a.available !== false,
  };
}

function normTrack(t) {
  if (!t || !t.title) return null;
  const alb = (t.albums || [])[0];
  return {
    title: t.version ? `${t.title} (${t.version})` : t.title,
    artists: names(t.artists),
    url: alb ? `${WEB}/album/${alb.id}/track/${t.id}` : `${WEB}/track/${t.id}`,
    cover: cover(t.coverUri || alb?.coverUri),
  };
}

function keepPrevious(reason) {
  log(`Яндекс не дал данных (${reason}).`);
  if (existsSync(OUT)) {
    log('Оставляю предыдущий public/yandex.json.');
    return;
  }
  writeFileSync(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), source: 'none' }, null, 2));
  log('Записан пустой public/yandex.json (source: none).');
}

async function main() {
  mkdirSync(dirname(OUT), { recursive: true });
  const now = Date.now();

  const brief = await getJson(`${API}/artists/${ARTIST_ID}/brief-info`);
  const direct = await getJson(`${API}/artists/${ARTIST_ID}/direct-albums?page=0&page-size=100&sort-by=year`);
  const b = brief?.result;
  const d = direct?.result;

  if (b) {
    log('brief-info: ключи', Object.keys(b).join(', '));
    log('brief-info: артист', b.artist?.name, '| albums', b.albums?.length, '| alsoAlbums', b.alsoAlbums?.length, '| popularTracks', b.popularTracks?.length);
    const hits = scanKeys(b);
    if (hits.length) log('brief-info: похожие на анонс поля:', hits.join(', '));
  }
  if (d) log('direct-albums: ключи', Object.keys(d).join(', '), '| albums', d.albums?.length);

  // Альбомы из всех источников без повторов
  const raw = [...(d?.albums || []), ...(b?.albums || []), ...(b?.alsoAlbums || [])];
  const byId = new Map();
  for (const a of raw) if (a?.id && !byId.has(a.id)) byId.set(a.id, a);

  // Явные поля анонса, если Яндекс их отдаёт
  const explicit = [b?.upcomingAlbums, b?.upcoming, b?.presaveAlbums, b?.futureAlbums].flat().filter(Boolean);
  for (const a of explicit) if (a?.id && !byId.has(a.id)) byId.set(a.id, a);

  if (DEBUG) {
    for (const a of byId.values()) {
      log(`  альбом ${a.id}: «${a.title}» year=${a.year} releaseDate=${a.releaseDate} type=${a.type} metaType=${a.metaType} available=${a.available} tracks=${a.trackCount}`);
    }
  }

  const albums = [...byId.values()].map(normAlbum).filter(Boolean);
  if (!albums.length && !b?.popularTracks?.length) return keepPrevious('нет альбомов и треков');

  // Предстоящий релиз: дата выхода в будущем (или альбом ещё недоступен и явно помечен как анонс)
  const isFuture = (a) => a.releaseDate && new Date(a.releaseDate).getTime() > now;
  const future = albums.filter(isFuture).sort((x, y) => new Date(x.releaseDate) - new Date(y.releaseDate));
  const explicitIds = new Set(explicit.map((a) => a?.id));
  const upcomingAlbum = future[0] || albums.find((a) => explicitIds.has(a.id)) || null;

  const releases = albums
    .filter((a) => a !== upcomingAlbum && !isFuture(a))
    .sort((x, y) => new Date(y.releaseDate || `${y.year}-01-01`) - new Date(x.releaseDate || `${x.year}-01-01`))
    .map(({ available, ...rest }) => rest);

  const popular = (b?.popularTracks || []).map(normTrack).filter(Boolean).slice(0, 10);

  const data = {
    updatedAt: new Date().toISOString(),
    source: 'yandex',
    artist: b?.artist ? { name: b.artist.name, cover: cover(b.artist.cover?.uri, '1000x1000') } : null,
    upcoming: upcomingAlbum
      ? { title: upcomingAlbum.title, artists: upcomingAlbum.artists, releaseDate: upcomingAlbum.releaseDate, cover: upcomingAlbum.cover, url: upcomingAlbum.url }
      : null,
    releases,
    popular,
  };
  writeFileSync(OUT, JSON.stringify(data, null, 2));
  log(`Готово: релизов ${releases.length}, популярных ${popular.length}, анонс: ${data.upcoming ? `«${data.upcoming.title}» ${data.upcoming.releaseDate}` : 'нет'}`);
  log('Первые релизы:', releases.slice(0, 5).map((r) => `«${r.title}» ${r.year}`).join('; '));

  // Проверка, что обложки можно показывать на чужом сайте
  const sample = data.upcoming?.cover || releases[0]?.cover;
  if (sample) {
    try {
      const res = await fetch(sample, { method: 'HEAD', headers: { Referer: 'https://matbank40.github.io/' }, signal: AbortSignal.timeout(15000) });
      log(`Обложка ${sample} → ${res.status}, ${res.headers.get('content-type')}, CORP=${res.headers.get('cross-origin-resource-policy')}, ACAO=${res.headers.get('access-control-allow-origin')}`);
    } catch (e) {
      log('Проверка обложки не удалась:', e.message);
    }
  }
}

try {
  await main();
} catch (e) {
  log('Неожиданная ошибка:', e.stack || e.message);
  try { keepPrevious('исключение'); } catch { /* нечего делать */ }
}
process.exit(0);
