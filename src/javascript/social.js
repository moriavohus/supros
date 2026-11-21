/**
 * Подсказка у карточек Social responsibility. Фото видно только у карточки
 * под курсором, и сам по себе посетитель об этом не догадается. Поэтому,
 * когда блок впервые попадает в экран, карточки по очереди слева направо
 * открываются и закрываются (класс is-peek, тот же вид, что при наведении):
 * волна показывает, что внутри есть снимки, и зовёт навести мышь.
 *
 * Только там, где есть наведение: на телефоне фото и так видны у всех
 * карточек. При prefers-reduced-motion волны нет. Если посетитель уже ведёт
 * мышь по блоку, волна обрывается, чтобы не спорить с курсором.
 */

import { ready } from './loader.js';

const grid = document.querySelector('.M_SocialGrid');
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// шаг между карточками и сколько каждая стоит открытой, мс
const STEP = 260;
const HOLD = 700;

if (grid && canHover.matches && !reducedMotion.matches) {
  const cards = [...grid.querySelectorAll('.T_SocialCard')];
  const timers = [];

  const stop = () => {
    timers.forEach(clearTimeout);
    cards.forEach((card) => card.classList.remove('is-peek'));
  };

  const peek = () => {
    cards.forEach((card, index) => {
      timers.push(
        setTimeout(() => card.classList.add('is-peek'), index * STEP),
        setTimeout(() => card.classList.remove('is-peek'), index * STEP + HOLD),
      );
    });
    grid.addEventListener('pointerenter', stop, { once: true });
  };

  ready.then(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        peek();
      },
      { threshold: 0.6 },
    );

    observer.observe(grid);
  });
}
