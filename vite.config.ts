/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: './', // Important for relative paths in overlays
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                link: resolve(__dirname, 'link.html'),
            },
        },
    },
    test: {
        environment: 'jsdom',
    },
});
