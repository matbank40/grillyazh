import './style.css';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { releases, concerts, gallery, socials, manager, links, photo } from './data.js';
import { createHeat } from './heat.js';

gsap.registerPlugin(ScrollTrigger);

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const range = (p, a, b) => clamp01((p - a) / (b - a));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

$('.year').textContent = new Date().getFullYear();

// =====================================================================
// Разметка из data.js
// =====================================================================
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

// Дата концерта по Москве, независимо от часового пояса посетителя
function msk(iso) {
  const d = new Date(new Date(iso).getTime() + 3 * 3600e3);
  return {
    day: d.getUTCDate(), month: d.getUTCMonth(), year: d.getUTCFullYear(), weekday: d.getUTCDay(),
    time: `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`,
  };
}

// Концерт уходит в архив через 6 часов после начала
const isUpcoming = (c) => new Date(c.date).getTime() + 6 * 3600e3 > Date.now();
const upcoming = concerts.filter(isUpcoming).sort((a, b) => new Date(a.date) - new Date(b.date));
const past = concerts.filter((c) => !isUpcoming(c)).sort((a, b) => new Date(b.date) - new Date(a.date));

const PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>';

function renderReleases() {
  $('[data-releases]').innerHTML = releases.map((r) => `
    <a class="rel" href="${esc(r.url || links.yandex)}" target="_blank" rel="noopener" aria-label="Слушать «${esc(r.title)}»">
      <div class="rel__info">
        <p class="rel__meta">${r.isNew ? '<b>Новинка</b> · ' : ''}${esc(r.type)} · ${r.year}</p>
        <h3 class="rel__title">${esc(r.title)}</h3>
        <p class="rel__artists">${esc(r.artists)}</p>
      </div>
      <div class="rel__cover">
        <img src="${photo(r.cover)}" alt="" loading="lazy" />
        <span class="rel__play">${PLAY}</span>
      </div>
    </a>`).join('');
  const fresh = releases.find((r) => r.isNew);
  if (fresh?.url) $('[data-release-link]').href = fresh.url;
}

function gigRow(c, isPast) {
  const p = msk(c.date);
  const action = isPast
    ? '<span class="gig__status">Прошёл</span>'
    : `<a class="pill pill--red" href="${esc(c.url)}" target="_blank" rel="noopener">Билеты</a>`;
  return `
    <article class="gig reveal${isPast ? ' gig--past' : ''}">
      <div class="gig__date"><span class="gig__day">${p.day}</span><span class="gig__month">${MONTHS[p.month]}<br />${WEEKDAYS[p.weekday]}, ${p.time}</span></div>
      <div><h3 class="gig__city">${esc(c.city)}</h3><p class="gig__venue">${esc(c.venue)}${c.tags?.length ? ` · ${c.tags.map(esc).join(' · ')}` : ''}</p></div>
      ${action}
    </article>`;
}

function renderConcerts() {
  let tile;
  if (upcoming.length) {
    const c = upcoming[0];
    const p = msk(c.date);
    const days = Math.max(0, Math.ceil((new Date(c.date) - Date.now()) / 864e5));
    tile = `
      <div>
        <p class="eyebrow">Ближайший концерт · ${days ? `через ${days} дн.` : 'сегодня'}</p>
        <h3 class="tile__title">${esc(c.city)}, ${p.day} ${MONTHS[p.month]}.</h3>
        <p class="tile__text">${esc(c.venue)}, начало в ${p.time}.</p>
      </div>
      <a class="pill pill--white" href="${esc(c.url)}" target="_blank" rel="noopener">Купить билет</a>`;
  } else {
    tile = `
      <div>
        <p class="eyebrow">Тур</p>
        <h3 class="tile__title">Новые даты — скоро.</h3>
        <p class="tile__text">Анонсы и старт продаж первыми появляются в Telegram-канале.</p>
      </div>
      <a class="pill pill--white" href="${links.telegram}" target="_blank" rel="noopener">Подписаться</a>`;
  }
  $('[data-upcoming]').innerHTML = `
    <div class="tile reveal"><img class="tile__bg" src="${photo('gallery-1')}" alt="" loading="lazy" />${tile}</div>
    ${upcoming.length > 1 ? `<div class="gigs">${upcoming.slice(1).map((c) => gigRow(c, false)).join('')}</div>` : ''}`;
  if (past.length) {
    $('[data-past]').innerHTML = `<div class="gigs"><p class="gigs__title">Прошедшие</p>${past.map((c) => gigRow(c, true)).join('')}</div>`;
  }
}

function renderBento() {
  $('[data-bento]').innerHTML = gallery.map((g, i) => `
    <button class="shot reveal${g.size ? ` shot--${g.size}` : ''}" type="button" data-idx="${i}" aria-label="Открыть фото: ${esc(g.alt)}">
      <img src="${photo(g.name)}" alt="${esc(g.alt)}" loading="lazy" />
    </button>`).join('');
}

