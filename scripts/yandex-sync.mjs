// Синхронизация метаданных релизов (только описания, без аудио).
// Запускается в GitHub Actions перед сборкой и пишет public/yandex.json.
//
// Источники по очереди:
//   1. Яндекс Музыка (API и web-handlers на нескольких доменах). С серверов GitHub
//      в США Яндекс обычно отвечает 451 — тогда переходим дальше.
//   2. Apple Music / iTunes Search API — открыт отовсюду, отдаёт релизы с датами
//      и обложками 1000×1000, включая будущие (предзаказ).
// Скрипт никогда не роняет сборку: при любой проблеме сайт собирается с данными из src/data.js.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const ARTIST_ID = 16514152;
const ARTIST_NAME = 'GRILLYAZH';
const OUT = resolve(process.cwd(), 'public/yandex.json');
const YA_ARTIST_URL = `https://music.yandex.ru/artist/${ARTIST_ID}`;
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept-Language': 'ru-RU,ru;q=0.9',
};
const DEBUG = process.env.YANDEX_DEBUG === '1';

const log = (...a) => console.log('[sync]', ...a);
const names = (artists) => (artists || []).map((a) => a.name).filter(Boolean).join(', ');

async function getJson(url) {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
    const text = await res.text();
    log(`GET ${url} → ${res.status}, ${text.length} байт`);
    if (!res.ok) { if (DEBUG) log('  тело:', text.slice(0, 200)); return null; }
    try { return JSON.parse(text); } catch { log('  не JSON:', text.slice(0, 160).replace(/\s+/g, ' ')); return null; }
  } catch (e) {
    log(`GET ${url} → ошибка: ${e.message}`);
    return null;
  }
}

// ---------- Яндекс ----------
const yaCover = (uri, size = '1000x1000') => (uri ? `https://${String(uri).replace('%%', size)}` : null);

function yaAlbum(a) {
  if (!a?.id || !a.title) return null;
  return {
    id: String(a.id),
    title: a.version ? `${a.title} (${a.version})` : a.title,
    year: a.year || (a.releaseDate ? new Date(a.releaseDate).getFullYear() : null),
    type: a.type === 'single' || a.metaType === 'single' || a.trackCount === 1 ? 'single' : 'album',
    artists: names(a.artists),
    cover: yaCover(a.coverUri),
    url: `https://music.yandex.ru/album/${a.id}`,
    releaseDate: a.releaseDate || null,
  };
}

function yaTrack(t) {
  if (!t?.title) return null;
  const alb = (t.albums || [])[0];
  return {
    title: t.version ? `${t.title} (${t.version})` : t.title,
    artists: names(t.artists),
    url: alb ? `https://music.yandex.ru/album/${alb.id}/track/${t.id}` : `https://music.yandex.ru/track/${t.id}`,
    cover: yaCover(t.coverUri || alb?.coverUri),
  };
}

async function fromYandex() {
  const tries = [
    async () => {
      const b = (await getJson(`https://api.music.yandex.net/artists/${ARTIST_ID}/brief-info`))?.result;
      const d = (await getJson(`https://api.music.yandex.net/artists/${ARTIST_ID}/direct-albums?page=0&page-size=100&sort-by=year`))?.result;
      if (!b && !d) return null;
      const extra = [b?.upcomingAlbums, b?.upcoming, b?.presaveAlbums, b?.futureAlbums].flat().filter(Boolean);
      return { albums: [...(d?.albums || []), ...(b?.albums || []), ...(b?.alsoAlbums || []), ...extra], tracks: b?.popularTracks || [] };
    },
    ...['ru', 'by', 'kz', 'uz'].map((tld) => async () => {
      const host = `music.yandex.${tld}`;
      const j = await getJson(`https://${host}/handlers/artist.jsx?artist=${ARTIST_ID}&what=albums&lang=ru&external-domain=${host}&overembed=false`);
      if (!j?.albums) return null;
      return { albums: [...(j.albums || []), ...(j.alsoAlbums || [])], tracks: j.tracks || [] };
    }),
  ];
  for (const t of tries) {
    const r = await t();
    if (r && (r.albums.length || r.tracks.length)) {
      const seen = new Set();
      const albums = r.albums.map(yaAlbum).filter((a) => a && !seen.has(a.id) && seen.add(a.id));
      return { source: 'yandex', albums, popular: r.tracks.map(yaTrack).filter(Boolean).slice(0, 10) };
    }
  }
  return null;
}

