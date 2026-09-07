import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const page = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  build: {
    /* Знаки услуг весят по 4 КБ и попадали в CSS как data-URI, раздувая
       критический файл втрое. Порог опущен: мелкие svg-маски по-прежнему
       вшиваются, растровые знаки уезжают отдельными файлами. */
    assetsInlineLimit: 2048,

    rollupOptions: {
      // Multipage: новая страница = новый entry здесь.
      input: {
        index: page('./index.html'),
      },
    },
  },
});
