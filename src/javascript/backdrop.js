/**
 * Подложка сайта: из-под верхнего снимка проступает нижний — не пятном с
 * размытым краем, а квадратными пикселями, которые тянутся за курсором и
 * гаснут по одному.
 *
 * Как это устроено. Экран разбит на клетки; их «нагрев» живёт в отдельной
 * текстуре низкого разрешения. Каждый кадр гоняем два прохода:
 *
 * 1. симуляция — клетка под курсором получает единицу, все остальные множатся
 *    на затухание, у каждой своё (от хеша координат), поэтому хвост осыпается
 *    вразнобой, а не тает ровным кругом;
 * 2. вывод — читаем нагрев ближайшим соседом и режем порогом, отсюда честные
 *    квадраты без сглаживания.
 *
 * Нагрев нельзя держать в одной текстуре: читать и писать её в одном проходе
 * нельзя, поэтому их две и они меняются местами (ping-pong).
 *
 * Пока шейдер не поднялся (нет WebGL2, ошибка компиляции, prefers-reduced-motion),
 * на экране остаётся статичный <img> с верхним снимком.
 */

const canvas = document.querySelector('.A_BackdropCanvas');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

const RADIUS = 95; /* радиус зажигания, css px */
const CELL = 12; /* сторона пикселя маски, css px */
const EASE = 0.2; /* насколько курсор догоняется за кадр при 60 fps */
const DECAY = 0.93; /* доля нагрева, остающаяся за кадр при 60 fps */
const THRESHOLD = 0.42; /* ниже — клетка гаснет целиком */
const FADE_MS = 2500; /* сколько досчитываем после ухода курсора */
const FRAME = 1000 / 60;
const EPSILON = 0.25;
const MAX_DPR = 2;