// ---------- Веб-страница Яндекс Музыки (SSR) ----------
// API отвечает 451 за пределами СНГ, а страница артиста отдаётся с данными внутри HTML.
async function fetchText(url) {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
    const text = await res.text();
    log(`GET ${url} → ${res.status}, ${text.length} байт`);
    return res.ok ? text : null;
  } catch (e) {
    log(`GET ${url} → ошибка: ${e.message}`);
    return null;
  }
}

// Next.js кладёт данные в self.__next_f.push([1,"..."]) — склеиваем и раскодируем
function nextPayload(html) {
  let out = '';
  const re = /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g;
  let m;
  while ((m = re.exec(html))) {
    try { out += JSON.parse(m[1]); } catch { /* пропускаем битый кусок */ }
  }
  return out;
}

async function webDiagnostics() {
  const html = await fetchText(YA_ARTIST_URL);
  if (!html) return null;
  const payload = nextPayload(html);
  log(`страница: html ${html.length}, payload ${payload.length}`);
  const text = payload || html;
  for (const needle of ['сжечь', 'presave', 'preSave', 'upcoming', 'Upcoming', 'releaseDate', 'Предстоящ', '"albums"', 'Алиби', 'АЛИБИ']) {
    const i = text.indexOf(needle);
    log(`  «${needle}»: ${i < 0 ? 'нет' : `позиция ${i}, всего ${text.split(needle).length - 1}`}`);
    if (i >= 0) log(`    …${text.slice(Math.max(0, i - 500), i + 700).replace(/\s+/g, ' ')}…`);
  }
  return { html, payload };
}

// ---------- Apple Music (iTunes Search API) ----------
const itCover = (url) => (url ? url.replace(/\/\d+x\d+bb\./, '/1000x1000bb.') : null);
const isOurs = (artistName) => new RegExp(ARTIST_NAME, 'i').test(artistName || '');

