import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
// ⚠️  Update `site` with your actual GitHub username before deploying!
export default defineConfig({
  site: 'https://DenisLeonte.github.io',
  base: '/portfolio',
  output: 'static',
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  vite: {
    optimizeDeps: {
      include: ['three', 'gsap'],
    },
  },
});
