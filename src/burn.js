// «После прослушивания сжечь»: обложка сгорает от краёв к центру.
// Кромка обугливается, по ней бежит тлеющий огонь, сгоревшее становится прозрачным —
// под ним видно то, что лежит в разметке под холстом. Чистый WebGL.

const VERT = `
attribute vec2 p;
varying vec2 vUv;
void main() { vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uBurn;
uniform float uTime;
uniform float uBeat;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = vUv;
  // огонь идёт снизу и с краёв, рваным фронтом
  float shape = fbm(uv * 3.2 + vec2(0.0, uTime * 0.04));
  float edge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  float v = shape * 0.62 + edge * 0.9 + uv.y * 0.28;
  float t = uBurn * 1.25 - 0.08;

  float alive = smoothstep(t, t + 0.025, v);
  float charred = smoothstep(t, t + 0.16, v);
  float band = 1.0 - smoothstep(0.0, 0.035 + uBeat * 0.02, abs(v - t - 0.012));
  float flicker = 0.75 + 0.25 * noise(uv * 40.0 + uTime * 6.0);

  vec3 col = texture2D(uTex, uv).rgb;
  // чем ближе к огню, тем темнее и теплее
  col = mix(col * vec3(0.35, 0.22, 0.16), col, charred);
  vec3 ember = mix(vec3(1.0, 0.32, 0.05), vec3(1.0, 0.85, 0.45), band * band) * (1.6 + uBeat) * flicker;
  col += ember * band;

  float a = max(alive, band * 0.95);
  // искры над кромкой
  float spark = step(0.985, hash(floor(uv * 90.0) + floor(uTime * 8.0))) * (1.0 - smoothstep(0.0, 0.12, abs(v - t))) * step(0.02, uBurn);
  col += vec3(1.0, 0.6, 0.2) * spark;
  a = max(a, spark);
  gl_FragColor = vec4(col * a, a);
}`;

export function createBurn(canvas, src) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
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
  const U = Object.fromEntries(['uBurn', 'uTime', 'uBeat'].map((n) => [n, gl.getUniformLocation(prog, n)]));
  gl.clearColor(0, 0, 0, 0);

  const state = { burn: 0, beat: 0, ready: false };
  const ready = new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      state.ready = true;
      resolve();
    };
    img.onerror = reject;
    img.src = src;
  });

  let raf = 0;
  const t0 = performance.now();
  const frame = (t) => {
    raf = requestAnimationFrame(frame);
    if (!state.ready) return;
    const dpr = Math.min(devicePixelRatio, 2);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(U.uBurn, state.burn);
    gl.uniform1f(U.uTime, (t - t0) / 1000);
    gl.uniform1f(U.uBeat, state.beat);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  return {
    ready,
    state,
    start() { if (!raf) raf = requestAnimationFrame(frame); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
  };
}