async function fromItunes() {
  const albumsRes = await getJson(`https://itunes.apple.com/search?term=${ARTIST_NAME}&entity=album&country=ru&lang=ru_ru&limit=200`);
  const songsRes = await getJson(`https://itunes.apple.com/search?term=${ARTIST_NAME}&entity=song&country=ru&lang=ru_ru&limit=200`);
  // lookup по id артиста видит и релизы, которые ещё не вышли (предзаказ)
  const artistId = (albumsRes?.results || []).find((a) => /^grillyazh$/i.test(a.artistName))?.artistId;
  const lookup = artistId
    ? await getJson(`https://itunes.apple.com/lookup?id=${artistId}&entity=album&country=ru&lang=ru_ru&limit=200&sort=recent`)
    : null;
  const albumsRaw = [...(lookup?.results || []), ...(albumsRes?.results || [])]
    .filter((a) => a.wrapperType === 'collection' && isOurs(a.artistName));
  const songsRaw = (songsRes?.results || []).filter((s) => isOurs(s.artistName));
  if (!albumsRaw.length && !songsRaw.length) return null;

  const clean = (name) => String(name).replace(/\s+-\s+(Single|EP)$/i, '');
  const seen = new Set();
  const albums = albumsRaw
    .map((a) => ({
      id: `it${a.collectionId}`,
      // Apple дописывает « - Single» / « - EP» к названию
      title: clean(a.collectionName),
      year: a.releaseDate ? new Date(a.releaseDate).getFullYear() : null,
      type: /single/i.test(a.collectionName) || a.trackCount === 1 ? 'single' : 'album',
      artists: a.artistName,
      cover: itCover(a.artworkUrl100),
      // ссылка ведёт на поиск этого релиза в Яндекс Музыке
      url: `https://music.yandex.ru/search?text=${encodeURIComponent(`${a.artistName} ${clean(a.collectionName)}`)}`,
      appleUrl: a.collectionViewUrl,
      releaseDate: a.releaseDate || null,
    }))
    .filter((a) => {
      const key = a.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  const popular = songsRaw.slice(0, 10).map((s) => ({
    title: s.trackName,
    artists: s.artistName,
    url: `https://music.yandex.ru/search?text=${encodeURIComponent(`${s.artistName} ${s.trackName}`)}`,
    cover: itCover(s.artworkUrl100),
  }));
  return { source: 'apple', albums, popular };
}

// ---------- Deezer: часто знает о релизах заранее ----------
async function deezerUpcoming() {
  const found = await getJson(`https://api.deezer.com/search/artist?q=${ARTIST_NAME}`);
  const artist = (found?.data || []).find((a) => /^grillyazh$/i.test(a.name));
  if (!artist) return [];
  const res = await getJson(`https://api.deezer.com/artist/${artist.id}/albums?limit=100`);
  const list = res?.data || [];
  if (DEBUG) log(`deezer: альбомов ${list.length}, свежие: ${list.slice(0, 5).map((a) => `«${a.title}» ${a.release_date}`).join('; ')}`);
  return list.map((a) => ({
    id: `dz${a.id}`,
    title: a.title,
    year: a.release_date ? Number(a.release_date.slice(0, 4)) : null,
    type: a.record_type === 'single' ? 'single' : 'album',
    artists: ARTIST_NAME,
    cover: a.cover_xl || a.cover_big || null,
    url: `https://music.yandex.ru/search?text=${encodeURIComponent(`${ARTIST_NAME} ${a.title}`)}`,
    releaseDate: a.release_date ? `${a.release_date}T00:00:00+03:00` : null,
  }));
}

// ---------- Сборка результата ----------
function build({ source, albums, popular }) {
  const now = Date.now();
  const isFuture = (a) => a.releaseDate && new Date(a.releaseDate).getTime() > now;
  const future = albums.filter(isFuture).sort((x, y) => new Date(x.releaseDate) - new Date(y.releaseDate));
  const up = future[0] || null;
  const releases = albums
    .filter((a) => !isFuture(a))
    .sort((x, y) => new Date(y.releaseDate || `${y.year}-01-01`) - new Date(x.releaseDate || `${x.year}-01-01`));
  return {
    updatedAt: new Date().toISOString(),
    source,
    artistUrl: YA_ARTIST_URL,
    upcoming: up ? { title: up.title, artists: up.artists, releaseDate: up.releaseDate, cover: up.cover, url: up.url } : null,
    releases,
    popular,
  };
}

async function checkCover(url) {
  if (!url) return;
  try {
    const res = await fetch(url, { method: 'HEAD', headers: { Referer: 'https://matbank40.github.io/' }, signal: AbortSignal.timeout(8000) });
    log(`Обложка ${url} → ${res.status} ${res.headers.get('content-type')}, CORP=${res.headers.get('cross-origin-resource-policy')}, ACAO=${res.headers.get('access-control-allow-origin')}`);
  } catch (e) {
    log('Проверка обложки не удалась:', e.message);
  }
}

async function main() {
  mkdirSync(dirname(OUT), { recursive: true });
  if (DEBUG) await webDiagnostics();
  const raw = (await fromYandex()) || (await fromItunes());
  // Анонсы с Deezer добавляем, если такого названия ещё нет
  if (raw && raw.source !== 'yandex') {
    const known = new Set(raw.albums.map((x) => x.title.toLowerCase()));
    for (const d of await deezerUpcoming()) {
      if (!known.has(d.title.toLowerCase())) { raw.albums.push(d); known.add(d.title.toLowerCase()); }
    }
  }
  if (!raw || (!raw.albums.length && !raw.popular.length)) {
    if (existsSync(OUT)) { log('Источники недоступны, оставляю предыдущий public/yandex.json'); return; }
    writeFileSync(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), source: 'none' }, null, 2));
    log('Источники недоступны, записан пустой public/yandex.json (source: none) — сайт возьмёт данные из src/data.js');
    return;
  }
  const data = build(raw);
  writeFileSync(OUT, JSON.stringify(data, null, 2));
  log(`Источник: ${data.source}. Релизов: ${data.releases.length}, популярных: ${data.popular.length}`);
  log(`Анонс: ${data.upcoming ? `«${data.upcoming.title}» — ${data.upcoming.releaseDate}` : 'нет'}`);
  for (const r of data.releases) log(`  ${r.releaseDate?.slice(0, 10) || r.year} · ${r.type} · «${r.title}» · ${r.artists}`);
  if (DEBUG) for (const p of data.popular) log(`  ♪ ${p.title} — ${p.artists}`);
  await checkCover(data.upcoming?.cover || data.releases[0]?.cover);
}

// Общий дедлайн: синк не должен задерживать деплой
const deadline = setTimeout(() => {
  log('Дедлайн 60 с — завершаю синк, сайт соберётся с прежними данными');
  if (!existsSync(OUT)) writeFileSync(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), source: 'none' }, null, 2));
  clearTimeout(deadline);
process.exit(0);
}, 60000);

try {
  await main();
} catch (e) {
  log('Неожиданная ошибка:', e.stack || e.message);
  if (!existsSync(OUT)) writeFileSync(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), source: 'none' }, null, 2));
}
clearTimeout(deadline);
process.exit(0);
