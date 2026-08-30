/** Admin build config — the bare Play CDN the admin/superadmin layouts
 *  loaded had NO runtime config and NO plugins: default theme, preflight +
 *  utilities only. This config reproduces that exactly (content globs and
 *  darkMode only — no theme.extend, so border radii, palette and fonts stay
 *  Tailwind defaults, unlike the storefront build which overrides them).
 *  Build: npm run build:css:admin */
const base = require("./tailwind.config.js");
module.exports = { content: base.content, darkMode: base.darkMode };
