import './style.css';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { releases as baseReleases, upcoming as baseUpcoming, hits, concerts, gallery, socials, manager, links, photo, asset } from './data.js';
import { createHeroFx } from './heat.js';
import { createBurn } from './burn.js';
import { createPlayer } from './audio.js';

gsap.registerPlugin(ScrollTrigger);

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const range = (p, a, b) => clamp01((p - a) / (b - a));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pad2 = (n) => String(n).padStart(2, '0');
// обложка: из Яндекса приходит полный адрес, из data.js — имя файла
const cover = (c) => (/^https?:/.test(c || '') ? c : photo(c || 'cover-upcoming'));
const norm = (t) => String(t || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, ' ').trim();

$('.year').textContent = new Date().getFullYear();

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>';

// Дата по Москве, независимо от часового пояса посетителя
function msk(iso) {
  const d = new Date(new Date(iso).getTime() + 3 * 3600e3);
  return { day: d.getUTCDate(), month: d.getUTCMonth(), weekday: d.getUTCDay(), time: `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}` };
}

// =====================================================================
// Данные: свежие с Яндекс Музыки (их кладёт сборка на GitHub), иначе — из data.js
// =====================================================================
async function loadYandex() {
  try {
    const r = await fetch(asset('yandex.json'), { cache: 'no-cache' });
    if (!r.ok) return null;
    const j = await r.json();
    // Яндекс закрыт для серверов GitHub, поэтому сборка берёт данные из Apple Music и Deezer
    return j && ['yandex', 'apple', 'deezer'].includes(j.source) && j.releases?.length ? j : null;
  } catch { return null; }
}

function mergeData(y) {
  const now = Date.now();
  const yReleases = (y?.releases || []).filter((r) => r.title);
  const TYPES = { single: 'Сингл', album: 'Альбом', ep: 'EP' };
  // в дискографии — восемь самых свежих релизов, остальное по ссылке «Вся музыка»
  const releases = yReleases.length
    ? yReleases
      .slice()
      .sort((a, b) => new Date(b.releaseDate || `${b.year}-01-01`) - new Date(a.releaseDate || `${a.year}-01-01`))
      .slice(0, 8)
      .map((r) => ({ ...r, type: TYPES[r.type] || r.type || 'Релиз', artists: r.artists || 'GRILLYAZH' }))
    : baseReleases;
  // предстоящий релиз; если его нет — показываем самый свежий вышедший
  let rel = y?.upcoming || null;
  if (!rel && new Date(baseUpcoming.releaseDate).getTime() > now - 21 * 864e5) rel = baseUpcoming;
  if (!rel && yReleases[0]) rel = yReleases[0];
  if (!rel) rel = baseUpcoming;
  const isOut = !rel.releaseDate || new Date(rel.releaseDate).getTime() <= now;
  // обложки хитов подтягиваем из Яндекса, если там есть такой релиз
  const tracks = hits.map((h) => {
    const m = yReleases.find((r) => norm(r.title) === norm(h.title));
    return { ...h, cover: m?.cover || h.cover, url: h.url || m?.url || links.yandex };
  });
  return { releases, rel: { ...rel, url: rel.url || links.yandex }, isOut, tracks };
}

// =====================================================================
// Разметка
// =====================================================================
const upcomingConcerts = () => concerts.filter((c) => new Date(c.date).getTime() + 6 * 3600e3 > Date.now()).sort((a, b) => new Date(a.date) - new Date(b.date));

