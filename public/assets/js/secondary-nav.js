/* NASSIM secondary navigation / announcement bar.
   Injects a full-width bar directly underneath the existing fixed top
   navigation (nav.glass-nav) on every page that loads this script, styled
   with the same glass treatment so the two rows read as one header.

   - Left/moving: a seamless conveyor of identical units — each unit is
     "FREE DELIVERY" (red, bold) on the LEFT and the Material Symbols
     `local_shipping` truck (same icon as the cart.html delivery notice) on
     the RIGHT. The whole track travels LEFT → RIGHT continuously; while one
     unit exits at the right boundary, the next is already entering from the
     left. No jump, no teleport, no empty pause.
   - Right/fixed: informational pill "We only accept orders above 5 KD."
     (not clickable). The animation area ends BEFORE the pill, so the moving
     content can never reach or cover it.
   - Uses existing AL-Nassim palette only (error red #ba1a1a, glass nav
     surface, outline-variant neutrals, primary dark text). */
(function () {
    "use strict";

    var RED = "#ba1a1a"; /* site "error" red — the palette's red */
    var SPEED = 120;      /* conveyor speed, px per second (smooth + slow) */

    var STYLE_ID = "nassim-secondary-nav-style";
    var BAR_ID = "nassim-secondary-nav";

    var CSS = [
        /* Same glass treatment as the existing top navigation (nav.glass-nav):
           translucent light surface + 20px backdrop blur, dark variant too.
           No border, no own top-side shadow, no separator line. The header's
           depth shadow (identical to the nav's original one) is applied at the
           BOTTOM of this bar instead, so the combined two-row header keeps its
           depth while the boundary between the rows stays completely clean. */
        "#nassim-secondary-nav{position:fixed;left:0;right:0;z-index:40;height:64px;background:rgba(247,249,255,0.7);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);box-shadow:0 40px 60px rgba(0,3,8,0.04);display:flex;align-items:center;}",
        "#nassim-secondary-nav *{box-sizing:border-box;}",
        "html.dark #nassim-secondary-nav{background:rgba(10,15,20,0.9);}",
        /* Dedicated clipped animation area occupying everything LEFT of the
           fixed pill — its right edge lines up exactly with the pill's left
           edge, and the conveyor can never reach or cover the pill. */
        "#nassim-secondary-nav .nssn-track-area{position:relative;flex:1 1 auto;height:100%;overflow:hidden;pointer-events:none;}",
        /* Continuous feed: TWO identical units spaced so that when one unit's
           front touches the right boundary, the next unit's front is exactly
           at the left boundary (gap = animationWidth - unitWidth). The whole
           track glides LEFT → RIGHT by exactly ONE segment (unit + gap =
           animationWidth) per iteration, so the loop point is pixel-identical
           to the start: the exiting sentence is seamlessly replaced by the
           entering one. Only one complete sentence is ever visible because
           the gap equals the leftover space. Speed constant at SPEED px/s. */
        "#nassim-secondary-nav .nssn-track{position:absolute;top:0;bottom:0;left:0;display:flex;align-items:center;will-change:transform;animation:nssnConveyor var(--nssn-duration,14s) linear infinite;}",
        "@keyframes nssnConveyor{from{transform:translateX(calc(-1 * var(--nssn-loop,0px)));}to{transform:translateX(0);}}",
        "#nassim-secondary-nav .nssn-unit{display:flex;align-items:center;gap:10px;flex-shrink:0;}",
        "#nassim-secondary-nav .nssn-free{font-family:inherit;font-size:28px;font-weight:900;letter-spacing:0.06em;color:" + RED + ";white-space:nowrap;}",
        "#nassim-secondary-nav .nssn-truck{font-size:30px !important;line-height:1;color:" + RED + ";flex-shrink:0;}",
        /* Arabic mirror mode: the same unit travels RIGHT → LEFT (reverse of
           the keyframes = seamless in the opposite direction), and the label
           is translated by the site i18n ("free delivery" → "التوصيل مجاني").
           letter-spacing is removed for the connected Arabic script. */
        "#nassim-secondary-nav.nssn-mirror .nssn-track{animation-direction:reverse;}",
        "#nassim-secondary-nav.nssn-mirror .nssn-free{letter-spacing:0;font-weight:800;}",
        /* Arabic mode: mirror the truck horizontally so it faces the direction
           of travel (the unit moves right → left). */
        "#nassim-secondary-nav.nssn-mirror .nssn-truck{transform:scaleX(-1);}",
        /* Fixed informational pill on the right. */
        "#nassim-secondary-nav .nssn-pill{flex:0 0 auto;margin-left:16px;margin-right:16px;background:#ffffff;border:1px solid #c4c6cc;border-radius:9999px;padding:10px 18px;color:#111d27;font-size:13px;font-weight:600;white-space:nowrap;pointer-events:none;box-shadow:0 2px 8px rgba(0,3,8,0.06);}",
        "html.dark #nassim-secondary-nav .nssn-pill{background:#141a22;border-color:rgba(255,255,255,0.2);color:#ffffff;}",
        /* Mobile: shorter bar, smaller truck/text/pill. */
        "@media (max-width:767px){",
        "  #nassim-secondary-nav{height:52px;}",
        "  #nassim-secondary-nav .nssn-unit{margin-right:120px;}",
        "  #nassim-secondary-nav .nssn-truck{font-size:22px !important;}",
        "  #nassim-secondary-nav .nssn-free{font-size:20px;}",
        "  #nassim-secondary-nav .nssn-pill{margin-left:8px;margin-right:8px;padding:6px 12px;font-size:11px;max-width:52vw;overflow:hidden;text-overflow:ellipsis;}",
        "}"
    ].join("\n");

    function buildUnit() {
        var unit = document.createElement("div");
        unit.className = "nssn-unit";
        var label = document.createElement("span");
        label.className = "nssn-free";
        label.textContent = "FREE DELIVERY";
        var truck = document.createElement("span");
        truck.className = "material-symbols-outlined nssn-truck";
        truck.setAttribute("aria-hidden", "true");
        truck.textContent = "local_shipping";
        unit.appendChild(label);
        unit.appendChild(truck);
        return unit;
    }

    function build() {
        var nav = document.querySelector("nav.glass-nav");
        if (!nav || document.getElementById(BAR_ID)) return;

        /* The nav's own downward shadow (0 40px 60px rgba(0,3,8,0.04)) paints a
           faint dark band across the secondary bar's top — a visual partition.
           Move it: the nav loses its shadow and the bar carries the identical
           shadow at the bottom of the combined header instead. */
        nav.style.boxShadow = "none";

        if (!document.getElementById(STYLE_ID)) {
            var st = document.createElement("style");
            st.id = STYLE_ID;
            st.textContent = CSS;
            document.head.appendChild(st);
        }

        var bar = document.createElement("div");
        bar.id = BAR_ID;
        /* Arabic mirror mode (page opt-in via window.NASSIM_SECONDARY_NAV_
           ARABIC_MIRROR + active lang-ar, e.g. home.html): the announcement
           reads "التوصيل مجاني", travels RIGHT → LEFT, and the fixed pill
           sits on the LEFT. English pages are completely unaffected. */
        var mirror = window.NASSIM_SECONDARY_NAV_ARABIC_MIRROR &&
                     document.documentElement.classList.contains("lang-ar");
        if (mirror) bar.classList.add("nssn-mirror");
        bar.setAttribute("role", "note");
        bar.setAttribute("aria-label", "Free delivery. We only accept orders above 5 KD.");

        var pill = document.createElement("div");
        pill.className = "nssn-pill";
        pill.textContent = "We only accept orders above 5 KD.";

        var area = document.createElement("div");
        area.className = "nssn-track-area";
        var track = document.createElement("div");
        track.className = "nssn-track";
        area.appendChild(track);
        /* Mirror mode: pill rendered first so it sits on the LEFT side. */
        if (mirror) { bar.appendChild(pill); bar.appendChild(area); }
        else { bar.appendChild(area); bar.appendChild(pill); }

        /* Sit flush against the bottom of the existing fixed top nav (1px
           overlap kills any sub-pixel seam) so the two rows read as one
           continuous header; keep following it on resize. */
        function position() {
            var top = nav.offsetTop + nav.offsetHeight;
            if (nav.getBoundingClientRect().top > 0) top = nav.getBoundingClientRect().top + nav.offsetHeight;
            bar.style.top = Math.max(0, top - 1) + "px";
        }

        /* Continuous-feed setup: the conveyor width (animationWidth) is the
           clipped area ONLY — it ends exactly at the pill's left edge and
           never uses the full navbar width. Two identical units are spaced
           gap = animationWidth − unitWidth apart, so while one sentence exits
           at the right boundary the next is already entering at the left, and
           at most ONE complete sentence is visible. The track advances by
           exactly animationWidth per iteration → pixel-identical loop point,
           seamless. Speed stays constant at SPEED px/s. */
        function measure() {
            while (track.children.length < 2) track.appendChild(buildUnit());
            var areaW = area.offsetWidth;
            if (!areaW) return;
            var unitW = track.querySelector(".nssn-unit").offsetWidth;
            if (!unitW) return;
            var gap = Math.max(60, areaW - unitW);
            track.children[0].style.marginRight = gap + "px";
            var loop = unitW + gap;
            track.style.setProperty("--nssn-loop", loop + "px");
            track.style.setProperty("--nssn-duration", (loop / SPEED).toFixed(2) + "s");
        }

        /* Attach to the document FIRST: offsetWidth is 0 while the bar is
           detached, which previously made measure() bail and left the
           conveyor empty. Then lay out and measure on the next frame so all
           widths (including webfonts) are settled. */
        document.body.appendChild(bar);
        position();
        requestAnimationFrame(function () { position(); measure(); });
        window.addEventListener("resize", function () { position(); measure(); });
        window.addEventListener("pageshow", function () { position(); measure(); });
        /* Re-measure once webfonts settle (FREE DELIVERY width can change). */
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(function () { position(); measure(); }).catch(function () {});
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", build);
    } else {
        build();
    }
    /* Language toggle: the mirror mode depends on the active language, so
       rebuild the bar when it changes (EN layout ↔ AR mirrored layout). A
       second delayed rebuild runs after the i18n observer has translated the
       label, so the loop distance matches the Arabic text width. */
    window.addEventListener("nassim-langchange", function () {
        var existing = document.getElementById(BAR_ID);
        if (existing) existing.remove();
        if (document.readyState === "loading") return;
        setTimeout(build, 50);
        setTimeout(build, 600);
    });
})();
