import './style.css';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { releases, concerts, gallery, socials, manager, links, photo } from './data.js';
import { createHeroFx } from './heat.js';

gsap.registerPlugin(ScrollTrigger);

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const range = (p, a, b) => clamp01((p - a) / (b - a));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pad2 = (n) => String(n).padStart(2, '0');

$('.year').textContent = new Date().getFullYear();

// =====================================================================
// Разметка из data.js
// =====================================================================
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>';

// Дата концерта по Москве, независимо от часового пояса посетителя
function msk(iso) {
  const d = new Date(new Date(iso).getTime() + 3 * 3600e3);
  return { day: d.getUTCDate(), month: d.getUTCMonth(), weekday: d.getUTCDay(), time: `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}` };
}
// Концерт уходит в архив через 6 часов после начала
const isUpcoming = (c) => new Date(c.date).getTime() + 6 * 3600e3 > Date.now();
const upcoming = concerts.filter(isUpcoming).sort((a, b) => new Date(a.date) - new Date(b.date));
const past = concerts.filter((c) => !isUpcoming(c)).sort((a, b) => new Date(b.date) - new Date(a.date));

function renderMusic() {
  $('[data-releases]').innerHTML = releases.map((r, i) => `
    <li><a class="track rv" href="${esc(r.url || links.yandex)}" target="_blank" rel="noopener" data-i="${i}">
      <span class="track__n">${pad2(i + 1)}</span>
      <img class="track__thumb" src="${photo(r.cover)}" alt="" loading="lazy" />
      <span>
        <h3 class="track__title">${esc(r.title)}</h3>
        <p class="track__meta">${r.isNew ? '<b>Новинка</b> · ' : ''}${esc(r.type)} · ${r.year} · ${esc(r.artists)}</p>
      </span>
      <span class="track__go" aria-hidden="true">${PLAY}</span>
    </a></li>`).join('');
  $('[data-covers]').innerHTML = releases.map((r, i) => `<img src="${photo(r.cover)}" alt="" data-i="${i}" ${i === 0 ? 'class="is-on"' : ''} />`).join('');
  const fresh = releases.find((r) => r.isNew);
  if (fresh?.url) $$('[data-release-link]').forEach((a) => { a.href = fresh.url; });
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
  if (upcoming.length) {
    $('[data-upcoming]').innerHTML = `<div class="gigs"><p class="label gigs__title">Ближайшие</p>${upcoming.map((c) => gigRow(c, false)).join('')}</div>`;
  } else {
    const word = '<span>Новые даты</span><span>скоро</span>';
    $('[data-upcoming]').innerHTML = `
      <div class="soon">
        <div class="soon__marquee" aria-hidden="true"><div class="soon__track">${word.repeat(6)}</div></div>
        <div class="soon__row rv">
          <p><span class="serif">Анонсы и старт продаж</span> — первыми в Telegram-канале.</p>
          <a class="btn btn--light btn--lg" href="${links.telegram}" target="_blank" rel="noopener">Подписаться ↗</a>
        </div>
      </div>`;
  }
  if (past.length) {
    $('[data-past]').innerHTML = `<div class="gigs"><p class="label gigs__title">Прошедшие</p>${past.map((c) => gigRow(c, true)).join('')}</div>`;
  }
}

