import {resolve} from 'node:path';
import {defineConfig} from 'vite';
import pkg from './package.json' with {type: 'json'};

// Онлайн-конструктор для GitHub Pages. Библиотека подключается из src/, поэтому конструктор всегда соответствует коду
export default defineConfig({
    root: 'site',
    base: './',
    define: {
        __VERSION__: JSON.stringify(pkg.version),
    },
    build: {
        outDir: resolve(import.meta.dirname, 'dist-site'),
        emptyOutDir: true,
        rollupOptions: {
            input: {
                index: resolve(import.meta.dirname, 'site/index.html'),
                preview: resolve(import.meta.dirname, 'site/preview.html'),
            },
        },
    },
});
