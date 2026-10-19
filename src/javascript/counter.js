/**
 * Цифры, которые набегают: у элемента с data-count первое число в тексте
 * считается от нуля до своего значения за --count-time, всё вокруг числа
 * (+, m², M $, слово после) остаётся как есть. Счёт начинается, когда
 * элемент попадает в экран, но не раньше, чем экран загрузки открыл
 * страницу (loader.js), — вместе с появлением текста. Замедление к концу,
 * как у строк текста. Без скрипта и при prefers-reduced-motion число стоит
 * сразу итоговым.
 */

import { ready } from './loader.js';

const items = [...document.querySelectorAll('[data-count]')];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (items.length && !reducedMotion.matches) {
  // длительность читаем в момент счёта: в собранной версии скрипт может
  // выполниться раньше, чем применились стили, и токен ещё пуст
  const duration = () =>
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--count-time')) * 1000;

  // быстрый старт и долгий доезд к итоговому числу
  const easeOut = (t) => 1 - (1 - t) ** 4;

  const counters = items
    .map((item) => {
      const text = item.textContent;
      const match = text.match(/\d+/);
      if (!match) return null;
      const before = text.slice(0, match.index);
      const after = text.slice(match.index + match[0].length);
      const target = Number(match[0]);
      const show = (value) => {
        item.textContent = `${before}${value}${after}`;
      };
      show(0);
      return { item, target, show };
    })
    .filter(Boolean);

  const run = ({ target, show }) => {
    const time = duration();
    if (!(time > 0)) {
      show(target);
      return;
    }

    const start = performance.now();
    const step = (now) => {
      const progress = Math.min(1, Math.max(0, now - start) / time);
      show(Math.round(target * easeOut(progress)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  ready.then(() => {
    const byItem = new Map(counters.map((counter) => [counter.item, counter]));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          run(byItem.get(entry.target));
        });
      },
      { rootMargin: '0px 0px -10% 0px' },
    );

    counters.forEach(({ item }) => observer.observe(item));
  });
}
