/**
 * Футер: на десктопе разделы колонками, уже 1280 — тот же аккордеон
 * разделов, что в раскрытом меню (accordion.js, Figma 1Zd6…:1:2183).
 * Колонки размечены <details>, поэтому без скрипта они просто открыты.
 * Скрипт раскладывает состояние под ширину экрана: на десктопе открыты все,
 * в аккордеоне, как в меню, все свёрнуты.
 */

import { accordion } from './accordion.js';

const columns = [...document.querySelectorAll('.O_Footer .M_MenuGroup')];

if (columns.length) {
  const narrow = window.matchMedia('(max-width: 1279px)');
  const footer = accordion(columns, () => narrow.matches);

  const sync = () => footer.reset(() => !narrow.matches);

  narrow.addEventListener('change', sync);
  sync();
}
