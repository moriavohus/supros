/**
 * Экран загрузки O_Loader. Сама анимация — на CSS (style.css), скрипт
 * держит прокрутку, пока панель закрывает страницу, убирает панель по
 * окончании и отдаёт обещание ready. Когда панель стёрта на 65%, как на
 * aspensearch.com, страница считается открытой: прокрутка отпускается и
 * текст начинает появляться. Прокрутку отпускаем до показа текста: с ней
 * возвращается полоса прокрутки и ширина страницы, а строки текста должны
 * считаться уже по окончательной ширине.
 */

const loader = document.querySelector('.O_Loader');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const seconds = (name) =>
  parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) * 1000;

export const ready = new Promise((resolve) => {
  if (!loader || reducedMotion.matches) {
    loader?.setAttribute('data-done', '');
    resolve();
    return;
  }

  const root = document.documentElement;
  root.setAttribute('data-loading', '');

  // доля стирания, после которой страница считается открытой
  const threshold = 0.65;
  const wipe = loader.getAnimations().find((animation) => animation.animationName === 'loader-wipe');
  const target = seconds('--loader-load') + seconds('--loader-wipe') * threshold;
  const open = () => {
    root.removeAttribute('data-loading');
    resolve();
  };
  window.setTimeout(open, Math.max(0, target - (wipe?.currentTime ?? 0)));

  // панель могла уйти ещё до запуска скрипта — тогда убираем сразу
  const done = () => {
    loader.setAttribute('data-done', '');
    open();
  };
  (wipe ? wipe.finished : Promise.resolve()).then(done, done);
});
