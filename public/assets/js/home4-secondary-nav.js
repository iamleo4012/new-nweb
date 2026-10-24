/* home4.html ONLY — mobile-first FREE DELIVERY secondary bar.
   home4-specific copy of the home1 bar (same position/structure) with two
   changes requested for this experiment:
   - RED container (#ba1a1a, the site palette red) with WHITE content.
   - Seamless continuous feed: TWO identical units spaced gap =
     animationWidth − unitWidth apart, so while one sentence exits at the
     right boundary the next is already entering from the left — the ending
     continues directly from the beginning. The track advances by exactly
     animationWidth per iteration → pixel-identical loop point: no jump, no
     empty pause, at most one complete sentence visible. Constant SPEED px/s.
   - Same Material Symbols truck (local_shipping) as the rest of the site.
   - Arabic mirror support kept: when the page opts in via
     window.NASSIM_SECONDARY_NAV_ARABIC_MIRROR and html.lang-ar is active,
     the label is translated by the site i18n ("التوصيل مجاني"), the unit
     travels RIGHT → LEFT and the truck is mirrored to face travel. */
(function () {
    "use strict";

    var BAR_COLOR = "#ba1a1a";     /* site "error" red — the red container */
    var CONTENT_COLOR = "#ffffff"; /* white FREE DELIVERY text + truck */
    var SPEED = 60;                /* px per second — smooth, slow conveyor */

    var STYLE_ID = "home4-secondary-nav-style";
    var BAR_ID = "home4-secondary-nav";

    var CSS = [
        "#home4-secondary-nav{position:fixed;left:0;right:0;z-index:40;height:52px;background:#000000;border-bottom:1px solid rgba(255,255,255,0.2);display:flex;align-items:center;overflow:hidden;}",
        "#home4-secondary-nav *{box-sizing:border-box;}",
        "#home4-secondary-nav .h4sn-track-area{position:relative;flex:1 1 auto;height:100%;overflow:hidden;pointer-events:none;}",
        "#home4-secondary-nav .h4sn-track{position:absolute;top:0;bottom:0;left:0;display:flex;align-items:center;will-change:transform;animation:h4snConveyor var(--h4sn-duration,14s) linear infinite;}",
        "@keyframes h4snConveyor{from{transform:translateX(calc(-1 * var(--h4sn-loop,0px)));}to{transform:translateX(0);}}",
        "#home4-secondary-nav .h4sn-unit{display:flex;align-items:center;gap:10px;flex-shrink:0;}",
        "#home4-secondary-nav .h4sn-free{font-family:inherit;font-size:16px;font-weight:900;letter-spacing:0.06em;color:" + CONTENT_COLOR + ";white-space:nowrap;}",
        "#home4-secondary-nav .h4sn-truck{font-size:24px !important;line-height:1;color:" + CONTENT_COLOR + ";flex-shrink:0;}",
        "#home4-secondary-nav.nssn-mirror .h4sn-track{animation-direction:reverse;}",
        "#home4-secondary-nav.nssn-mirror .h4sn-free{letter-spacing:0;font-weight:800;}",
        "#home4-secondary-nav.nssn-mirror .h4sn-truck{transform:scaleX(-1);}"
    ].join("\n");

    function buildUnit() {
        var unit = document.createElement("div");
        unit.className = "h4sn-unit";
        var label = document.createElement("span");
        label.className = "h4sn-free";
        label.textContent = "FREE DELIVERY";
        var truck = document.createElement("span");
        truck.className = "material-symbols-outlined h4sn-truck";
        truck.setAttribute("aria-hidden", "true");
        truck.textContent = "local_shipping";
        unit.appendChild(label);
        unit.appendChild(truck);
        return unit;
    }

    function build() {
        var nav = document.querySelector("nav.glass-nav");
        if (!nav || document.getElementById(BAR_ID)) return;

        nav.style.boxShadow = "none"; /* keep the two header rows seamless */

        if (!document.getElementById(STYLE_ID)) {
            var st = document.createElement("style");
            st.id = STYLE_ID;
            st.textContent = CSS;
            document.head.appendChild(st);
        }

        var bar = document.createElement("div");
        bar.id = BAR_ID;
        /* Arabic mirror (home4 opts in via window.NASSIM_SECONDARY_NAV_
           ARABIC_MIRROR + active lang-ar): unit travels RIGHT → LEFT, truck
           mirrored, label translated by the site i18n ("التوصيل مجاني"). */
        if (window.NASSIM_SECONDARY_NAV_ARABIC_MIRROR &&
            document.documentElement.classList.contains("lang-ar")) {
            bar.classList.add("nssn-mirror");
        }
        bar.setAttribute("role", "note");
        bar.setAttribute("aria-label", "Free delivery.");

        var area = document.createElement("div");
        area.className = "h4sn-track-area";
        var track = document.createElement("div");
        track.className = "h4sn-track";
        area.appendChild(track);
        bar.appendChild(area);

        function position() {
            var top = nav.offsetTop + nav.offsetHeight;
            if (nav.getBoundingClientRect().top > 0) top = nav.getBoundingClientRect().top + nav.offsetHeight;
            bar.style.top = Math.max(0, top - 1) + "px";
        }

        /* Continuous feed: TWO identical units spaced gap = animationWidth −
           unitWidth apart, so while one sentence exits at the right boundary
           the next is already entering from the left — the ending continues
           directly from the beginning. The track advances by exactly
           animationWidth per iteration → pixel-identical loop point, no
           jump/pause, at most one complete sentence visible. Constant speed. */
        function measure() {
            while (track.children.length < 2) track.appendChild(buildUnit());
            var areaW = area.offsetWidth;
            if (!areaW) return;
            var unitW = track.querySelector(".h4sn-unit").offsetWidth;
            if (!unitW) return;
            var gap = Math.max(60, areaW - unitW);
            track.children[0].style.marginRight = gap + "px";
            var loop = unitW + gap;
            track.style.setProperty("--h4sn-loop", loop + "px");
            track.style.setProperty("--h4sn-duration", (loop / SPEED).toFixed(2) + "s");
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
