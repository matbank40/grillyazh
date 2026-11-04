// Временная разведка: какие источники метаданных доступны с раннера GitHub.
const H = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'Accept-Language': 'ru-RU,ru;q=0.9' };
const urls = [
  'https://music.yandex.ru/artist/16514152',
  'https://music.yandex.ru/handlers/artist.jsx?artist=16514152&what=albums&lang=ru&external-domain=music.yandex.ru',
  'https://music.yandex.kz/handlers/artist.jsx?artist=16514152&what=albums&lang=ru&external-domain=music.yandex.kz',
  'https://music.yandex.by/handlers/artist.jsx?artist=16514152&what=albums&lang=ru&external-domain=music.yandex.by',
  'https://music.yandex.com/handlers/artist.jsx?artist=16514152&what=albums&lang=en&external-domain=music.yandex.com',
  'https://api.music.yandex.ru/artists/16514152/brief-info',
  'https://itunes.apple.com/search?term=grillyazh&entity=album&country=ru&limit=50',
  'https://itunes.apple.com/search?term=grillyazh&entity=song&country=ru&limit=50',
  'https://api.deezer.com/search/artist?q=grillyazh',
];
for (const u of urls) {
  try {
    const r = await fetch(u, { headers: H, redirect: 'manual', signal: AbortSignal.timeout(20000) });
    const t = await r.text();
    console.log(`\n=== ${u}\n${r.status} ${r.headers.get('location') || ''} ${t.length}b\n${t.slice(0, 700).replace(/\s+/g, ' ')}`);
  } catch (e) { console.log(`\n=== ${u}\nERR ${e.message}`); }
}
