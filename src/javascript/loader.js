/**
 * Экран загрузки O_Loader. Сама анимация — на CSS (style.css), скрипт
 * держит прокрутку, пока панель закрывает страницу, убирает панель по
 * окончании и отдаёт обещание ready. Когда панель стёрта на 65%, как на
 * aspensearch.com, страница считается открытой: прокрутка отпускается и
 * текст начинает появляться. Прокрутку отпускаем до показа текста: с ней
 * возвращается полоса прокрутки и ширина страницы, а строки текста должны
 * считаться уже по окончательной ширине.
 *
 * В собранной версии скрипт стоит в HTML раньше стилей и может выполниться
 * до их загрузки — тогда у панели ещё нет анимации, а токены пусты. Поэтому
 * тайминг считается, только когда стили загружены.
 */

const loader = document.querySelector('.O_Loader');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const seconds = (name) =>
  parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) * 1000;

// все подключённые таблицы стилей загружены (в разработке их подключает Vite
// сам, и ждать нечего)
const stylesReady = () =>
  Promise.all(
    [...document.querySelectorAll('link[rel="stylesheet"]')].map((link) =>
      link.sheet
        ? null
        : new Promise((done) => {
            link.addEventListener('load', done, { once: true });
            link.addEventListener('error', done, { once: true });
          }),
    ),
  );

export const ready = new Promise((resolve) => {
  if (!loader || reducedMotion.matches) {
    loader?.setAttribute('data-done', '');
    resolve();
    return;
  }

  const root = document.documentElement;
  root.setAttribute('data-loading', '');

  const open = () => {
    root.removeAttribute('data-loading');
    resolve();
  };

  stylesReady().then(() => {
    // доля стирания, после которой страница считается открытой
    const threshold = 0.65;
    const wipe = loader
      .getAnimations()
      .find((animation) => animation.animationName === 'loader-wipe');
    const target = seconds('--loader-load') + seconds('--loader-wipe') * threshold;
    window.setTimeout(open, Math.max(0, target - (wipe?.currentTime ?? 0)) || 0);

    // панель могла уйти ещё до запуска скрипта — тогда убираем сразу
    const done = () => {
      loader.setAttribute('data-done', '');
      open();
    };
    (wipe ? wipe.finished : Promise.resolve()).then(done, done);
  });
});