function renderSocials() {
  const rows = [...socials, { label: 'Менеджер', handle: manager.handle, url: manager.url }];
  $('[data-socials]').innerHTML = rows.map((s) => `
    <li><a class="reveal" href="${esc(s.url)}" target="_blank" rel="noopener">
      <span class="links__name">${esc(s.label)}</span>
      <span class="links__handle">${esc(s.handle)}</span>
      <span class="links__arrow" aria-hidden="true">↗</span>
    </a></li>`).join('');
}

renderReleases();
renderConcerts();
renderBento();
renderSocials();

// =====================================================================
// Плавный скролл
// =====================================================================
const lenis = reduceMotion ? null : new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
if (lenis) {
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

function scrollToTarget(hash) {
  const el = hash === '#top' ? 0 : $(hash);
  if (el === null) return;
  if (lenis) lenis.scrollTo(el, { duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
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

// =====================================================================
// Навигация
// =====================================================================
const burger = $('.nav__burger');
function setMenu(open) {
  document.documentElement.classList.toggle('menu-open', open);
  burger.setAttribute('aria-expanded', open);
}
burger.addEventListener('click', () => setMenu(!document.documentElement.classList.contains('menu-open')));
addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

// Цвет шапки — по секции, которая сейчас под ней
const nav = $('.nav');
let heroLight = true;
let navSection = 'hero';
const paintNav = () => nav.classList.toggle('is-light', navSection === 'hero' ? heroLight : navSection === 'light');
$$('[data-nav]').forEach((sec) => {
  ScrollTrigger.create({
    trigger: sec, start: 'top 26px', end: 'bottom 26px',
    onToggle: (s) => { if (s.isActive) { navSection = sec.dataset.nav; paintNav(); } },
  });
});

$$('.nav__links a').forEach((a) => {
  const sec = $(a.getAttribute('href'));
  if (!sec) return;
  ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', onToggle: (s) => a.classList.toggle('is-active', s.isActive) });
});

// =====================================================================
// Первый экран: фото видно сквозь буквы, скролл «влетает» в букву I
// =====================================================================
function initHero() {
  const hero = $('.hero');
  const sticky = $('.hero__sticky');
  const mask = $('.hero__mask');
  const word = $('.hero__word');
  word.innerHTML = [...word.textContent].map((ch) => `<span class="ch">${ch}</span>`).join('');
  const chars = $$('.ch', word);
  if (reduceMotion) return;

  // точка приближения — середина ствола буквы I
  const setOrigin = () => {
    const prev = mask.style.transform;
    mask.style.transform = 'none';
    const r = chars[2].getBoundingClientRect();
    const m = mask.getBoundingClientRect();
    mask.style.setProperty('--ox', `${r.left + r.width / 2 - m.left}px`);
    mask.style.setProperty('--oy', `${r.top + r.height * 0.55 - m.top}px`);
    mask.style.transform = prev;
  };

  const apply = (p) => {
    const z = Math.pow(range(p, 0.04, 0.62), 2.2);
    mask.style.transform = `scale(${Math.pow(90, z).toFixed(4)})`;
    mask.style.opacity = 1 - range(p, 0.56, 0.64);
    mask.style.visibility = p > 0.64 ? 'hidden' : 'visible';
    sticky.style.setProperty('--ps', (1.3 - 0.3 * range(p, 0, 0.7)).toFixed(4));
    sticky.style.setProperty('--hint', (1 - range(p, 0, 0.06)).toFixed(3));
    sticky.style.setProperty('--shade', range(p, 0.6, 0.82).toFixed(3));
    sticky.style.setProperty('--dim', (0.38 * (1 - range(p, 0.3, 0.6))).toFixed(3));
    const copy = range(p, 0.68, 0.88);
    sticky.style.setProperty('--copy', copy.toFixed(3));
    sticky.style.setProperty('--copyvis', copy > 0.01 ? 'visible' : 'hidden');
    const light = p < 0.5;
    if (light !== heroLight) { heroLight = light; paintNav(); }
  };

  apply(0);
  ScrollTrigger.create({
    trigger: hero, start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate: (s) => apply(s.progress),
    onRefresh: (s) => { setOrigin(); apply(s.progress); },
  });
  document.fonts.ready.then(() => ScrollTrigger.refresh());

  // появление: буквы проявляются из размытия и «собираются» по трекингу
  gsap.from(chars, { opacity: 0, filter: 'blur(14px)', y: 24, duration: 1.6, ease: 'power3.out', stagger: 0.05, delay: 0.15, clearProps: 'filter' });
  gsap.from(word, { letterSpacing: '0.12em', duration: 2, ease: 'expo.out', delay: 0.1, onComplete: setOrigin });
  gsap.from('.hero__hint', { opacity: 0, y: 10, duration: 1, delay: 1.2, clearProps: 'opacity,transform' });
}

// =====================================================================
// Новинка: фото мягко поднимается и вырастает
// =====================================================================
function initSingle() {
  if (reduceMotion) return;
  const img = $('.single__shot img');
  ScrollTrigger.create({
    trigger: '.single__shot', start: 'top bottom', end: 'bottom bottom', scrub: true,
    onUpdate: (s) => {
      img.style.setProperty('--sy', `${((1 - s.progress) * 90).toFixed(1)}px`);
      img.style.setProperty('--ss', (0.9 + 0.1 * s.progress).toFixed(4));
    },
  });
}

// =====================================================================
// Жара: обложка плывёт сильнее с каждым экраном
// =====================================================================
function initHeat() {
  const section = $('.heat');
  const sticky = $('.heat__sticky');
  const lines = $$('.heat__line');
  const temp = $('[data-temp]');
  lines[2].innerHTML = `<span>${lines[2].textContent}</span>`;
  const canvas = $('.heat__canvas');
  const heat = reduceMotion ? null : createHeat(canvas, photo('cover-vyshe-gradus'));
  if (heat) canvas.addEventListener('heat:ready', () => section.classList.add('has-gl'), { once: true });

  const apply = (p) => {
    const idx = p < 0.3 ? 0 : p < 0.62 ? 1 : 2;
    lines.forEach((l, i) => l.classList.toggle('on', i === idx));
    heat?.setAmount(0.12 + p * 1.15);
    sticky.style.setProperty('--as', (0.84 + 0.16 * range(p, 0, 0.8)).toFixed(4));
    sticky.style.setProperty('--glow', (0.6 * p).toFixed(3));
    temp.textContent = (36.6 + p * 4.6).toFixed(1).replace('.', ',');
  };
  if (reduceMotion) { apply(1); return; }
  apply(0);
  ScrollTrigger.create({ trigger: section, start: 'top top', end: 'bottom bottom', scrub: true, onUpdate: (s) => apply(s.progress) });
  // рисуем шейдер только пока секция на экране
  ScrollTrigger.create({
    trigger: section, start: 'top bottom', end: 'bottom top',
    onToggle: (s) => (s.isActive ? heat?.start() : heat?.stop()),
  });
}

// =====================================================================
// Полка релизов: стрелки
// =====================================================================
function initShelf() {
  const shelf = $('.shelf');
  const [prev, next] = $$('[data-shelf]');
  const update = () => {
    prev.disabled = shelf.scrollLeft < 8;
    next.disabled = shelf.scrollLeft + shelf.clientWidth > shelf.scrollWidth - 8;
  };
  [prev, next].forEach((b) => b.addEventListener('click', () => {
    const card = $('.rel', shelf);
    shelf.scrollBy({ left: Number(b.dataset.shelf) * (card.offsetWidth + 20), behavior: 'smooth' });
  }));
  shelf.addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();
}

// =====================================================================
// Параллакс фото внутри плиток
// =====================================================================
function initParallax() {
  if (reduceMotion) return;
  $$('.shot img').forEach((img) => {
    ScrollTrigger.create({
      trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true,
      onUpdate: (s) => img.style.setProperty('--py', `${((s.progress - 0.5) * -12).toFixed(2)}%`),
    });
  });
  const bg = $('.tile__bg');
  if (bg) {
    ScrollTrigger.create({
      trigger: '.tile', start: 'top bottom', end: 'bottom top', scrub: true,
      onUpdate: (s) => bg.style.setProperty('--ts', (1.16 - 0.16 * s.progress).toFixed(4)),
    });
  }
}

// =====================================================================
// Появление блоков
// =====================================================================
function initReveal() {
  // соседние элементы появляются с небольшим сдвигом
  $$('.reveal').forEach((el) => {
    const sibs = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
    el.style.setProperty('--d', `${Math.min(sibs.indexOf(el), 5) * 0.07}s`);
  });
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -10% 0px' });
  $$('.reveal').forEach((el) => io.observe(el));
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
}
function openLb(i) {
  showLb(i);
  lb.classList.add('open');
  lb.setAttribute('aria-hidden', 'false');
  lenis?.stop();
  $('.lightbox__close').focus();
}
function closeLb() {
  lb.classList.remove('open');
  lb.setAttribute('aria-hidden', 'true');
  lenis?.start();
}
$('[data-bento]').addEventListener('click', (e) => {
  const shot = e.target.closest('.shot');
  if (shot) openLb(Number(shot.dataset.idx));
});
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
      data.note && `Комментарий: ${data.note}`,
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
initHero();
initSingle();
initHeat();
initShelf();
initParallax();
initReveal();
initForm();