const VERTEX = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const SIMULATION = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uPrev;
uniform vec2 uGrid;       /* клеток по горизонтали и вертикали */
uniform vec2 uResolution; /* css px */
uniform vec2 uPointer;    /* css px, отсчёт от левого верхнего угла */
uniform float uRadius;
uniform float uDecay;     /* уже пересчитан под длину кадра */

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 cell = floor(vUv * uGrid);
  vec2 center = (cell + 0.5) / uGrid;

  /* центр клетки в координатах курсора */
  vec2 px = vec2(center.x, 1.0 - center.y) * uResolution;
  float distance = length(px - uPointer);

  /* у каждой клетки свой темп затухания — хвост осыпается неровно */
  float speed = 0.55 + 1.15 * hash(cell);
  float previous = texture(uPrev, center).r * pow(uDecay, speed);

  /* под курсором клетка загорается целиком: край режется сеткой, не градиентом */
  float lit = step(distance, uRadius);

  outColor = vec4(max(lit, previous), 0.0, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uTop;
uniform sampler2D uBottom;
uniform sampler2D uHeat;
uniform vec2 uResolution;
uniform vec2 uImage;
uniform float uThreshold;

/* Кадрирование как object-fit: cover — снимок заполняет экран без искажения */
vec2 cover(vec2 uv) {
  float canvasAspect = uResolution.x / uResolution.y;
  float imageAspect = uImage.x / uImage.y;
  vec2 scale = canvasAspect > imageAspect
    ? vec2(1.0, imageAspect / canvasAspect)
    : vec2(canvasAspect / imageAspect, 1.0);
  return (uv - 0.5) * scale + 0.5;
}

void main() {
  vec2 uv = cover(vUv);

  /* нагрев снят ближайшим соседом, порог — жёсткий: получаем квадраты */
  float heat = texture(uHeat, vUv).r;
  float mask = step(uThreshold, heat);

  vec3 top = texture(uTop, uv).rgb;
  vec3 bottom = texture(uBottom, uv).rgb;

  outColor = vec4(mix(top, bottom, mask), 1.0);
}`;

const load = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

const compile = (gl, type, source) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

const link = (gl, vertexSource, fragmentSource) => {
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.bindAttribLocation(program, 0, 'aPosition');
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
};

const imageTexture = (gl, image) => {
  const id = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, id);
  /* снимки не степень двойки: без мипмапов и с зажатием по краям */
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  return id;
};

/* Мишень для нагрева: фильтрация NEAREST — иначе клетки размажутся.
   Работаем строго на слоте 2: на нулевом и первом лежат снимки, и создание
   текстуры на них затёрло бы привязку — вместо фотографии в кадр попадала бы
   карта нагрева. */
const heatTarget = (gl, width, height) => {
  gl.activeTexture(gl.TEXTURE2);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return { texture, framebuffer };
};

const start = async () => {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
  if (!gl) return;

  const [top, bottom] = await Promise.all([load('/top.webp'), load('/bottom.webp')]);

  const simulation = link(gl, VERTEX, SIMULATION);
  const draw = link(gl, VERTEX, FRAGMENT);
  if (!simulation || !draw) return;

  /* полноэкранный треугольник: дешевле квада и без шва по диагонали */
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.activeTexture(gl.TEXTURE0);
  imageTexture(gl, top);
  gl.activeTexture(gl.TEXTURE1);
  imageTexture(gl, bottom);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); /* нагрев переворачивать нельзя */

  const at = (program, name) => gl.getUniformLocation(program, name);

  gl.useProgram(draw);
  gl.uniform1i(at(draw, 'uTop'), 0);
  gl.uniform1i(at(draw, 'uBottom'), 1);
  gl.uniform1i(at(draw, 'uHeat'), 2);
  gl.uniform2f(at(draw, 'uImage'), top.naturalWidth, top.naturalHeight);
  gl.uniform1f(at(draw, 'uThreshold'), THRESHOLD);

  gl.useProgram(simulation);
  gl.uniform1i(at(simulation, 'uPrev'), 2);
  gl.uniform1f(at(simulation, 'uRadius'), RADIUS);

  const size = { w: 0, h: 0 };
  const grid = { cols: 0, rows: 0 };
  let targets = [];

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    size.w = canvas.clientWidth;
    size.h = canvas.clientHeight;
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);

    grid.cols = Math.max(1, Math.ceil(size.w / CELL));
    grid.rows = Math.max(1, Math.ceil(size.h / CELL));

    for (const target of targets) {
      gl.deleteTexture(target.texture);
      gl.deleteFramebuffer(target.framebuffer);
    }
    targets = [heatTarget(gl, grid.cols, grid.rows), heatTarget(gl, grid.cols, grid.rows)];

    gl.useProgram(simulation);
    gl.uniform2f(at(simulation, 'uGrid'), grid.cols, grid.rows);
    gl.uniform2f(at(simulation, 'uResolution'), size.w, size.h);
    gl.useProgram(draw);
    gl.uniform2f(at(draw, 'uResolution'), size.w, size.h);
  };

  const pointer = { x: 0, y: 0 };
  const target = { x: 0, y: 0, r: 0 };
  let frame = null;
  let previous = 0;
  let quietUntil = 0;
  let placed = false;

  const render = (time) => {
    const elapsed = previous ? time - previous : FRAME;
    previous = time;
    const frames = elapsed / FRAME;

    /* курсор догоняется, а не прыгает */
    const step = 1 - (1 - EASE) ** frames;
    for (const axis of ['x', 'y']) {
      const distance = target[axis] - pointer[axis];
      pointer[axis] += Math.abs(distance) < EPSILON ? distance : distance * step;
    }

    /* проход 1: нагрев. Читаем прошлый кадр, пишем в свободную мишень */
    const [read, write] = targets;
    gl.useProgram(simulation);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, read.texture);
    gl.uniform2f(at(simulation, 'uPointer'), pointer.x, pointer.y);
    gl.uniform1f(at(simulation, 'uRadius'), target.r);
    gl.uniform1f(at(simulation, 'uDecay'), DECAY ** frames);
    gl.bindFramebuffer(gl.FRAMEBUFFER, write.framebuffer);
    gl.viewport(0, 0, grid.cols, grid.rows);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    targets = [write, read];

    /* проход 2: сводим снимки по свежему нагреву */
    gl.useProgram(draw);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, write.texture);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    /* курсор ушёл — досчитываем, пока догорает хвост */
    if (target.r > 0 || time < quietUntil) {
      frame = requestAnimationFrame(render);
    } else {
      frame = null;
      previous = 0;
    }
  };

  const run = () => {
    if (frame === null) frame = requestAnimationFrame(render);
  };

  resize();
  gl.useProgram(draw);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, targets[0].texture);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.drawArrays(gl.TRIANGLES, 0, 3); /* первый кадр без маски — подменяем <img> */
  canvas.dataset.ready = 'true';

  window.addEventListener('resize', () => {
    resize();
    run();
  });

  window.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType === 'touch') return; /* на тапе догонять нечего */

      target.x = event.clientX;
      target.y = event.clientY;
      target.r = RADIUS;
      quietUntil = performance.now() + FADE_MS;

      /* первое движение — ставим маску сразу под курсор, иначе она приедет
         из левого верхнего угла, зажигая клетки по дороге */
      if (!placed) {
        placed = true;
        pointer.x = target.x;
        pointer.y = target.y;
      }

      run();
    },
    { passive: true },
  );

  const hide = () => {
    target.r = 0;
    quietUntil = performance.now() + FADE_MS;
    run();
  };

  document.addEventListener('pointerleave', hide);
  window.addEventListener('blur', hide);
};

if (canvas && !reduced.matches) start();
