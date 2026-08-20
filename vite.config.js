import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const page = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      // Multipage: новая страница = новый entry здесь.
      input: {
        index: page('./index.html'),
      },
    },
  },
});
