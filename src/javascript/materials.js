/**
 * Materials Supply: слои изоляции.
 * Слой раскрывается по наведению: подсвечивает своё кольцо на разрезе слева,
 * остальные гаснут до --dim, а сама карточка заливается слева направо.
 * Открыт всегда ровно один слой. Клик и фокус работают для тача и клавиатуры.
 */

const section = document.querySelector('.O_Materials');

if (section) {
  const layers = [...section.querySelectorAll('.T_Layer')];

  const open = (target) => {
    for (const layer of layers) {
      const isOpen = layer === target;
      layer.dataset.open = String(isOpen);
      layer.querySelector('.A_LayerToggle').setAttribute('aria-expanded', String(isOpen));
    }
    // схема слушает один атрибут на секции — подсветка живёт в CSS
    section.dataset.active = target.dataset.layer;
  };

  for (const layer of layers) {
    const toggle = layer.querySelector('.A_LayerToggle');
    // наведение — основной сценарий; клик оставлен для тача, фокус для клавиатуры
    layer.addEventListener('mouseenter', () => open(layer));
    toggle.addEventListener('focus', () => open(layer));
    toggle.addEventListener('click', () => open(layer));
  }

  // клавиатура: стрелки ходят по слоям, как в обычном аккордеоне
  section.addEventListener('keydown', (event) => {
    const current = layers.findIndex((l) => l.contains(event.target));
    if (current === -1) return;

    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
    if (!step) return;

    event.preventDefault();
    const next = layers[(current + step + layers.length) % layers.length];
    next.querySelector('.A_LayerToggle').focus();
  });

  const initial = layers.find((l) => l.dataset.open === 'true') || layers[0];
  if (initial) open(initial);
}
