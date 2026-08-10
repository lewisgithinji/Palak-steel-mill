import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    root: '.',
    publicDir: 'public',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                about: resolve(__dirname, 'about.html'),
                products: resolve(__dirname, 'products.html'),
                quality: resolve(__dirname, 'quality.html'),
                contact: resolve(__dirname, 'contact.html'),
                // Without this 404.html never reaches dist/, so the host serves
                // its own default error page instead of the branded one.
                notFound: resolve(__dirname, '404.html'),
            },
        },
    },
    server: {
        port: 3001,
        open: true,
    },
});
