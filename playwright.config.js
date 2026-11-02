import {defineConfig, devices} from '@playwright/test';

const PORT = 4173;

export default defineConfig({
    testDir: 'tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['github'], ['list']] : 'list',
    use: {
        baseURL: `http://127.0.0.1:${PORT}`,
        trace: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                // В headless-режиме Chrome сообщает HeadlessChrome, и скрипт справедливо считает его ботом
                userAgent: devices['Desktop Chrome'].userAgent.replace('HeadlessChrome', 'Chrome'),
            },
        },
    ],
    webServer: {
        command: `node tests/e2e/server.js`,
        url: `http://127.0.0.1:${PORT}/build/pts.lazyload.min.js`,
        env: {PORT: String(PORT)},
        reuseExistingServer: !process.env.CI,
    },
});
