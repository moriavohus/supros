/**
 * Мобильное меню: бургер разворачивает M_Nav панелью под шапкой.
 * Состояние держим на aria-expanded и data-open, отрисовка — в CSS.
 */

const toggle = document.querySelector('.A_NavToggle');
const nav = document.querySelector('.M_Nav');

if (toggle && nav) {
  const desktop = window.matchMedia('(min-width: 769px)');

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
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

  desktop.addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
}