function renderPhotos() {
  const cols = [[], [], []];
  gallery.forEach((g, i) => cols[i % 3].push({ ...g, i }));
  $('[data-cols]').innerHTML = cols.map((col) => `
    <div class="col">${col.map((g) => `
      <figure class="ph" data-i="${g.i}" role="button" tabindex="0" aria-label="Открыть фото: ${esc(g.alt)}">
        <div class="ph__frame" style="aspect-ratio:${g.ratio}"><img src="${photo(g.name)}" alt="${esc(g.alt)}" loading="lazy" /></div>
        <figcaption class="label"><span>${pad2(g.i + 1)}</span>${esc(g.caption)}</figcaption>
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

renderMusic();
renderTour();
renderPhotos();
renderSocials();

// Буквы — в отдельные span, чтобы анимировать по одной
function splitChars(el) {
  el.innerHTML = [...el.textContent].map((ch, i) => `<span class="ch" style="--i:${i}">${ch}</span>`).join('');
  return $$('.ch', el);
}
const heroChars = splitChars($('.hero__letters'));
splitChars($('.footer__word'));

// Слово на всю ширину строки: подбираем размер шрифта
function fitWords() {
  [$('.hero__letters'), $('.footer__word')].forEach((el) => {
    el.style.setProperty('--fit', '100px');
    el.style.justifyContent = 'flex-start';
    const w = [...el.children].reduce((sum, c) => sum + c.getBoundingClientRect().width, 0);
    el.style.justifyContent = '';
    const target = el.clientWidth;
    el.style.setProperty('--fit', `${Math.floor((target / w) * 100 * 0.995)}px`);
  });
  $('.hero').style.setProperty('--word-h', `${$('.hero__word').offsetHeight}px`);
}

// =====================================================================
// Плавный скролл, навигация
// =====================================================================
const lenis = reduceMotion ? null : new Lenis({ lerp: 0.085, wheelMultiplier: 0.95 });
if (lenis) {
  lenis.stop();
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
const scrollY0 = () => (lenis ? lenis.scroll : scrollY);

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

const mini = $('.mini');
let lastY = 0;
function onScroll() {
  const y = scrollY0();
  const menuOpen = document.documentElement.classList.contains('menu-open');
  nav.style.setProperty('--navbg', y > 60 ? 1 : 0);
  nav.classList.toggle('is-hidden', !menuOpen && y > lastY + 2 && y > innerHeight);
  if (y < lastY - 2) nav.classList.remove('is-hidden');
  lastY = y;
  // мини-плеер: после экрана сингла и до подвала
  const afterSingle = $('.single').getBoundingClientRect().bottom < innerHeight * 0.5;
  const nearFooter = $('.footer').getBoundingClientRect().top < innerHeight * 0.8;
  mini.classList.toggle('show', afterSingle && !nearFooter);
}
if (lenis) lenis.on('scroll', onScroll);
else addEventListener('scroll', onScroll, { passive: true });

$$('.nav__links a').forEach((a) => {
  const sec = $(a.getAttribute('href'));
  if (sec) ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', onToggle: (s) => a.classList.toggle('is-active', s.isActive) });
});

// =====================================================================
// Первый экран: фото с «горячим следом» за курсором
// =====================================================================
const hero = $('.hero');
const fx = reduceMotion ? null : createHeroFx($('.hero__canvas'), photo('fisheye'), [0.45, 0.4]);
fx?.ready.then(() => hero.classList.add('has-gl')).catch(() => {});

function initHeroScroll() {
  if (reduceMotion) return;
  ScrollTrigger.create({
    trigger: hero, start: 'top top', end: 'bottom top', scrub: true,
    onUpdate: (s) => {
      if (fx) fx.state.scroll = s.progress;
      $('.hero__word').style.transform = `translate3d(0, ${s.progress * 18}vh, 0)`;
      $('.hero__release').style.opacity = 1 - range(s.progress, 0, 0.5);
    },
    onToggle: (s) => (s.isActive ? fx?.start() : fx?.stop()),
  });
}

// =====================================================================
// Сингл: обложка раскрывается на весь экран, слова разъезжаются
// =====================================================================
function initSingle() {
  const pin = $('.single__pin');
  const cover = $('.single__cover');
  const apply = (p) => {
    const size = cover.offsetWidth || 1;
    const full = (Math.max(innerWidth, innerHeight) / size) * 1.04;
    const g = range(p, 0.08, 0.7);
    const e = g * g * (3 - 2 * g);
    pin.style.setProperty('--cs', (1 + (full - 1) * e).toFixed(4));
    pin.style.setProperty('--cr', `${(6 * (1 - e)).toFixed(2)}px`);
    const spread = range(p, 0, 0.55);
    pin.style.setProperty('--lx', `${(-spread * 42).toFixed(2)}vw`);
    pin.style.setProperty('--rx', `${(spread * 42).toFixed(2)}vw`);
    pin.style.setProperty('--to', (1 - range(p, 0.3, 0.55)).toFixed(3));
    pin.style.setProperty('--bo', range(p, 0.5, 0.8).toFixed(3));
    const ca = range(p, 0.72, 0.9);
    pin.style.setProperty('--ca', ca.toFixed(3));
    pin.style.setProperty('--cv', ca > 0.01 ? 'visible' : 'hidden');
  };
  if (reduceMotion) { apply(0); return; }
  apply(0);
  ScrollTrigger.create({ trigger: '.single', start: 'top top', end: 'bottom bottom', scrub: true, onUpdate: (s) => apply(s.progress), onRefresh: (s) => apply(s.progress) });
}

// =====================================================================
// Манифест: строки едут навстречу друг другу, фото в строках «дышат»
// =====================================================================
function initManifest() {
  if (reduceMotion) return;
  const rows = $$('.mrow');
  ScrollTrigger.create({
    trigger: '.manifest', start: 'top bottom', end: 'bottom top', scrub: true,
    onUpdate: (s) => rows.forEach((r) => {
      const dir = Number(r.dataset.dir);
      r.style.setProperty('--mx', `${(dir * (0.5 - s.progress) * 22).toFixed(2)}vw`);
      const img = $('img', r);
      if (img) img.style.setProperty('--ps', (1.35 - 0.35 * s.progress).toFixed(3));
    }),
  });
}

// =====================================================================
// Музыка: справа обложка выбранного релиза
// =====================================================================
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

// =====================================================================
// Фото: колонки с разной скоростью
// =====================================================================
function initCols() {
  if (reduceMotion) return;
  const speeds = [6, -10, 14];
  const cols = $$('.col');
  ScrollTrigger.create({
    trigger: '.cols', start: 'top bottom', end: 'bottom top', scrub: true,
    onUpdate: (s) => cols.forEach((c, i) => c.style.setProperty('--cy', `${((0.5 - s.progress) * speeds[i]).toFixed(2)}vh`)),
  });
}

// =====================================================================
// Появление: строки заголовков, блоки, фото, буквы подвала
// =====================================================================
function initReveal() {
  $$('.booking .rules li, .form > *, .booking__lead').forEach((el) => el.classList.add('rv'));
  $$('.rv').forEach((el) => {
    const sibs = [...el.parentElement.children].filter((c) => c.classList.contains('rv'));
    const idx = sibs.indexOf(el);
    if (idx > 0) el.style.setProperty('--d', `${Math.min(idx, 6) * 0.07}s`);
  });
  $$('.head__title, .booking__title').forEach((t) => $$('.line', t).forEach((l, i) => l.firstElementChild.style.setProperty('--d', `${i * 0.1}s`)));
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -12% 0px' });
  $$('.rv, .line, .ph, .footer__word, .head .serif').forEach((el) => io.observe(el));
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
    const data = Object.fromEntries(new FormData(form));
    let bad = false;
    ['city', 'date', 'contact'].forEach((name) => {
      const field = form.elements[name].closest('.field');
      const empty = !String(data[name] || '').trim();
      field.classList.toggle('is-error', empty);
      bad ||= empty;
    });
    if (bad) { status.textContent = 'Заполните город, дату и контакт.'; return; }
    const text = [
      'Здравствуйте! Заявка на выступление GRILLYAZH (с сайта)',
      `Город: ${data.city}`,
      `Дата: ${data.date.split('-').reverse().join('.')}`,
      data.venue && `Площадка: ${data.venue}`,
      data.capacity && `Вместимость: ${data.capacity}`,
      `Формат: ${data.format}`,
      `Контакт: ${data.contact}`,
      data.note && `Детали: ${data.note}`,
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
// Загрузка → занавес поднимается, буквы встают на место
// =====================================================================
function intro() {
  const loader = $('.loader');
  const count = $('.loader__count b');
  const bar = $('.loader');
  const done = () => {
    document.body.classList.remove('is-loading');
    lenis?.start();
    fitWords();
    ScrollTrigger.refresh();
  };
  if (reduceMotion) { loader.remove(); done(); return; }

  const p = { v: 0 };
  const draw = () => { count.textContent = String(Math.round(p.v)).padStart(3, '0'); bar.style.setProperty('--p', p.v / 100); };
  const assets = Promise.all([document.fonts.ready, fx ? fx.ready.catch(() => {}) : $('.hero__fallback').decode().catch(() => {})]);
  const crawl = gsap.to(p, { v: 82, duration: 1.6, ease: 'power2.out', onUpdate: draw });
  gsap.set(heroChars, { yPercent: 110 });
  gsap.set('.hero__release > *, .hero__top', { opacity: 0, y: 24 });
  fx?.start();

  Promise.all([assets, new Promise((r) => setTimeout(r, 1100))]).then(() => {
    crawl.kill();
    fitWords();
    const tl = gsap.timeline({ onComplete: () => { loader.remove(); } });
    tl.to(p, { v: 100, duration: 0.5, ease: 'power1.inOut', onUpdate: draw })
      .add(done)
      .to(loader, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.25, ease: 'expo.inOut' }, '+=0.05')
      .to(fx ? fx.state : {}, { intro: 1, duration: 2.6, ease: 'expo.out' }, '<0.3')
      .to(heroChars, { yPercent: 0, duration: 1.5, ease: 'expo.out', stagger: 0.045 }, '<0.35')
      .to('.hero__release > *, .hero__top', { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08 }, '<0.3');
  });
}

// =====================================================================
initHeroScroll();
initSingle();
initManifest();
initMusic();
initCols();
initReveal();
initForm();
intro();
addEventListener('resize', () => { fitWords(); ScrollTrigger.refresh(); });
