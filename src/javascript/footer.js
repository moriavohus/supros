/**
 * Футер: на десктопе четыре колонки ссылок, на телефоне — аккордеон
 * (Figma 2338:22858). Колонки размечены <details>, поэтому без скрипта они
 * просто открыты. Скрипт только раскладывает состояние под ширину экрана:
 * на десктопе открыты все, на телефоне — первая.
 */

const columns = [...document.querySelectorAll('.M_FooterCol')];

if (columns.length) {
  const mobile = window.matchMedia('(max-width: 768px)');

  const sync = () => {
    columns.forEach((column, index) => {
      column.open = !mobile.matches || index === 0;
    });
  };

  mobile.addEventListener('change', sync);
  sync();
}
