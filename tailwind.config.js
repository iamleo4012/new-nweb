/**
 * Local Tailwind build configuration — the staged replacement for the Tailwind
 * Play CDN (https://cdn.tailwindcss.com) still loaded by most public pages.
 *
 * The palette/typography below is copied verbatim from the runtime config the
 * pages load today (public/assets/js/tailwind-config.js), so the generated
 * CSS is visually identical to what the CDN produces. The CDN also runs with
 * the `forms` and `container-queries` plugins — both are included here.
 *
 * Build (writes public/assets/css/tailwind.css):
 *   npx tailwindcss -i tailwind.src.css -o public/assets/css/tailwind.css --minify
 *
 * Migration pattern per page (staged, one page at a time):
 *   1. remove the <script src="https://cdn.tailwindcss.com..."> tag
 *   2. remove the inline tailwind.config block (shared palette lives here now)
 *   3. add <link rel="stylesheet" href="/assets/css/tailwind.css">
 *   4. visually verify light + dark, desktop + mobile
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./public/**/*.html",
    "./public/assets/js/**/*.js",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "outline": "#74777c", "surface-variant": "#d8e4f3", "on-surface-variant": "#44474b",
        "on-background": "#111d27", "surface-container-low": "#edf4ff", "primary-container": "#131e29",
        "surface-bright": "#f7f9ff", "surface-dim": "#d0dbea", "inverse-on-surface": "#e8f1ff",
        "on-surface": "#111d27", "on-primary-fixed": "#111d27", "on-primary-container": "#7b8694",
        "secondary": "#825335", "secondary-container": "#fdbf99", "outline-variant": "#c4c6cc", "tertiary": "#090100",
        "error": "#ba1a1a", "surface-container-highest": "#d8e4f3", "surface-container-high": "#dee9f9",
        "surface-container": "#e4efff", "surface": "#f7f9ff", "surface-tint": "#545f6c",
        "background": "#f7f9ff", "on-tertiary-container": "#9e7e72", "primary-fixed": "#d8e4f3",
        "on-secondary": "#ffffff", "tertiary-container": "#2c1810", "inverse-primary": "#bcc8d7",
        "surface-container-lowest": "#ffffff", "on-secondary-container": "#794b2e",
        "primary": "#000308", "on-primary": "#ffffff", "tertiary-fixed": "#ffdbcd",
        "on-tertiary": "#ffffff", "secondary-fixed": "#ffdbc8", "secondary-fixed-dim": "#f7b994",
        "on-secondary-fixed": "#321300", "on-secondary-fixed-variant": "#673c20",
        "tertiary-fixed-dim": "#e3bfb1", "on-tertiary-fixed": "#2a170e",
        "on-tertiary-fixed-variant": "#5a4137", "on-error": "#ffffff",
        "on-error-container": "#93000a", "error-container": "#ffdad6",
        "inverse-surface": "#27313d", "on-primary-fixed-variant": "#3d4854",
        // Union additions from pages with their own inline palettes (kept so
        // each migrated page renders pixel-identically to its CDN version):
        // password-reset.html
        "primary-dark": "#0A1931", "light-accent": "#B3CFE5", "primary-blue": "#4A7FA7",
        "deep-blue": "#1A3D63", "surface-bg": "#F6FAFD",
      },
      fontFamily: {
        "headline": ["Manrope", "sans-serif"], "display": ["Manrope", "sans-serif"], "body": ["Inter", "sans-serif"], "label": ["Inter", "sans-serif"],
      },
      borderRadius: { "DEFAULT": "0.125rem", "lg": "0.25rem", "xl": "0.5rem", "full": "0.75rem" },
    },
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/container-queries")],
};
