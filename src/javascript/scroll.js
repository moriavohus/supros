/**
 * Плавный скролл колесом и трекпадом: страница не прыгает на дельту сразу,
 * а догоняет цель по экспоненте — тот же приём, что у Lenis, но без зависимости.
 *
 * Трогаем только колесо. Тач, клавиатура и перетаскивание полосы прокрутки
 * работают нативно: у них своя инерция, ломать её нечем.
 */

const EASE = 0.12; /* доля оставшегося пути за кадр при 60 fps */
const FRAME = 1000 / 60;
const LINE = 16; /* Firefox шлёт дельту в строках, а не в пикселях */
const EPSILON = 0.5;

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

let target = window.scrollY;
let frame = null;
let previous = 0;

const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const stop = () => {
  frame = null;
  previous = 0;
};

const tick = (time) => {
  const current = window.scrollY;
  const distance = target - current;

  if (Math.abs(distance) < EPSILON) {
    window.scrollTo(0, target);
    stop();
    return;
  }

  /* поправка на частоту экрана: на 120 Гц кадр вдвое короче, шаг тоже */
  const elapsed = previous ? time - previous : FRAME;
  previous = time;
  const step = 1 - (1 - EASE) ** (elapsed / FRAME);

  window.scrollTo(0, current + distance * step);
  frame = requestAnimationFrame(tick);
};

window.addEventListener(
  'wheel',
  (event) => {
    if (reduced.matches || event.ctrlKey) return; /* ctrl + колесо — зум браузера */
    if (event.deltaY === 0) return;

    event.preventDefault();

    const delta = event.deltaMode === 1 ? event.deltaY * LINE : event.deltaY;
    target = clamp(target + delta, 0, maxScroll());

    if (frame === null) frame = requestAnimationFrame(tick);
  },
  { passive: false },
);

/* скролл не наш — клавиши, полоса, якорь: подхватываем позицию как цель */
window.addEventListener(
  'scroll',
  () => {
    if (frame === null) target = window.scrollY;
  },
  { passive: true },
);

window.addEventListener('resize', () => {
  target = clamp(window.scrollY, 0, maxScroll());
});
