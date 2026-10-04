/**
 * Меню сайта — одна разметка на все ширины (O_Menu в шапке, разделы —
 * <details>). Отрисовку держит CSS, скрипт только раскладывает состояние.
 *
 * Шире 1280 разделы стоят в строку шапки и раскрываются выпадающими
 * панелями — по наведению и по клику. Уже 1280 бургер открывает меню
 * полноэкранной панелью (Figma 1Zd6…:1:1577): data-open на меню,
 * aria-expanded на кнопке, страница под панелью не прокручивается
 * (data-menu-open на <html>), все разделы по умолчанию свёрнуты и
 * раскрываются плавно — тем же аккордеоном, что футер (accordion.js).
 *
 * Выбор языка у логотипа — такой же раскрывающийся раздел.
 *
 * Везде открыт не больше чем один раздел. Esc, клик по ссылке, клик мимо
 * меню и смена раскладки всё сворачивают.
 */

import { accordion, isOpening } from './accordion.js';

const toggle = document.querySelector('.A_NavToggle');
const menu = document.querySelector('.O_Menu');

if (toggle && menu) {
  const narrow = window.matchMedia('(max-width: 1279px)');
  const header = toggle.closest('.O_Header');
  const groups = [...header.querySelectorAll('.M_MenuGroup')];
  const sections = groups.filter((group) => menu.contains(group));
  const panel = accordion(sections, () => narrow.matches);

  const closeGroups = (except) => {
    groups.forEach((group) => {
      if (group === except || !group.open) return;
      if (sections.includes(group)) panel.set(group, false);
      else group.open = false;
    });
  };

  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.toggleAttribute('data-open', open);
    document.documentElement.toggleAttribute('data-menu-open', open);
  };

  // закрытое меню сворачивает разделы сразу, без анимации
  const reset = () => {
    setOpen(false);
    panel.reset();
    groups.forEach((group) => {
      if (!sections.includes(group)) group.open = false;
    });
  };

  reset();

  toggle.addEventListener('click', () => {
    if (isOpen()) reset();
    else setOpen(true);
  });

  // раскрытие одного раздела сворачивает остальные
  groups.forEach((group) => {
    group.addEventListener('toggle', () => {
      if (isOpening(group)) closeGroups(group);
    });

    // на десктопе раздел раскрывается и наведением
    group.addEventListener('mouseenter', () => {
      if (!narrow.matches) group.open = true;
    });

    group.addEventListener('mouseleave', () => {
      if (!narrow.matches) group.open = false;
    });
  });

  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) reset();
  });

  document.addEventListener('click', (event) => {
    if (!narrow.matches && !header.contains(event.target)) closeGroups();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (isOpen()) {
      setOpen(false);
      toggle.focus();
    } else {
      closeGroups();
    }
  });

  narrow.addEventListener('change', reset);
}
