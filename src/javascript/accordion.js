/**
 * Аккордеон разделов M_MenuGroup — один компонент для раскрытого меню и
 * футера. Раздел — <details>: строка summary и список подпунктов
 * M_MenuLinks.
 *
 * Пока active() истинно, клик по строке ведёт скрипт, а не сам <details>:
 * раздел раскрывается и сворачивается плавной высотой подпунктов, как Smart
 * Animate в макете (токен --smart-animate, ease-out), и открытый раздел
 * сворачивает остальные. Сворачивание держит <details> открытым до конца
 * анимации, data-closing сразу переключает значок. Повторный клик посреди
 * анимации разворачивает её от текущей высоты. Вне active() и при
 * prefers-reduced-motion разделы переключаются сразу.
 */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const duration = () =>
  parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--smart-animate')) * 1000;

export const isOpening = (group) => group.open && !group.hasAttribute('data-closing');

export function accordion(groups, active) {
  const linksOf = (group) => group.querySelector('.M_MenuLinks');

  // обрывает анимацию и снимает её следы
  const stop = (group) => {
    const links = linksOf(group);
    links?.getAnimations().forEach((animation) => animation.cancel());
    links?.style.removeProperty('overflow');
    group.removeAttribute('data-closing');
  };

  const set = (group, open) => {
    const links = linksOf(group);

    if (!links || !active() || reducedMotion.matches) {
      stop(group);
      group.open = open;
      return;
    }

    if (isOpening(group) === open) return;

    const from = group.open ? links.getBoundingClientRect().height : 0;
    links.getAnimations().forEach((animation) => animation.cancel());
    group.toggleAttribute('data-closing', !open);
    group.open = true;

    const style = getComputedStyle(links);
    const shown = { height: `${links.scrollHeight}px`, marginBottom: style.marginBottom, opacity: 1 };
    const hidden = { height: '0px', marginBottom: '0px', opacity: 0 };
    const animation = links.animate(
      [{ ...(open ? hidden : shown), height: `${from}px` }, open ? shown : hidden],
      { duration: duration(), easing: 'ease-out' },
    );

    links.style.overflow = 'hidden';
    animation.addEventListener('finish', () => {
      links.style.removeProperty('overflow');
      if (open) return;
      group.removeAttribute('data-closing');
      group.open = false;
    });
  };

  const closeOthers = (except) => {
    groups.forEach((group) => {
      if (group !== except && group.open) set(group, false);
    });
  };

  // сразу, без анимации; state(group, index) — открыт ли раздел
  const reset = (state = () => false) => {
    groups.forEach((group, index) => {
      stop(group);
      group.open = state(group, index);
    });
  };

  groups.forEach((group) => {
    group.querySelector('summary').addEventListener('click', (event) => {
      if (!active()) return;
      event.preventDefault();
      const open = !isOpening(group);
      if (open) closeOthers(group);
      set(group, open);
    });
  });

  return { set, closeOthers, reset };
}