function renderRelease({ rel, isOut }) {
  const words = rel.title.trim().split(/\s+/);
  const last = words.length > 1 ? words.pop() : '';
  $('[data-release-a]').textContent = words.join(' ');
  $('[data-release-b]').textContent = last.toLowerCase();
  $('[data-release-kicker]').textContent = isOut ? 'Новый релиз' : 'Предстоящий релиз';
  const img = $('[data-release-img]');
  img.src = cover(rel.cover);
  img.alt = `Обложка: ${rel.title}`;
  const p = rel.releaseDate ? msk(rel.releaseDate) : null;
  $('[data-release-date]').textContent = isOut ? 'Уже вышел' : `${p.day} ${MONTHS[p.month]}`;
  $('[data-release-name]').textContent = `«${rel.title}»`;
  $('[data-release-when]').textContent = isOut ? 'Новый релиз' : 'Выходит';
  const cta = $('[data-release-cta]');
  cta.href = rel.url;
  cta.textContent = isOut ? 'Слушать на Яндекс Музыке ↗' : 'Пресейв на Яндекс Музыке ↗';
  if (isOut) $('[data-countdown]').remove();
  else {
    $('[data-countdown]').innerHTML = ['дней', 'часов', 'минут', 'секунд'].map((u, i) => `<div><b data-u="${i}">00</b><small>${u}</small></div>`).join('');
    const target = new Date(rel.releaseDate).getTime();
    const tick = () => {
      let t = Math.max(0, Math.floor((target - Date.now()) / 1000));
      const parts = [Math.floor(t / 86400), Math.floor((t %= 86400) / 3600), Math.floor((t %= 3600) / 60), t % 60];
      parts.forEach((v, i) => { $(`[data-u="${i}"]`).textContent = pad2(v); });
    };
    tick();
    setInterval(tick, 1000);
  }
  // карточка на первом экране и подпись на входе
  const when = isOut ? 'Новый релиз' : `${p.day} ${MONTHS[p.month]} — новый релиз`;
  $('[data-hero-release]').innerHTML = `
    <a class="hero__card" href="${esc(rel.url)}" target="_blank" rel="noopener">
      <img src="${cover(rel.cover)}" alt="" />
      <span><small>${when}</small><b>${esc(rel.title)}</b><span class="arr-link">${isOut ? 'Слушать' : 'Пресейв'} ↗</span></span>
    </a>`;
  $('[data-gate-note]').textContent = isOut ? `Новый релиз «${rel.title}»` : `Новый релиз «${rel.title}» — ${p.day} ${MONTHS[p.month]}`;
  // напоминание в календарь (.ics) — для тех, кто не залогинен в Яндексе
  const remind = $('[data-remind]');
  if (isOut) remind.remove();
  else {
    remind.addEventListener('click', () => {
      const start = new Date(rel.releaseDate);
      const stamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      const ics = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GRILLYAZH//site//RU', 'BEGIN:VEVENT',
        `UID:${start.getTime()}@grillyazh`, `DTSTAMP:${stamp(new Date())}`,
        `DTSTART:${stamp(start)}`, `DTEND:${stamp(new Date(start.getTime() + 3600e3))}`,
        `SUMMARY:GRILLYAZH — «${rel.title}» вышел`, `DESCRIPTION:Слушать: ${rel.url}`, `URL:${rel.url}`,
        'BEGIN:VALARM', 'TRIGGER:PT9H', 'ACTION:DISPLAY', 'DESCRIPTION:Новый релиз GRILLYAZH', 'END:VALARM',
        'END:VEVENT', 'END:VCALENDAR',
      ].join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
      a.download = 'grillyazh-release.ics';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
  }
}

function renderHits(tracks) {
  $('[data-hit-bgs]').innerHTML = tracks.map((t, i) => `<img src="${photo(t.photo)}" alt="" ${i === 0 ? 'class="on"' : ''} loading="${i ? 'lazy' : 'eager'}" />`).join('');
  $('[data-hits]').innerHTML = tracks.map((t, i) => `
    <article class="hit${i === 0 ? ' on' : ''}" data-i="${i}">
      <img class="hit__cover" src="${cover(t.cover)}" alt="Обложка: ${esc(t.title)}" loading="lazy" />
      <div>
        <p class="label hit__meta">${t.year} · сингл</p>
        <h3 class="hit__title"><span class="line"><span>${esc(t.title)}</span></span></h3>
        <p class="hit__artists">${esc(t.artists)}</p>
      </div>
      <a class="btn btn--ghost hit__go" href="${esc(t.url)}" target="_blank" rel="noopener">Слушать полностью ↗</a>
    </article>`).join('');
  $('[data-hit-steps]').innerHTML = tracks.map(() => '<span><i></i></span>').join('');
}

function renderMusic(releases) {
  $('[data-releases]').innerHTML = releases.map((r, i) => `
    <li><a class="track rv" href="${esc(r.url || links.yandex)}" target="_blank" rel="noopener" data-i="${i}">
      <img class="track__thumb" src="${cover(r.cover)}" alt="" loading="lazy" />
      <span>
        <h3 class="track__title">${esc(r.title)}</h3>
        <p class="track__meta">${esc(r.type)} · ${esc(r.year)} · ${esc(r.artists)}</p>
      </span>
      <span class="track__go" aria-hidden="true">${PLAY}</span>
    </a></li>`).join('');
  $('[data-covers]').innerHTML = releases.map((r, i) => `<img src="${cover(r.cover)}" alt="" data-i="${i}" ${i === 0 ? 'class="is-on"' : ''} loading="lazy" />`).join('');
}

function gigRow(c, isPast) {
  const p = msk(c.date);
  const action = isPast
    ? '<span class="label">Прошёл</span>'
    : `<a class="btn btn--light" href="${esc(c.url)}" target="_blank" rel="noopener">Билеты</a>`;
  return `
    <article class="gig rv${isPast ? ' gig--past' : ''}">
      <span class="gig__date">${pad2(p.day)}.${pad2(p.month + 1)}</span>
      <h3 class="gig__city">${esc(c.city)}</h3>
      <p class="gig__venue">${esc(c.venue)} · ${WEEKDAYS[p.weekday]}, ${p.time}${c.tags?.length ? ` · ${c.tags.map(esc).join(', ')}` : ''}</p>
      ${action}
    </article>`;
}

function renderTour() {
  const up = upcomingConcerts();
  const past = concerts.filter((c) => !up.includes(c)).sort((a, b) => new Date(b.date) - new Date(a.date));
  if (up.length) {
    $('[data-upcoming]').innerHTML = `<div class="gigs"><p class="label gigs__title">Ближайшие</p>${up.map((c) => gigRow(c, false)).join('')}</div>`;
  } else {
    const word = '<span>Новые даты</span><span>скоро</span>';
    $('[data-upcoming]').innerHTML = `
      <div class="soon">
        <a class="soon__marquee" href="${links.telegram}" target="_blank" rel="noopener" aria-label="Новые даты — скоро. Telegram-канал"><div class="soon__track" aria-hidden="true">${word.repeat(6)}</div></a>
        <div class="soon__row rv">
          <p>Анонсы и старт продаж — первыми в Telegram-канале.</p>
          <a class="btn btn--light btn--lg" href="${links.telegram}" target="_blank" rel="noopener">Подписаться ↗</a>
        </div>
      </div>`;
  }
  if (past.length) $('[data-past]').innerHTML = `<div class="gigs"><p class="label gigs__title">Прошедшие</p>${past.map((c) => gigRow(c, true)).join('')}</div>`;
}

function renderPhotos() {
  const cols = [[], [], []];
  gallery.forEach((g, i) => cols[i % 3].push({ ...g, i }));
  $('[data-cols]').innerHTML = cols.map((col) => `
    <div class="col">${col.map((g) => `
      <figure class="ph" data-i="${g.i}" role="button" tabindex="0" aria-label="Открыть фото: ${esc(g.alt)}">
        <div class="ph__frame" style="aspect-ratio:${g.ratio}"><img src="${photo(g.name)}" alt="${esc(g.alt)}" loading="lazy" /></div>
        <figcaption class="label">${esc(g.caption)}</figcaption>
      </figure>`).join('')}
    </div>`).join('');
}

function renderSocials() {
  const rows = [...socials, { label: 'Менеджер', handle: manager.handle, url: manager.url }];
  $('[data-socials]').innerHTML = rows.map((s) => `
    <li class="rv"><a href="${esc(s.url)}" target="_blank" rel="noopener">
      <span class="socials__name">${esc(s.label)}</span><span class="socials__handle">${esc(s.handle)} ↗</span>
    </a></li>`).join('');
  $('[data-menu-socials]').innerHTML = rows.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join('');
}

function splitChars(el) {
  el.innerHTML = [...el.textContent].map((ch, i) => `<span class="ch" style="--i:${i}">${ch}</span>`).join('');
  return $$('.ch', el);
}

// Слово на всю ширину строки: подбираем размер шрифта
function fitWords() {
  [$('.hero__letters'), $('.footer__word')].forEach((el) => {
    el.style.setProperty('--fit', '100px');
    el.style.justifyContent = 'flex-start';
    const w = [...el.children].reduce((sum, c) => sum + c.getBoundingClientRect().width, 0);
    el.style.justifyContent = '';
    el.style.setProperty('--fit', `${Math.floor((el.clientWidth / w) * 100 * 0.995)}px`);
  });
  $('.hero').style.setProperty('--word-h', `${$('.hero__word').offsetHeight}px`);
}

// =====================================================================
// Запуск
// =====================================================================
const loader = $('.loader');
const fx = reduceMotion ? null : createHeroFx($('.hero__canvas'), photo('stage-dive'), [0.62, 0.42]);
fx?.ready.then(() => $('.hero').classList.add('has-gl')).catch(() => {});

const lenis = reduceMotion ? null : new Lenis({ lerp: 0.085, wheelMultiplier: 0.95 });
if (lenis) {
  lenis.stop();
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

const data = mergeData(await Promise.race([loadYandex(), new Promise((r) => setTimeout(() => r(null), 1800))]));
renderRelease(data);
renderHits(data.tracks);
renderMusic(data.releases);
renderTour();
renderPhotos();
renderSocials();
const heroChars = splitChars($('.hero__letters'));
splitChars($('.footer__word'));

// =====================================================================
// Звук
// =====================================================================
const player = createPlayer(data.tracks.map((t) => ({ src: asset(t.audio) })));
const playerEl = $('.player');
let wantTrack = 0;

function soundOn() {
  player.unlock();
  document.documentElement.classList.add('sound-on');
  player.play(wantTrack, { fade: 2.2 });
}
player.on('change', (i) => {
  const t = data.tracks[i];
  $('[data-player-title]').textContent = t.title;
  $('[data-player-artists]').textContent = t.artists;
  $('[data-player-cover]').src = cover(t.cover);
  $('[data-player-link]').href = t.url;
});
player.on('state', (on) => {
  playerEl.classList.toggle('is-playing', on);
  $('[data-player-toggle]').setAttribute('aria-label', on ? 'Пауза' : 'Играть');
});
$('[data-player-toggle]').addEventListener('click', () => {
  if (!player.unlocked) soundOn();
  else if (player.playing) player.pause();
  else player.play(wantTrack, { fade: 0.6 });
});
$('[data-sound-chip]').addEventListener('click', soundOn);
{
  const t = data.tracks[0];
  $('[data-player-title]').textContent = t.title;
  $('[data-player-artists]').textContent = t.artists;
  $('[data-player-cover]').src = cover(t.cover);
}

// какой трек должен играть в этой точке страницы
function setTrack(i) {
  if (i === wantTrack) return;
  wantTrack = i;
  if (player.unlocked && player.playing) player.play(i);
}

// визуал в такт: бас качает фото, обложки, эквалайзер
const eqBars = $$('.player__eq i');
const hitsPin = $('.hits__pin');
const progressEl = $('[data-player-progress]');
gsap.ticker.add(() => {
  const { bass, level } = player.levels();
  if (fx) fx.state.beat = bass;
  if (burn) burn.state.beat = bass;
  hitsPin.style.setProperty('--beat', bass.toFixed(3));
  eqBars.forEach((b, i) => b.style.setProperty('--h', Math.min(1, (i % 2 ? level * 1.6 : bass) * (0.7 + 0.3 * Math.sin(performance.now() / (140 + i * 50)))).toFixed(2)));
  progressEl.style.setProperty('--p', player.progress().toFixed(4));
});

// =====================================================================
// Навигация
// =====================================================================
const scrollPos = () => (lenis ? lenis.scroll : scrollY);
function scrollToTarget(hash) {
  const el = hash === '#top' ? 0 : $(hash);
  if (el === null) return;
  if (lenis) lenis.scrollTo(el, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else if (el === 0) window.scrollTo({ top: 0, behavior: 'smooth' });
  else el.scrollIntoView({ behavior: 'smooth' });
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-scroll]');
  if (!a) return;
  e.preventDefault();
  setMenu(false);
  scrollToTarget(a.getAttribute('href'));
});

const nav = $('.nav');
const menuBtn = $('.nav__menu');
function setMenu(open) {
  document.documentElement.classList.toggle('menu-open', open);
  menuBtn.setAttribute('aria-expanded', open);
  menuBtn.textContent = open ? 'Закрыть' : 'Меню';
  $('.menu').setAttribute('aria-hidden', !open);
  if (lenis) open ? lenis.stop() : lenis.start();
}
menuBtn.addEventListener('click', () => setMenu(!document.documentElement.classList.contains('menu-open')));
addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

let lastY = 0;
let entered = false;
function onScroll() {
  const y = scrollPos();
  const menuOpen = document.documentElement.classList.contains('menu-open');
  nav.style.setProperty('--navbg', y > 60 ? 1 : 0);
  nav.classList.toggle('is-hidden', !menuOpen && y > lastY + 2 && y > innerHeight);
  if (y < lastY - 2) nav.classList.remove('is-hidden');
  lastY = y;
  // до экрана хитов играет первый трек, после — последний
  const hr = $('.hits').getBoundingClientRect();
  if (hr.top > 0) setTrack(0);
  else if (hr.bottom < innerHeight) setTrack(data.tracks.length - 1);
  const nearFooter = $('.footer').getBoundingClientRect().top < innerHeight * 0.75;
  if (entered) playerEl.classList.toggle('show', y > innerHeight * 0.4 && !nearFooter);
}
if (lenis) lenis.on('scroll', onScroll);
else addEventListener('scroll', onScroll, { passive: true });

$$('.nav__links a').forEach((a) => {
  const sec = $(a.getAttribute('href'));
  if (sec) ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', onToggle: (s) => a.classList.toggle('is-active', s.isActive) });
});

// =====================================================================
// Сцены
// =====================================================================
function initHeroScroll() {
  if (reduceMotion) return;
  ScrollTrigger.create({
    trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true,
    onUpdate: (s) => {
      if (fx) fx.state.scroll = s.progress;
      $('.hero__word').style.transform = `translate3d(0, ${s.progress * 18}vh, 0)`;
      $('.hero__release').style.opacity = 1 - range(s.progress, 0, 0.5);
      $('.hero__hello').style.opacity = 1 - range(s.progress, 0, 0.4);
    },
    onToggle: (s) => (s.isActive ? fx?.start() : fx?.stop()),
  });
}

// Релиз: обложка сгорает, под ней дата и пресейв
const burn = reduceMotion ? null : createBurn($('.release__canvas'), cover(data.rel.cover));
burn?.ready.then(() => $('.release').classList.add('has-gl')).catch(() => {});
function initRelease() {
  const pin = $('.release__pin');
  const apply = (p) => {
    const b = range(p, 0.14, 0.72);
    if (burn) burn.state.burn = b;
    pin.style.setProperty('--burn', b.toFixed(3));
    const uo = range(p, 0.42, 0.8);
    pin.style.setProperty('--uo', uo.toFixed(3));
    pin.style.setProperty('--upe', uo > 0.6 ? 'auto' : 'none');
    const spread = range(p, 0, 0.7);
    pin.style.setProperty('--ax', `${(-spread * 14).toFixed(2)}vw`);
    pin.style.setProperty('--bx', `${(spread * 14).toFixed(2)}vw`);
    // заголовок уступает место дате и кнопке
    pin.style.setProperty('--to', (1 - range(b, 0.55, 0.85)).toFixed(3));
  };
  if (reduceMotion) { apply(1); return; }
  apply(0);
  ScrollTrigger.create({ trigger: '.release', start: 'top top', end: 'bottom bottom', scrub: true, onUpdate: (s) => apply(s.progress) });
  ScrollTrigger.create({ trigger: '.release', start: 'top bottom', end: 'bottom top', onToggle: (s) => (s.isActive ? burn?.start() : burn?.stop()) });
}

// Хиты: экран делится на три части, в каждой — свой трек
function initHits() {
  const items = $$('.hit');
  const bgs = $$('[data-hit-bgs] img');
  const steps = $$('[data-hit-steps] i');
  const n = items.length;
  let cur = 0;
  const show = (i) => {
    if (i === cur) return;
    items[cur].classList.remove('on');
    bgs[cur].classList.remove('on');
    items[i].classList.add('on');
    bgs[i].classList.add('on');
    cur = i;
  };
  ScrollTrigger.create({
    trigger: '.hits', start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate: (s) => {
      const f = s.progress * n;
      const i = Math.min(n - 1, Math.floor(f));
      show(i);
      steps.forEach((st, k) => st.style.setProperty('--f', clamp01(f - k).toFixed(3)));
      setTrack(i);
    },
  });
}

function initManifest() {
  if (reduceMotion) return;
  const rows = $$('.mrow');
  ScrollTrigger.create({
    trigger: '.manifest', start: 'top bottom', end: 'bottom top', scrub: true,
    onUpdate: (s) => rows.forEach((r) => {
      r.style.setProperty('--mx', `${(Number(r.dataset.dir) * (0.5 - s.progress) * 22).toFixed(2)}vw`);
      const img = $('img', r);
      if (img) img.style.setProperty('--ps', (1.35 - 0.35 * s.progress).toFixed(3));
    }),
  });
}

function initMusic() {
  const covers = $$('[data-covers] img');
  let current = 0;
  const show = (i) => {
    if (i === current) return;
    covers.forEach((c) => c.classList.remove('is-prev'));
    covers[current].classList.replace('is-on', 'is-prev');
    covers[i].classList.add('is-on');
    $$('.track').forEach((t) => t.classList.toggle('is-active', Number(t.dataset.i) === i));
    current = i;
  };
  $$('.track').forEach((t) => {
    t.addEventListener('pointerenter', () => show(Number(t.dataset.i)));
    t.addEventListener('focus', () => show(Number(t.dataset.i)));
    ScrollTrigger.create({ trigger: t, start: 'top 55%', end: 'bottom 55%', onToggle: (s) => { if (s.isActive && !finePointer) show(Number(t.dataset.i)); } });
  });
}

function initCols() {
  if (reduceMotion) return;
  const speeds = [6, -10, 14];
  const cols = $$('.col');
  ScrollTrigger.create({
    trigger: '.cols', start: 'top bottom', end: 'bottom top', scrub: true,
    onUpdate: (s) => cols.forEach((c, i) => c.style.setProperty('--cy', `${((0.5 - s.progress) * speeds[i]).toFixed(2)}vh`)),
  });
}

function initReveal() {
  $$('.booking .rules li, .form > *, .booking__lead').forEach((el) => el.classList.add('rv'));
  $$('.rv').forEach((el) => {
    const idx = [...el.parentElement.children].filter((c) => c.classList.contains('rv')).indexOf(el);
    if (idx > 0) el.style.setProperty('--d', `${Math.min(idx, 6) * 0.07}s`);
  });
  $$('.head__title, .booking__title').forEach((t) => $$('.line', t).forEach((l, i) => l.firstElementChild.style.setProperty('--d', `${i * 0.1}s`)));
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -12% 0px' });
  $$('.rv, .head .line, .booking .line, .ph, .footer__word').forEach((el) => io.observe(el));
}

// =====================================================================
// Просмотр фото
// =====================================================================
const lb = $('.lightbox');
const lbImg = $('.lightbox__img');
let lbIndex = 0;
function showLb(i) {
  lbIndex = (i + gallery.length) % gallery.length;
  lbImg.src = photo(gallery[lbIndex].name);
  lbImg.alt = gallery[lbIndex].alt;
  $('.lightbox__count').textContent = `${pad2(lbIndex + 1)} / ${pad2(gallery.length)}`;
}
function openLb(i) { showLb(i); lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false'); lenis?.stop(); $('.lightbox__close').focus(); }
function closeLb() { lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); lenis?.start(); }
$('[data-cols]').addEventListener('click', (e) => { const f = e.target.closest('.ph'); if (f) openLb(Number(f.dataset.i)); });
$('[data-cols]').addEventListener('keydown', (e) => { const f = e.target.closest('.ph'); if (f && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openLb(Number(f.dataset.i)); } });
$('.lightbox__close').addEventListener('click', closeLb);
$('.lightbox__prev').addEventListener('click', () => showLb(lbIndex - 1));
$('.lightbox__next').addEventListener('click', () => showLb(lbIndex + 1));
lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
addEventListener('keydown', (e) => {
  if (!lb.classList.contains('open')) return;
  if (e.key === 'Escape') closeLb();
  if (e.key === 'ArrowLeft') showLb(lbIndex - 1);
  if (e.key === 'ArrowRight') showLb(lbIndex + 1);
});
let touchX = null;
lb.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
lb.addEventListener('touchend', (e) => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 50) showLb(lbIndex + (dx < 0 ? 1 : -1));
  touchX = null;
});

