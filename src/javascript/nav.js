/**
 * Мобильное меню: бургер разворачивает M_Nav панелью под хедером.
 * Состояние держим на data-open + aria-expanded, вся отрисовка — в CSS.
 */

const toggle = document.querySelector('.A_NavToggle');
const nav = document.querySelector('.M_Nav');

if (toggle && nav) {
  const desktop = window.matchMedia('(min-width: 769px)');

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav.dataset.open = String(open);
  };

  setOpen(false);

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });

  // на десктопе меню всегда развёрнуто — закрываем, чтобы состояние не залипло
  desktop.addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
}
