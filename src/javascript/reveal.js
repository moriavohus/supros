/**
 * Появление текста по строкам (по образцу aspensearch.com). Элемент с
 * атрибутом data-reveal режется на строки: каждая строка — маска
 * A_RevealLine, в ней A_RevealLineText. Когда элемент попадает в экран, а
 * экран загрузки уже открыл страницу (loader.js), строки по очереди
 * выезжают из масок снизу и проявляются: --reveal-time, шаг
 * --reveal-stagger, кривая --ease-reveal.
 *
 * Строки определяются по тому, где браузер на самом деле перенёс слова.
 * Первый раз текст режется сразу — чтобы спрятать его до показа, — а перед
 * самым показом заново, по текущей ширине: пока висел экран загрузки, не было
 * полосы прокрутки и страница была шире, могла смениться и ширина окна.
 * После показа разметка возвращается как была — переносы снова живые. Без
 * скрипта и при prefers-reduced-motion текст просто стоит на месте.
 */

import { ready } from './loader.js';

const items = [...document.querySelectorAll('[data-reveal]')];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (items.length && !reducedMotion.matches) {
  const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const ms = (name) => parseFloat(token(name)) * 1000;

  const originals = new Map(items.map((item) => [item, item.innerHTML]));

  const span = (className) => {
    const node = document.createElement('span');
    node.className = className;
    return node;
  };

  // Слова — куски текста между обычными пробелами (неразрывный пробел
  // остаётся внутри слова), вложенный элемент — одно слово. <br> остаётся на
  // месте до замера: его перенос виден по положению слов, а сам он уходит
  // вместе со старой разметкой, когда строки собираются заново.
  const toWords = (item) => {
    const words = [];

    [...item.childNodes].forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const fragment = document.createDocumentFragment();
        node.data
          .split(/[ \t\n\r]+/)
          .filter(Boolean)
          .forEach((part) => {
            const word = document.createElement('span');
            word.textContent = part;
            words.push(word);
            fragment.append(word, ' ');
          });
        node.replaceWith(fragment);
      } else if (node.nodeType === Node.ELEMENT_NODE && node.nodeName !== 'BR') {
        words.push(node);
      }
    });

    return words;
  };

  const split = (item) => {
    item.innerHTML = originals.get(item);
    if (!item.getClientRects().length) return;

    const words = toWords(item);
    const lines = [];
    let top = null;

    words.forEach((word) => {
      const y = word.getBoundingClientRect().top;
      if (top === null || Math.abs(y - top) > 1) {
        lines.push([]);
        top = y;
      }
      lines.at(-1).push(word);
    });

    item.textContent = '';
    lines.forEach((line) => {
      const mask = span('A_RevealLine');
      const text = span('A_RevealLineText');
      line.forEach((word, index) => {
        if (index) text.append(' ');
        text.append(word);
      });
      mask.append(text);
      item.append(mask);
    });
  };

  const reveal = (item) => {
    split(item);
    const lines = [...item.querySelectorAll('.A_RevealLineText')];
    const timing = {
      duration: ms('--reveal-time'),
      easing: token('--ease-reveal'),
      fill: 'both',
    };

    const animations = lines.map((line, index) =>
      line.animate(
        [
          { opacity: 0, transform: 'translateY(100%)' },
          { opacity: 1, transform: 'none' },
        ],
        { ...timing, delay: index * ms('--reveal-stagger') },
      ),
    );

    Promise.all(animations.map((animation) => animation.finished)).then(
      () => {
        item.innerHTML = originals.get(item);
      },
      () => {},
    );
  };

  // режем, когда шрифты на месте: иначе переносы посчитаются по запасному
  document.fonts.ready.then(() => {
    items.forEach(split);

    ready.then(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            observer.unobserve(entry.target);
            reveal(entry.target);
          });
        },
        { rootMargin: '0px 0px -10% 0px' },
      );

      items.forEach((item) => observer.observe(item));
    });
  });
}
