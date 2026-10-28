/**
 * Фоновое видео (data-play-in-view): без звука, по кругу. Грузится и играет,
 * только пока элемент рядом с экраном, за его пределами стоит на паузе —
 * видео тяжёлое, и тянуть его при загрузке страницы незачем. До первого
 * кадра виден poster. При prefers-reduced-motion видео не запускается и
 * остаётся poster; без скрипта — тоже.
 */

const videos = [...document.querySelectorAll('video[data-play-in-view]')];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (videos.length && !reducedMotion.matches) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting) {
          // play() отклоняется, если браузер запретил автозапуск, — тогда
          // просто остаётся poster
          target.play().catch(() => {});
        } else {
          target.pause();
        }
      });
    },
    { rootMargin: '200px 0px' },
  );

  videos.forEach((video) => observer.observe(video));
}
