// Первый экран: фото на WebGL. За курсором (или пальцем) остаётся «горячий след» —
// картинка плывёт, как воздух над огнём, и слегка расслаивается по цветам.
// Без курсора по кадру всё равно идёт лёгкое марево. Чистый WebGL, без библиотек.

const VERT = `
attribute vec2 p;
varying vec2 vUv;
void main() { vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const TRAIL = 18;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform vec2 uImg;
uniform vec2 uFocus;
uniform float uTime;
uniform float uScroll;
uniform float uIntro;
uniform vec3 uTrail[${TRAIL}];

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

// как object-fit: cover с точкой фокуса
vec2 cover(vec2 uv) {
  float rs = uRes.x / uRes.y;
  float ri = uImg.x / uImg.y;
  vec2 s = rs > ri ? vec2(1.0, ri / rs) : vec2(rs / ri, 1.0);
  return (uv - 0.5) * s + 0.5 + (1.0 - s) * (uFocus - 0.5);
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;
  // плавное приближение при загрузке и прокрутке
  float zoom = 1.0 + (1.0 - uIntro) * 0.18 + uScroll * 0.12;
  uv = (uv - 0.5) / zoom + 0.5;

  vec2 d = vec2(0.0);
  float heat = 0.0;
  for (int i = 0; i < ${TRAIL}; i++) {
    vec3 t = uTrail[i];
    vec2 diff = (vUv - t.xy) * vec2(aspect, 1.0);
    float f = exp(-dot(diff, diff) * 26.0) * t.z;
    float n = noise(vUv * 9.0 + vec2(0.0, -uTime * 2.2) + float(i));
    d += (diff * 0.6 + vec2(n - 0.5, (n - 0.5) * 1.6)) * f * 0.05;
    heat += f;
  }
  heat = clamp(heat, 0.0, 1.0);

  // фоновое марево: снизу сильнее, как от асфальта
  float rise = smoothstep(1.0, 0.0, vUv.y);
  float s1 = noise(vec2(vUv.x * 7.0, vUv.y * 4.0 - uTime * 0.9));
  float s2 = noise(vec2(vUv.x * 15.0 + 3.0, vUv.y * 9.0 - uTime * 1.6));
  d += vec2(s1 - 0.5, (s2 - 0.5) * 0.5) * 0.006 * (0.4 + rise);

  vec2 q = cover(uv + d);
  float ca = 0.0012 + heat * 0.012;
  vec3 col;
  col.r = texture2D(uTex, cover(uv + d * 1.25 + vec2(ca, 0.0))).r;
  col.g = texture2D(uTex, q).g;
  col.b = texture2D(uTex, cover(uv + d * 0.75 - vec2(ca, 0.0))).b;

  // тёплый ожог по следу
  col += vec3(0.42, 0.08, 0.0) * heat * 0.28;
  // плёночный контраст и виньетка
  col = (col - 0.5) * 1.06 + 0.5;
  float vig = smoothstep(1.25, 0.35, length((vUv - 0.5) * vec2(aspect * 0.8, 1.0)));
  col *= mix(0.55, 1.0, vig);
  col *= 1.0 - uScroll * 0.55;
  // зерно
  col += (hash(vUv * uRes + fract(uTime) * 100.0) - 0.5) * 0.045;
  gl_FragColor = vec4(col, 1.0);
}`;

export function createHeroFx(canvas, src, focus = [0.45, 0.4]) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const sh = (type, code) => { const s = gl.createShader(type); gl.shaderSource(s, code); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = Object.fromEntries(['uRes', 'uImg', 'uFocus', 'uTime', 'uScroll', 'uIntro', 'uTrail'].map((n) => [n, gl.getUniformLocation(prog, n)]));
  gl.uniform2f(U.uFocus, focus[0], 1 - focus[1]);

  const state = { scroll: 0, intro: 0, ready: false };
  const trail = new Float32Array(TRAIL * 3);
  let head = 0;
  let last = null;

  const img = new Image();
  const ready = new Promise((resolve, reject) => {
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform2f(U.uImg, img.naturalWidth, img.naturalHeight);
      state.ready = true;
      resolve();
    };
    img.onerror = reject;
  });
  img.src = src;

  const resize = () => {
    const dpr = Math.min(devicePixelRatio, 1.75);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(U.uRes, w, h);
    }
  };

  // след: новая точка на каждое заметное движение, сила — от скорости
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = 1 - (e.clientY - r.top) / r.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    const v = last ? Math.hypot(x - last[0], y - last[1]) : 0;
    last = [x, y];
    if (v < 0.004) return;
    trail[head * 3] = x;
    trail[head * 3 + 1] = y;
    trail[head * 3 + 2] = Math.min(1, 0.35 + v * 14);
    head = (head + 1) % TRAIL;
  };
  addEventListener('pointermove', onMove, { passive: true });

  let raf = 0;
  const t0 = performance.now();
  const frame = (t) => {
    raf = requestAnimationFrame(frame);
    if (!state.ready) return;
    resize();
    for (let i = 0; i < TRAIL; i++) trail[i * 3 + 2] *= 0.955;
    gl.uniform3fv(U.uTrail, trail);
    gl.uniform1f(U.uTime, (t - t0) / 1000);
    gl.uniform1f(U.uScroll, state.scroll);
    gl.uniform1f(U.uIntro, state.intro);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  return {
    ready,
    state,
    start() { if (!raf) raf = requestAnimationFrame(frame); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
  };
}
