import preset from '@parshlo/config/tailwind/preset';
import animate from 'tailwindcss-animate';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  presets: [preset],
  plugins: [animate, forms, typography],
} satisfies Config;