// =====================================================================
// Заявка организатора → Telegram менеджера
// =====================================================================
const toast = $('.toast');
function showToast(text) {
  toast.textContent = text;
  toast.classList.add('on');
  clearTimeout(showToast.t);
  showToast.t = setTimeout(() => toast.classList.remove('on'), 5000);
}
function initForm() {
  const form = $('.form');
  const status = $('.form__status');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    let bad = false;
    ['city', 'date', 'contact'].forEach((name) => {
      const field = form.elements[name].closest('.field');
      const empty = !String(d[name] || '').trim();
      field.classList.toggle('is-error', empty);
      bad ||= empty;
    });
    if (bad) { status.textContent = 'Заполните город, дату и контакт.'; return; }
    const text = [
      'Здравствуйте! Заявка на выступление GRILLYAZH (с сайта)',
      `Город: ${d.city}`,
      `Дата: ${d.date.split('-').reverse().join('.')}`,
      d.venue && `Площадка: ${d.venue}`,
      d.capacity && `Вместимость: ${d.capacity}`,
      `Формат: ${d.format}`,
      `Контакт: ${d.contact}`,
      d.note && `Детали: ${d.note}`,
    ].filter(Boolean).join('\n');
    let copied = false;
    try { await navigator.clipboard.writeText(text); copied = true; } catch { /* буфер недоступен — текст уйдёт в ссылке */ }
    window.open(`${manager.url}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    status.textContent = copied ? 'Telegram открыт, текст заявки скопирован.' : 'Telegram открыт — отправьте заявку менеджеру.';
    showToast(copied ? 'Заявка скопирована — вставьте её в чат, если она не подставилась сама' : 'Открываем Telegram менеджера');
  });
  form.addEventListener('input', (e) => e.target.closest('.field')?.classList.remove('is-error'));
}

// =====================================================================
// Загрузка → вход со звуком → занавес поднимается
// =====================================================================
function intro() {
  const count = $('.loader__count b');
  const gate = $('.gate');
  const p = { v: 0 };
  const draw = () => { count.textContent = String(Math.round(p.v)).padStart(3, '0'); loader.style.setProperty('--p', p.v / 100); };
  const assets = Promise.all([document.fonts.ready, fx ? fx.ready.catch(() => {}) : $('.hero__fallback').decode().catch(() => {})]);
  const crawl = gsap.to(p, { v: 82, duration: 1.4, ease: 'power2.out', onUpdate: draw });
  if (!reduceMotion) {
    gsap.set(heroChars, { yPercent: 110 });
    gsap.set('.hero__release', { opacity: 0, y: 24 });
    fx?.start();
  }

  const enter = (withSound) => {
    if (entered) return;
    entered = true;
    onScroll();
    if (withSound) soundOn();
    document.body.classList.remove('is-loading');
    lenis?.start();
    fitWords();
    ScrollTrigger.refresh();
    gate.setAttribute('aria-hidden', 'true');
    if (reduceMotion) { loader.remove(); $$('.hero__hello .line').forEach((l) => l.classList.add('in')); return; }
    gsap.timeline({ onComplete: () => loader.remove() })
      .to(loader, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.25, ease: 'expo.inOut' })
      .to(fx ? fx.state : {}, { intro: 1, duration: 2.6, ease: 'expo.out' }, '<0.3')
      .add(() => $$('.hero__hello .line').forEach((l, i) => setTimeout(() => l.classList.add('in'), i * 140)), '<0.2')
      .to(heroChars, { yPercent: 0, duration: 1.5, ease: 'expo.out', stagger: 0.045 }, '<0.3')
      .to('.hero__release', { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08 }, '<0.3');
  };
  $('.gate__play').addEventListener('click', () => enter(true));
  $('.gate__mute').addEventListener('click', () => enter(false));

  Promise.all([assets, new Promise((r) => setTimeout(r, 900))]).then(() => {
    crawl.kill();
    fitWords();
    gsap.to(p, {
      v: 100, duration: 0.45, ease: 'power1.inOut', onUpdate: draw,
      onComplete: () => {
        loader.classList.add('is-gate');
        gate.classList.add('on');
        gate.setAttribute('aria-hidden', 'false');
        $('.gate__play').focus({ preventScroll: true });
      },
    });
  });
}

initHeroScroll();
initRelease();
initHits();
initManifest();
initMusic();
initCols();
initReveal();
initForm();
intro();
addEventListener('resize', () => { fitWords(); ScrollTrigger.refresh(); });
