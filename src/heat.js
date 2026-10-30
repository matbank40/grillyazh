// Обложка «плывёт», как воздух над асфальтом в жару. Чистый WebGL, без библиотек:
// один прямоугольник и шейдер со смещением по шуму. Сила эффекта — от прокрутки и курсора.

const VERT = `
attribute vec2 p;
varying vec2 vUv;
void main() { vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uTime;
uniform float uAmt;
uniform vec2 uMouse;
uniform float uHover;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  vec2 uv = vUv;
  // жар поднимается снизу: внизу сильнее
  float rise = 0.35 + 0.65 * (1.0 - uv.y);
  float m = uHover * smoothstep(0.35, 0.0, distance(uv, uMouse));
  float a = uAmt * rise + m * 0.8;
  float n1 = noise(vec2(uv.x * 5.0, uv.y * 3.0 - uTime * 1.1));
  float n2 = noise(vec2(uv.x * 11.0 + 7.0, uv.y * 7.0 - uTime * 1.9));
  vec2 off = vec2(n1 - 0.5, (n2 - 0.5) * 0.6) * 0.05 * a;
  vec2 q = clamp(uv + off, 0.001, 0.999);
  vec3 col;
  col.r = texture2D(uTex, clamp(q + off * 0.35, 0.001, 0.999)).r;
  col.g = texture2D(uTex, q).g;
  col.b = texture2D(uTex, clamp(q - off * 0.35, 0.001, 0.999)).b;
  // чуть теплее и светлее по мере нагрева
  col = mix(col, col * vec3(1.1, 0.94, 0.86) + vec3(0.04, 0.0, 0.0), clamp(uAmt, 0.0, 1.0) * 0.55);
  gl_FragColor = vec4(col, 1.0);
}`;

export function createHeat(canvas, src) {
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
  if (!gl) return null;

  const sh = (type, code) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, code);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const u = (n) => gl.getUniformLocation(prog, n);
  const uTime = u('uTime');
  const uAmt = u('uAmt');
  const uMouse = u('uMouse');
  const uHover = u('uHover');

  const tex = gl.createTexture();
  let ready = false;
  const img = new Image();
  img.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    ready = true;
    canvas.dispatchEvent(new Event('heat:ready'));
  };
  img.src = src;

  const state = { amt: 0, mouse: [0.5, 0.5], hover: 0, hoverTarget: 0 };
  const resize = () => {
    const dpr = Math.min(devicePixelRatio, 2);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
  };

  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    state.mouse = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height];
    state.hoverTarget = 1;
  });
  canvas.addEventListener('pointerleave', () => { state.hoverTarget = 0; });

  let raf = 0;
  const t0 = performance.now();
  const frame = (t) => {
    raf = requestAnimationFrame(frame);
    if (!ready) return;
    resize();
    state.hover += (state.hoverTarget - state.hover) * 0.06;
    gl.uniform1f(uTime, (t - t0) / 1000);
    gl.uniform1f(uAmt, state.amt);
    gl.uniform2f(uMouse, state.mouse[0], state.mouse[1]);
    gl.uniform1f(uHover, state.hover);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  return {
    setAmount(a) { state.amt = a; },
    start() { if (!raf) raf = requestAnimationFrame(frame); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
  };
}
