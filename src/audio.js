// Звук сайта: несколько треков, плавный переход между ними и анализ громкости,
// чтобы визуал «качался» в такт. Браузеры разрешают звук только после клика,
// поэтому unlock() вызывается из обработчика кнопки «Включить звук».

export function createPlayer(tracks) {
  const items = tracks.map((t) => {
    const el = new Audio();
    el.src = t.src;
    el.loop = true;
    el.preload = 'none';
    el.crossOrigin = 'anonymous';
    el.playsInline = true;
    return { t, el, gain: null, vol: 0 };
  });

  let ctx = null;
  let master = null;
  let analyser = null;
  let bins = null;
  let current = -1;
  let playing = false;
  let muted = false;
  let unlocked = false;
  const listeners = {};
  const emit = (ev, v) => (listeners[ev] || []).forEach((f) => f(v));
  const lv = { level: 0, bass: 0 };

  // Плавная громкость: через WebAudio, а если его нет — через el.volume
  function ramp(item, to, sec) {
    item.vol = to;
    if (item.gain) {
      const g = item.gain.gain;
      const now = ctx.currentTime;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(to, now + sec);
    } else {
      const from = item.el.volume;
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / (sec * 1000));
        item.el.volume = from + (to - from) * k;
        if (k < 1 && item.vol === to) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    if (to === 0) {
      clearTimeout(item.stopTimer);
      item.stopTimer = setTimeout(() => { if (item.vol === 0) item.el.pause(); }, sec * 1000 + 80);
    }
  }

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.78;
      bins = new Uint8Array(analyser.frequencyBinCount);
      master.connect(analyser);
      analyser.connect(ctx.destination);
      items.forEach((it) => {
        const src = ctx.createMediaElementSource(it.el);
        it.gain = ctx.createGain();
        it.gain.gain.value = 0;
        src.connect(it.gain);
        it.gain.connect(master);
      });
      ctx.resume();
    } catch {
      ctx = null;
      items.forEach((it) => { it.gain = null; it.el.volume = 0; });
    }
    // iOS: элемент можно запускать без клика, только если его уже запускали по клику
    items.forEach((it, i) => {
      if (i === 0) return;
      it.el.muted = true;
      it.el.play().then(() => { it.el.pause(); it.el.muted = false; }).catch(() => { it.el.muted = false; });
    });
  }

  function play(index, { fade = 1.6 } = {}) {
    if (!unlocked || index < 0 || index >= items.length) return;
    if (index === current && playing) return;
    const prev = items[current];
    const next = items[index];
    if (prev && prev !== next) ramp(prev, 0, fade);
    current = index;
    playing = true;
    if (next.el.preload !== 'auto') next.el.preload = 'auto';
    if (!next.started) { next.started = true; try { next.el.currentTime = 0; } catch { /* ещё не загружен */ } }
    const p = next.el.play();
    if (p) p.catch(() => emit('blocked', index));
    ramp(next, 1, fade);
    emit('change', index);
    emit('state', true);
    // заранее подгружаем следующий трек
    const after = items[index + 1];
    if (after && after.el.preload === 'none') after.el.preload = 'auto';
  }

  function pause() {
    if (!playing) return;
    playing = false;
    if (items[current]) ramp(items[current], 0, 0.5);
    emit('state', false);
  }

  function toggle() {
    if (playing) pause();
    else play(Math.max(current, 0), { fade: 0.6 });
  }

  function setMuted(v) {
    muted = v;
    if (master) master.gain.setTargetAtTime(v ? 0 : 1, ctx.currentTime, 0.08);
    else items.forEach((it) => { it.el.muted = v; });
    emit('muted', v);
  }

  // Уровни 0..1 для визуала: общий и бас
  function levels() {
    if (!analyser || !playing || muted) {
      lv.level *= 0.9;
      lv.bass *= 0.9;
      return lv;
    }
    analyser.getByteFrequencyData(bins);
    let b = 0;
    for (let i = 1; i < 7; i++) b += bins[i];
    let s = 0;
    for (let i = 0; i < bins.length; i++) s += bins[i];
    const bass = Math.max(0, (b / 6 / 255 - 0.45) / 0.55);
    const level = s / bins.length / 255;
    lv.bass += (bass - lv.bass) * (bass > lv.bass ? 0.6 : 0.12);
    lv.level += (level - lv.level) * 0.2;
    return lv;
  }

  function progress() {
    const el = items[current]?.el;
    return el && el.duration ? el.currentTime / el.duration : 0;
  }

  // Вкладка скрыта — ставим на паузу, вернулись — продолжаем
  let resumeOnShow = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { resumeOnShow = playing; if (playing) pause(); }
    else if (resumeOnShow) play(current, { fade: 0.8 });
  });

  return {
    unlock, play, pause, toggle, setMuted, levels, progress,
    on(ev, f) { (listeners[ev] ||= []).push(f); },
    get current() { return current; },
    get playing() { return playing; },
    get muted() { return muted; },
    get unlocked() { return unlocked; },
  };
}
