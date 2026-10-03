/**
 * Слайдер первого экрана: снимки лежат стопкой фоном секции и сменяются
 * проявлением.
 *
 * Таймера нет. Ход слайда отмеряет сама полоса прогресса — её CSS-анимация
 * крутится по кругу, и каждый новый виток (animationiteration) переключает
 * снимок. Так полоса и смена кадра не могут разойтись, а в фоновой вкладке
 * браузер сам придерживает и то и другое.
 *
 * При prefers-reduced-motion слайдер не запускается: остаётся первый снимок.
 */

const hero = document.querySelector('.O_Hero');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

if (hero) {
  const slides = [...hero.querySelectorAll('.A_HeroSlide')];
  const fill = hero.querySelector('.A_SlideProgressFill');
  let index = 0;

  const show = (next) => {
    slides[index].removeAttribute('data-active');
    index = next % slides.length;
    slides[index].setAttribute('data-active', '');
  };

  fill.addEventListener('animationiteration', () => show(index + 1));

  const sync = () => hero.toggleAttribute('data-run', !reduced.matches && slides.length > 1);

  reduced.addEventListener('change', sync);
  sync();
}
