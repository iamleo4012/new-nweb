/* home5.html ONLY — mobile-first FREE DELIVERY secondary bar.
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

    var RED = "#ba1a1a"; /* site "error" red — the palette's red */
    var SPEED = 60;      /* px per second — smooth, slow conveyor */

    var STYLE_ID = "home5-secondary-nav-style";
    var BAR_ID = "home5-secondary-nav";

    var CSS = [
        "#home5-secondary-nav{position:fixed;left:0;right:0;z-index:40;height:52px;background:#ffffff;border-bottom:1px solid rgba(0,3,8,0.06);display:flex;align-items:center;overflow:hidden;}",
        "#home5-secondary-nav *{box-sizing:border-box;}",
        /* Desktop glass bar: the shared CSS keyframe loop is disabled and
           the track is driven by the JavaScript conveyor below (class
           .h5conv is added once the engine has taken over, so the no-JS
           fallback keeps the shared behaviour). Units are ordinary flex
           children again — the engine owns the track's inline gap and its
           per-frame translate3d. direction:ltr keeps the physical slot
           order stable on the Arabic (RTL) page; the label/truck styling
           is untouched. Mobile (<=767px) never sees this: the glass bar is
           display:none there and the engine never starts. */
        "@media (min-width:768px){#nassim-secondary-nav.h5conv .nssn-track{animation:none !important;direction:ltr !important;}#nassim-secondary-nav.h5conv .nssn-unit{margin:0 !important;}}",
        "html.dark #home5-secondary-nav{background:#0a0f14;border-bottom-color:rgba(255,255,255,0.08);}",
        /* MOBILE white bar: the SAME seamless looping technique as home.html
           (assets/js/secondary-nav.js) — TWO identical units, gap =
           animationWidth − unitWidth on the first unit, track advances by
           exactly ONE segment (unit + gap) per iteration → pixel-identical
           wrap point: the exiting sentence is seamlessly replaced by the
           entering one, at most ONE complete unit visible, no gap, no reset.
           60px/s. Scoped strictly to <=767px; desktop untouched. */
        "@media (max-width:767px){#home5-secondary-nav .h5sn-track{animation:h5mconv var(--h5sn-duration,14s) linear infinite;}@keyframes h5mconv{from{transform:translateX(calc(-1 * var(--h5sn-loop,0px)));}to{transform:translateX(0);}}}",
        "#home5-secondary-nav .h5sn-unit{display:flex;align-items:center;gap:10px;flex-shrink:0;}",
        "#home5-secondary-nav .h5sn-track-area{position:relative;flex:1 1 auto;height:100%;overflow:hidden;pointer-events:none;}",
        "#home5-secondary-nav .h5sn-track{position:absolute;top:0;bottom:0;left:0;display:flex;align-items:center;will-change:transform;direction:ltr;}",
        "#home5-secondary-nav .h5sn-free{font-family:inherit;font-size:16px;font-weight:900;letter-spacing:0.06em;color:" + RED + ";white-space:nowrap;}",
        "#home5-secondary-nav .h5sn-truck{font-size:24px !important;line-height:1;color:" + RED + ";flex-shrink:0;}",
        "#home5-secondary-nav.nssn-mirror .h5sn-track{animation-direction:reverse;}",
        /* Arabic: truck on the LEFT of the sentence. */
        "#home5-secondary-nav.nssn-mirror .h5sn-unit{flex-direction:row-reverse;}",
        "#home5-secondary-nav.nssn-mirror .h5sn-free{letter-spacing:0;font-weight:800;}",
        "#home5-secondary-nav.nssn-mirror .h5sn-truck{transform:scaleX(-1);}"
    ].join("\n");

    function buildUnit() {
        var unit = document.createElement("div");
        unit.className = "h5sn-unit";
        var label = document.createElement("span");
        label.className = "h5sn-free";
        label.textContent = "FREE DELIVERY";
        var truck = document.createElement("span");
        truck.className = "material-symbols-outlined h5sn-truck";
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
        area.className = "h5sn-track-area";
        var track = document.createElement("div");
        track.className = "h5sn-track";
        area.appendChild(track);
        bar.appendChild(area);

        function position() {
            var top = nav.offsetTop + nav.offsetHeight;
            if (nav.getBoundingClientRect().top > 0) top = nav.getBoundingClientRect().top + nav.offsetHeight;
            bar.style.top = Math.max(0, top - 1) + "px";
        }

        /* MOBILE loop: the home.html technique — exactly TWO identical units,
           gap = animationWidth − unitWidth on the first unit, loop distance
           = unit + gap, pixel-identical wrap, at most ONE unit visible,
           60px/s. (Desktop glass bar is untouched — this bar is mobile-only.) */
        function measure() {
            while (track.children.length < 2) track.appendChild(buildUnit());
            var areaW = area.offsetWidth;
            if (!areaW) return;
            var unitW = track.querySelector(".h5sn-unit").offsetWidth;
            if (!unitW) return;
            var gap = Math.max(60, areaW - unitW);
            /* Logical inline-end margin: the gap must sit BETWEEN the two
               units in both directions (LTR: right of unit 1; RTL/Arabic:
               left of unit 1) — a physical margin-right would land outside
               the pair in RTL and leave the bar empty mid-cycle. */
            track.children[0].style.marginInlineEnd = gap + "px";
            var loop = unitW + gap;
            track.style.setProperty("--h5sn-loop", loop + "px");
            track.style.setProperty("--h5sn-duration", (loop / SPEED).toFixed(2) + "s");
        }

        /* Keep the desktop glass secondary bar (shared secondary-nav.js) out
           of the mobile layout. */
        var extra = document.getElementById(STYLE_ID + "-extra");
        if (!extra) {
            extra = document.createElement("style");
            extra.id = STYLE_ID + "-extra";
            extra.textContent = "html.h5s-mobile #nassim-secondary-nav{display:none !important;}";
            document.head.appendChild(extra);
        }

        /* Responsive switching: the home5 bar exists only in the mobile
           state; crossing the 767px breakpoint immediately swaps between the
           mobile white bar and the desktop glass bar — no reload needed. */
        var mq = window.matchMedia("(max-width: 767px)");
        function sync() {
            var bar = document.getElementById(BAR_ID);
            if (mq.matches) {
                document.documentElement.classList.add("h5s-mobile");
                if (!bar) { build(); return; } /* build() appends + measures */
                bar.style.display = "";
                position(); measure();
            } else {
                document.documentElement.classList.remove("h5s-mobile");
                if (bar) bar.style.display = "none";
            }
        }
        if (mq.matches) document.documentElement.classList.add("h5s-mobile");
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
        function onSwitch() {
            document.documentElement.classList.toggle("h5s-mobile", mq.matches);
            sync();
        }
        mq.addEventListener ? mq.addEventListener("change", onSwitch)
                            : mq.addListener(onSwitch);
        onSwitch();

        /* ---- DESKTOP (>=768px): seamless infinite FREE DELIVERY strip ----
           The classic (and the only provably seamless) marquee technique,
           the same one the working mobile bar uses, generalised: a track
           of N identical units, translated continuously by
           requestAnimationFrame from elapsed time (SPEED px/s — English
           LEFT → RIGHT, Arabic RIGHT → LEFT).
             period  = containerWidth / 3          (three equal sections;
                                                    floored only so units
                                                    can never overlap)
             gap     = period − unitWidth          (unitWidth = real
                                                    rendered width of
                                                    FREE DELIVERY + truck)
             N       = 2 + ceil((containerWidth − unitWidth) / period)
                     — the MINIMUM number of physical copies that still
                     covers the container at the track's worst offset
                     (−period), i.e. (N−2)·period + unitWidth ≥
                     containerWidth. Typically 4–5, never dozens.
           The track offset T is kept in [−period, 0]. When T crosses a
           full period boundary it is shifted by exactly one period — the
           rendered frame is PIXEL-IDENTICAL because the pattern repeats
           every period, so the loop point is mathematically invisible:
           what the customer sees depends only on (T mod period), which
           advances continuously forever. There is no pop-in, pop-out,
           jump, blank pause or reset; the next occurrence is always
           already on screen before the previous one leaves.
           Widths are re-measured on resize / webfont swap / language
           change, preserving the visual phase. Mobile (<=767px) is never
           touched: the glass bar is display:none there and this engine
           never starts. */
        var MIN_GAP = 24; /* overlap guard for the narrowest desktop bars */
        var cv = { bar: null, track: null, area: null, units: [], T: -1,
                   P: 0, gap: 0, dir: 1, unitW: 0, areaW: 0,
                   raf: 0, lastT: 0, lastMeasure: 0, running: false };

        function cvUnits(tr, n) {
            /* Normalise to exactly n units — never more than the computed
               minimum, never fewer than coverage requires. */
            var units = tr.querySelectorAll(".nssn-unit");
            while (units.length > n) {
                tr.removeChild(units[units.length - 1]);
                units = tr.querySelectorAll(".nssn-unit");
            }
            while (units.length < n) {
                var proto = tr.querySelector(".nssn-unit");
                if (!proto) return null;
                var clone = proto.cloneNode(true);
                clone.removeAttribute("style");
                tr.appendChild(clone);
                units = tr.querySelectorAll(".nssn-unit");
            }
            return units;
        }

        function cvMeasure() {
            cv.areaW = cv.area.getBoundingClientRect().width;
            var probe = cv.units[0] || cv.track.querySelector(".nssn-unit");
            if (!probe || !cv.areaW) return false;
            cv.unitW = probe.getBoundingClientRect().width;
            if (!cv.unitW) return false;
            var P = cv.areaW / 3;
            if (P - cv.unitW < MIN_GAP) P = cv.unitW + MIN_GAP;
            var gap = P - cv.unitW;
            var N = 2 + Math.ceil((cv.areaW - cv.unitW) / P);
            if (cv.P) {
                /* keep the visual phase (T mod period) across resize,
                   webfont and language changes — never restarts */
                var phase = ((cv.T % cv.P) + cv.P) % cv.P;
                cv.T = phase - P;
            }
            cv.P = P;
            cv.gap = gap;
            cv.track.style.gap = gap.toFixed(2) + "px";
            var units = cvUnits(cv.track, N);
            if (!units) return false;
            cv.units = [];
            for (var i = 0; i < units.length; i++) {
                /* the shared measure() writes margins on the first unit —
                   the engine owns horizontal placement exclusively */
                units[i].style.removeProperty("margin-right");
                units[i].style.removeProperty("margin-inline-end");
                cv.units.push(units[i]);
            }
            return true;
        }

        function cvApply() {
            cv.track.style.transform =
                "translate3d(" + cv.T.toFixed(2) + "px,0,0)";
        }

        function cvInit(bar) {
            var tr = bar.querySelector(".nssn-track");
            var ar = bar.querySelector(".nssn-track-area");
            if (!tr || !ar) return false;
            cv.bar = bar;
            cv.track = tr;
            cv.area = ar;
            if (!cvMeasure()) {
                /* boot failed (widths not settled yet): undo the partial
                   binding so the next retry runs the FULL init again */
                cv.bar = null;
                cv.track = null;
                cv.units = [];
                return false;
            }
            cv.dir = (window.NASSIM_SECONDARY_NAV_ARABIC_MIRROR &&
                      document.documentElement.classList.contains("lang-ar")) ? -1 : 1;
            /* First paint: the pattern phase with a unit flush against
               each edge (identical rendering for both directions). */
            cv.T = -cv.P;
            bar.classList.add("h5conv");
            cvApply();
            return true;
        }

        function cvFrame(now) {
            if (!cv.running) return;
            var dt = (now - cv.lastT) / 1000;
            cv.lastT = now;
            /* Widths can change after boot (webfont swap, i18n translating
               the label): re-read them a couple of times per second so the
               period and the unit count always match the REAL rendered
               widths. */
            if (now - cv.lastMeasure > 500) {
                cv.lastMeasure = now;
                cvMeasure();
            }
            if (dt > 0) {
                if (dt > 0.1) dt = 0.1; /* tab was hidden — no leap */
                var step = cv.dir * SPEED * dt;
                cv.T += step;
                /* THE SEAMLESS WRAP: the track offset lives in [−period, 0].
                   When it crosses a full period boundary it is shifted by
                   exactly one period — the rendered frame is pixel-identical
                   because the pattern repeats every period, so the loop
                   point is mathematically invisible: what the customer sees
                   depends only on (T mod period), which advances
                   continuously forever. English wraps upward at 0 (offset
                   −period), Arabic wraps downward at −period (offset 0). */
                if (cv.dir > 0) {
                    if (cv.T >= 0) cv.T -= cv.P;
                } else if (cv.T <= -cv.P) {
                    cv.T += cv.P;
                }
                cvApply();
            }
            /* the shared script rebuilds the bar on language change */
            if (document.getElementById("nassim-secondary-nav") !== cv.bar) {
                cv.running = false;
                cancelAnimationFrame(cv.raf);
                cvBoot();
                return;
            }
            cv.raf = requestAnimationFrame(cvFrame);
        }

        var cvRetries = 0;
        function cvBoot() {
            if (cvStart()) { cvRetries = 0; return; }
            if (++cvRetries > 40) return; /* ~5s of retries, then give up */
            setTimeout(cvBoot, 125);
        }

        function cvStart() {
            cancelAnimationFrame(cv.raf);
            cv.running = false;
            if (window.matchMedia("(max-width: 767px)").matches) return false;
            var bar = document.getElementById("nassim-secondary-nav");
            if (!bar) return false; /* shared script has not built it yet */
            if (bar !== cv.bar) {
                if (cv.bar && cv.bar.classList) {
                    cv.bar.classList.remove("h5conv");
                    var oldTrack = cv.bar.querySelector(".nssn-track");
                    if (oldTrack) oldTrack.removeAttribute("style");
                }
                cv.T = -1; cv.P = 0; /* fresh bar (language rebuild): fresh layout */
                if (!cvInit(bar)) return false;
            } else if (!cv.units.length || !cvMeasure()) {
                return false; /* not fully initialised yet — retry later */
            }
            /* Same bar (resize / fonts / breakpoint return): positions are
               preserved — the conveyor NEVER restarts from the beginning. */
            cv.running = true;
            cv.lastT = performance.now();
            cv.lastMeasure = 0;
            cv.raf = requestAnimationFrame(cvFrame);
            return true;
        }

        function cvRemeasure() { if (cv.running) cvMeasure(); }

        window.addEventListener("resize", function () {
            if (cv.running) cvMeasure(); else cvBoot();
        });
        window.addEventListener("pageshow", cvBoot);
        var h5DeskMq = window.matchMedia("(min-width: 768px)");
        function h5DeskSwitch() {
            if (h5DeskMq.matches) {
                cvBoot();
            } else {
                /* Mobile: stop the engine and park the track — the glass bar
                   is display:none <=767px and the mobile white bar (h5sn)
                   owns that range completely. Phase stays in cv.T for a
                   seamless resume when the viewport grows again. */
                cv.running = false;
                cancelAnimationFrame(cv.raf);
            }
        }
        h5DeskMq.addEventListener ? h5DeskMq.addEventListener("change", h5DeskSwitch)
                                  : h5DeskMq.addListener(h5DeskSwitch);
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(cvRemeasure).catch(function () {});
        }
        window.addEventListener("nassim-langchange", function () {
            setTimeout(cvBoot, 700);
        });
        /* The i18n pass and webfonts settle after DOMContentLoaded and can
           change the label width — re-read the widths (the phase is kept;
           the track re-spaces to the settled period). */
        setTimeout(cvRemeasure, 400);
        setTimeout(cvRemeasure, 900);
        setTimeout(cvRemeasure, 1600);
        setTimeout(cvRemeasure, 2600);
        cvBoot();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", build);
    } else {
        build();
    }
})();
