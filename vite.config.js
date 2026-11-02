import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {defineConfig} from 'vite';
import {Features} from 'lightningcss';
import pkg from './package.json' with {type: 'json'};

const banner = `/*!
 * pts-lazyload v${pkg.version}
 * ${pkg.description}
 * https://github.com/ak-alz/pts-lazyload
 */`;

export default defineConfig(({mode}) => {
    const min = mode === 'min';
    const name = min ? 'pts.lazyload.min' : 'pts.lazyload';

    return {
        plugins: [
            {
                name: 'css-banner',
                writeBundle({dir}, bundle) {
                    for (const fileName of Object.keys(bundle)) {
                        if (!fileName.endsWith('.css')) continue;
                        const path = resolve(dir, fileName);
                        writeFileSync(path, `${banner}\n${readFileSync(path, 'utf8')}`);
                    }
                },
            },
        ],
        define: {
            __VERSION__: JSON.stringify(pkg.version),
        },
        // Без префиксов -webkit-*: они нужны только старому Safari для косметики (размытие фона, подчёркивание),
        // а W3C CSS Validator выдаёт на них предупреждения
        css: {
            lightningcss: {exclude: Features.VendorPrefixes},
        },
        test: {
            environment: 'jsdom',
            include: ['tests/unit/**/*.test.js'],
        },
        build: {
            outDir: 'build',
            emptyOutDir: !min,
            target: 'es2018',

            minify: min,
            cssMinify: min,
            lib: {
                entry: 'src/index.js',
                name: 'PtsLazyLoad',
                formats: ['umd'],
                fileName: () => `${name}.js`,
                cssFileName: name,
            },
            rollupOptions: {
                output: {
                    postBanner: banner,
                },
            },
        },
    };
});
