/* home3.html ONLY — mobile-first FREE DELIVERY secondary bar.
   home1-specific copy of assets/js/secondary-nav.js, changed per the
   approved mobile design:
   - WHITE background (solid, not glass), full width, directly under the header.
   - NO fixed 5 KD pill: the bar is entirely dedicated to the announcement
     (the 5 KD notice lives above the bottom navigation instead).
   - Exactly ONE visible "FREE DELIVERY [truck]" unit: it enters from the
     left, crosses the full bar, fully exits through the clipped right edge,
     and loops seamlessly from the left (reset happens off-screen).
   - Same Material Symbols truck (local_shipping) and red as the desktop bar.
   - Arabic mirror support kept: when the page opts in via
     window.NASSIM_SECONDARY_NAV_ARABIC_MIRROR and html.lang-ar is active,
     the label is translated by the site i18n ("التوصيل مجاني"), the unit
     travels RIGHT → LEFT and the truck is mirrored to face travel. */
(function () {
    "use strict";

    var CONTENT_COLOR = "#ffffff"; /* white content on the black bar */ /* site "error" red — the palette's red */
    var SPEED = 60;      /* px per second — smooth, slow conveyor */

    var STYLE_ID = "home3-secondary-nav-style";
    var BAR_ID = "home3-secondary-nav";

    var CSS = [
        "#home3-secondary-nav{position:fixed;left:0;right:0;z-index:40;height:52px;background:#000000;border-bottom:1px solid rgba(255,255,255,0.15);display:flex;align-items:center;overflow:hidden;}",
        "#home3-secondary-nav *{box-sizing:border-box;}",
        "html.dark #home3-secondary-nav{background:#0a0f14;border-bottom-color:rgba(255,255,255,0.08);}",
        "#home3-secondary-nav .h3sn-track-area{position:relative;flex:1 1 auto;height:100%;overflow:hidden;pointer-events:none;}",
        "#home3-secondary-nav .h3sn-track{position:absolute;top:0;bottom:0;left:0;display:flex;align-items:center;will-change:transform;animation:h1snTruck var(--h3sn-duration,14s) linear infinite;}",
        "@keyframes h1snTruck{from{transform:translateX(-100%);}to{transform:translateX(var(--h3sn-end,100vw));}}",
        "#home3-secondary-nav .h3sn-unit{display:flex;align-items:center;gap:10px;flex-shrink:0;}",
        "#home3-secondary-nav .h3sn-free{font-family:inherit;font-size:16px;font-weight:900;letter-spacing:0.06em;color:" + CONTENT_COLOR + ";white-space:nowrap;}",
        "#home3-secondary-nav .h3sn-truck{font-size:24px !important;line-height:1;color:" + CONTENT_COLOR + ";flex-shrink:0;}",
        "#home3-secondary-nav.nssn-mirror .h3sn-track{animation-direction:reverse;}",
        "#home3-secondary-nav.nssn-mirror .h3sn-free{letter-spacing:0;font-weight:800;}",
        "#home3-secondary-nav.nssn-mirror .h3sn-truck{transform:scaleX(-1);}"
    ].join("\n");

    function buildUnit() {
        var unit = document.createElement("div");
        unit.className = "h3sn-unit";
        var label = document.createElement("span");
        label.className = "h3sn-free";
        label.textContent = "FREE DELIVERY";
        var truck = document.createElement("span");
        truck.className = "material-symbols-outlined h3sn-truck";
        truck.setAttribute("aria-hidden", "true");
        truck.textContent = "local_shipping";
        unit.appendChild(label);
        unit.appendChild(truck);
        return unit;
    }

    function build() {
        var nav = document.querySelector("nav.glass-nav");
        if (!nav || document.getElementById(BAR_ID)) return;


        if (!document.getElementById(STYLE_ID)) {
            var st = document.createElement("style");
            st.id = STYLE_ID;
            st.textContent = CSS;
            document.head.appendChild(st);
        }

        var bar = document.createElement("div");
        bar.id = BAR_ID;
        /* Arabic mirror (home1 opts in via window.NASSIM_SECONDARY_NAV_
           ARABIC_MIRROR + active lang-ar): unit travels RIGHT → LEFT, truck
           mirrored, label translated by the site i18n ("التوصيل مجاني"). */
        if (window.NASSIM_SECONDARY_NAV_ARABIC_MIRROR &&
            document.documentElement.classList.contains("lang-ar")) {
            bar.classList.add("nssn-mirror");
        }
        bar.setAttribute("role", "note");
        bar.setAttribute("aria-label", "Free delivery.");

        var area = document.createElement("div");
        area.className = "h3sn-track-area";
        var track = document.createElement("div");
        track.className = "h3sn-track";
        area.appendChild(track);
        bar.appendChild(area);

        function position() {
            var top = nav.offsetTop + nav.offsetHeight;
            if (nav.getBoundingClientRect().top > 0) top = nav.getBoundingClientRect().top + nav.offsetHeight;
            bar.style.top = '0px';
        }

        /* Single visible unit: measured travel = area width, duration derived
           from constant SPEED px/s. Re-measured on resize/fonts/lang change. */
        function measure() {
            if (!track.querySelector(".h3sn-unit")) track.appendChild(buildUnit());
            var areaW = area.offsetWidth;
            if (!areaW) return;
            var unitW = track.querySelector(".h3sn-unit").offsetWidth;
            if (!unitW) return;
            var end = Math.max(areaW, unitW);
            track.style.setProperty("--h3sn-end", end + "px");
            track.style.setProperty("--h3sn-duration", ((end + unitW) / SPEED).toFixed(2) + "s");
        }

        document.body.appendChild(bar);
        position();
        requestAnimationFrame(function () { position(); measure(); });
        window.addEventListener("resize", function () { position(); measure(); });
        window.addEventListener("pageshow", function () { position(); measure(); });
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(function () { position(); measure(); }).catch(function () {});
        }
        window.addEventListener("nassim-langchange", function () {
            setTimeout(function () { position(); measure(); }, 600);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", build);
    } else {
        build();
    }
})();
