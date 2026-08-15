Implementing the migration now. Investigation is complete — the functional pipeline from cleaning-tools.html is confirmed (/api/catalog → window.NASSIM_PRODUCTS → filter category === "Cleaning Tools" → existing card markup; wishlist via nassim_wishlist + /apiwishlist; cart via nassim_cart + /api/cart; nav via product-nav.js delegation on [data-slug]).

## Steps

**A. subcategoryui.html — replace demo data with real products (UI locked):**
1. Give the product grid `id="product-grid"` and remove the 5 hardcoded demo `<article>` cards. The grid wrapper div + all its classes stay.
2. Update text-only: `<title>`, the `<h1>` ("Gourmet Kitchenware" → "Cleaning Tools"), and the subtitle "124 Curated Objects" (→ dynamic count). No layout/CSS change.
3. Append a `<script>` before `</body>` that loads `/api/catalog`, filters `p.category === "Cleaning Tools"`, and renders one `<article>` per product using the EXACT existing card markup/classes (same `group flex flex-col bg-surface-container-lowest p-5 rounded-sm ...`, same heart button at `absolute top-4 right-4`, same `aspect-[4/5]` image, same font-headline name/price, same "Add To Cart" button), each carrying `data-slug="<p.id>"`. Dynamic count (N products → N cards).
4. Wire the existing heart → wishlist (nassim_wishlist {state:{items[]}} + POST/DELETE /api/wishlist, auth-gated via NassimAccount.getCurrentUser(), FILL state, persist on reload) and existing "Add To Cart" → cart (nassim_cart + POST /api/cart + NassimCartBadge.update()). Buttons call stopPropagation so they don't trigger nav.
5. Include shared functional scripts (no UI): `assets/js/cart-nav.js`, `assets/js/product-nav.js`, `assets/js/account.js` (defer). product-nav.js delegates clicks on `article.group`/`[data-slug]` → `product view.html?id=<slug>`.

**B. Repoint the Houseware→Cleaning Tools nav dropdown link in 22 storefront pages** (`href="cleaning-tools.html"` → `href="subcategoryui.html"`), one line each, no other change on those pages. NOT touched: the 4 `housewarePages` JS arrays (forklift/home-outdoor/kitchenware/rack) and the 3 houseware.html page-content links (bubble/explore/teaser).

**C. cleaning-tools.html left completely untouched.**

## Verification
- `git diff public/cleaning-tools.html` empty.
- subcategoryui.html diff = only: removed 5 demo articles, added id to grid, 3 text edits, appended 3 script tags + 1 data script.
- No cleaning-tools CSS/classes/card-design copied.
- Products flow from /api/catalog filtered by category === "Cleaning Tools".
- Heart/cart/nav wired to the same systems as the rest of the site.