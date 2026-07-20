import { useState } from 'react';
import { motion } from 'framer-motion';

interface Part {
  id: string;
  label: string;
  color: string;
}

const PARTS: Part[] = [
  { id: 'base',     label: 'Industrial Base Plates',    color: '#f97316' },
  { id: 'upright',  label: 'Upright Frame Columns',     color: '#60a5fa' },
  { id: 'beam',     label: 'Load-Rated Cross Beams',    color: '#f97316' },
  { id: 'shelf',    label: 'Steel Shelving Panels',     color: '#94a3b8' },
  { id: 'brace',    label: 'Diagonal Bracing',          color: '#60a5fa' },
  { id: 'clip',     label: 'Safety Locking Clips',      color: '#fbbf24' },
  { id: 'mesh',     label: 'Wire Mesh Decking',         color: '#64748b' },
  { id: 'pallet',   label: 'Pallet Support Bars',       color: '#f97316' },
];

export default function IsometricRacking() {
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const [activePart, setActivePart] = useState<string | null>(null);

  const highlighted = hoveredPart || activePart;

  const handleClick = (id: string) => {
    setActivePart(prev => prev === id ? null : id);
  };

  // Orange accent
  const OG = '#f97316';

  const isHigh = (id: string) => highlighted === id;
  const opac = (id: string) => highlighted && !isHigh(id) ? 0.35 : 1;

  return (
    <div className="relative w-full flex items-center justify-center select-none">
      {/* Part tooltip */}
      {highlighted && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="absolute top-0 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full text-xs font-semibold tracking-widest uppercase"
          style={{
            background: 'rgba(249,115,22,0.15)',
            border: '1px solid rgba(249,115,22,0.5)',
            color: '#fb923c',
            backdropFilter: 'blur(8px)',
          }}
        >
          {PARTS.find(p => p.id === highlighted)?.label}
        </motion.div>
      )}

      <motion.svg
        viewBox="0 0 820 680"
        className="w-full max-w-3xl"
        style={{ filter: 'drop-shadow(0 40px 80px rgba(0,0,0,0.8))' }}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <defs>
          {/* Metallic gradient – upright */}
          <linearGradient id="gUpright" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#1e40af" />
            <stop offset="40%"  stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
          <linearGradient id="gUprightSide" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#172554" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>

          {/* Beam gradient – orange */}
          <linearGradient id="gBeam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#c2410c" />
            <stop offset="50%"  stopColor="#ea580c" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
          <linearGradient id="gBeamTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#fb923c" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>

          {/* Shelf panel */}
          <linearGradient id="gShelf" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          <linearGradient id="gShelfSide" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#64748b" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>

          {/* Base plate */}
          <linearGradient id="gBase" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Mesh */}
          <pattern id="meshPat" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#374151"/>
            <line x1="0" y1="0" x2="8" y2="0" stroke="#4b5563" strokeWidth="0.8"/>
            <line x1="0" y1="0" x2="0" y2="8" stroke="#4b5563" strokeWidth="0.8"/>
          </pattern>

          {/* Glow filter */}
          <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* Orange glow */}
          <filter id="orangeGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feFlood floodColor="#f97316" floodOpacity="0.5" result="color"/>
            <feComposite in="color" in2="blur" operator="in" result="colorBlur"/>
            <feMerge>
              <feMergeNode in="colorBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* Blue glow */}
          <filter id="blueGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feFlood floodColor="#3b82f6" floodOpacity="0.5" result="color"/>
            <feComposite in="color" in2="blur" operator="in" result="colorBlur"/>
            <feMerge>
              <feMergeNode in="colorBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* Shadow */}
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="4" dy="8" stdDeviation="6" floodColor="rgba(0,0,0,0.6)"/>
          </filter>
        </defs>

        {/* ── Ambient glow rings (decorative) ─────────────────── */}
        <motion.ellipse
          cx="410" cy="610" rx="200" ry="22"
          fill="none" stroke="rgba(249,115,22,0.12)" strokeWidth="1"
          animate={{ rx: [200, 220, 200], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.ellipse
          cx="410" cy="610" rx="260" ry="30"
          fill="rgba(0,0,0,0.5)" style={{filter:'blur(20px)'}}
          animate={{ opacity: [0.5, 0.7, 0.5] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* ═══════════════════════════════════════════════════════
            BASE PLATES  (floated below)
        ═══════════════════════════════════════════════════════ */}
        <motion.g
          className="rack-part"
          style={{ opacity: opac('base') }}
          filter={isHigh('base') ? 'url(#orangeGlow)' : undefined}
          onMouseEnter={() => setHoveredPart('base')}
          onMouseLeave={() => setHoveredPart(null)}
          onClick={() => handleClick('base')}
          animate={{ y: isHigh('base') ? -6 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          {/* Left base plate */}
          <g transform="translate(155, 565)">
            {/* top face */}
            <polygon points="0,-12 50,13 50,22 0,-3" fill="#374151"/>
            <polygon points="0,-12 -38,7 -38,16 0,-3" fill="#1f2937"/>
            <polygon points="0,-12 50,13 12,33 -38,7" fill="#4b5563"/>
            {/* bolt detail */}
            <circle cx="6" cy="-2" r="3" fill="#6b7280"/>
            <circle cx="6" cy="-2" r="1.5" fill="#374151"/>
          </g>
          {/* Right base plate */}
          <g transform="translate(575, 565)">
            <polygon points="0,-12 50,13 50,22 0,-3" fill="#374151"/>
            <polygon points="0,-12 -38,7 -38,16 0,-3" fill="#1f2937"/>
            <polygon points="0,-12 50,13 12,33 -38,7" fill="#4b5563"/>
            <circle cx="6" cy="-2" r="3" fill="#6b7280"/>
            <circle cx="6" cy="-2" r="1.5" fill="#374151"/>
          </g>
          {/* Front-left base */}
          <g transform="translate(155, 600)">
            <polygon points="0,-12 50,13 50,22 0,-3" fill="#374151"/>
            <polygon points="0,-12 -38,7 -38,16 0,-3" fill="#1f2937"/>
            <polygon points="0,-12 50,13 12,33 -38,7" fill="#4b5563"/>
            <circle cx="6" cy="-2" r="3" fill="#6b7280"/>
            <circle cx="6" cy="-2" r="1.5" fill="#374151"/>
          </g>
          {/* Front-right base */}
          <g transform="translate(575, 600)">
            <polygon points="0,-12 50,13 50,22 0,-3" fill="#374151"/>
            <polygon points="0,-12 -38,7 -38,16 0,-3" fill="#1f2937"/>
            <polygon points="0,-12 50,13 12,33 -38,7" fill="#4b5563"/>
            <circle cx="6" cy="-2" r="3" fill="#6b7280"/>
            <circle cx="6" cy="-2" r="1.5" fill="#374151"/>
          </g>
          {/* Label dot */}
          {isHigh('base') && (
            <circle cx="410" cy="590" r="4" fill={OG}
              style={{filter:'drop-shadow(0 0 6px #f97316)'}}/>
          )}
        </motion.g>

        {/* ═══════════════════════════════════════════════════════
            UPRIGHT FRAMES  (left column + right column)
        ═══════════════════════════════════════════════════════ */}
        <motion.g
          className="rack-part"
          style={{ opacity: opac('upright') }}
          filter={isHigh('upright') ? 'url(#blueGlow)' : undefined}
          onMouseEnter={() => setHoveredPart('upright')}
          onMouseLeave={() => setHoveredPart(null)}
          onClick={() => handleClick('upright')}
          animate={{ y: isHigh('upright') ? -8 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          {/* ── Left rear upright column ── */}
          {/* Front face */}
          <polygon points="170,540 192,527 192,110 170,123" fill="url(#gUpright)"/>
          {/* Side face */}
          <polygon points="170,540 148,527 148,110 170,123" fill="url(#gUprightSide)"/>
          {/* Top cap */}
          <polygon points="170,123 192,110 170,97 148,110" fill="#2563eb"/>

          {/* ── Right rear upright column ── */}
          <polygon points="590,540 612,527 612,110 590,123" fill="url(#gUpright)"/>
          <polygon points="590,540 568,527 568,110 590,123" fill="url(#gUprightSide)"/>
          <polygon points="590,123 612,110 590,97 568,110" fill="#2563eb"/>

          {/* ── Diagonal brace details on uprights ── */}
          {/* Left column punched holes (cosmetic) */}
          {[140, 190, 240, 290, 340, 390, 440, 490].map((y, i) => (
            <ellipse key={i} cx="170" cy={y} rx="6" ry="3.5"
              fill="#1e3a8a" opacity="0.8"/>
          ))}
          {[140, 190, 240, 290, 340, 390, 440, 490].map((y, i) => (
            <ellipse key={i} cx="590" cy={y} rx="6" ry="3.5"
              fill="#1e3a8a" opacity="0.8"/>
          ))}

          {/* Blue glow rim */}
          {isHigh('upright') && <>
            <line x1="170" y1="97" x2="170" y2="540" stroke="#60a5fa" strokeWidth="2" opacity="0.6"/>
            <line x1="590" y1="97" x2="590" y2="540" stroke="#60a5fa" strokeWidth="2" opacity="0.6"/>
          </>}
        </motion.g>

        {/* ═══════════════════════════════════════════════════════
            DIAGONAL BRACES
        ═══════════════════════════════════════════════════════ */}
        <motion.g
          className="rack-part"
          style={{ opacity: opac('brace') }}
          filter={isHigh('brace') ? 'url(#blueGlow)' : undefined}
          onMouseEnter={() => setHoveredPart('brace')}
          onMouseLeave={() => setHoveredPart(null)}
          onClick={() => handleClick('brace')}
          animate={{ x: isHigh('brace') ? -12 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          {/* Left panel braces */}
          <line x1="148" y1="110" x2="148" y2="530" stroke="#1d4ed8" strokeWidth="3" opacity="0.3"/>
          {/* diagonal X braces */}
          <line x1="148" y1="175" x2="192" y2="390" stroke="#1d4ed8" strokeWidth="4" strokeLinecap="round"/>
          <line x1="192" y1="175" x2="148" y2="390" stroke="#1d4ed8" strokeWidth="4" strokeLinecap="round"/>
          <line x1="148" y1="390" x2="192" y2="525" stroke="#1d4ed8" strokeWidth="4" strokeLinecap="round"/>
          <line x1="192" y1="390" x2="148" y2="525" stroke="#1d4ed8" strokeWidth="4" strokeLinecap="round"/>

          {/* Right panel braces */}
          <line x1="568" y1="175" x2="612" y2="390" stroke="#1d4ed8" strokeWidth="4" strokeLinecap="round"/>
          <line x1="612" y1="175" x2="568" y2="390" stroke="#1d4ed8" strokeWidth="4" strokeLinecap="round"/>
          <line x1="568" y1="390" x2="612" y2="525" stroke="#1d4ed8" strokeWidth="4" strokeLinecap="round"/>
          <line x1="612" y1="390" x2="568" y2="525" stroke="#1d4ed8" strokeWidth="4" strokeLinecap="round"/>

          {isHigh('brace') && <>
            <line x1="148" y1="175" x2="192" y2="390" stroke="#60a5fa" strokeWidth="1.5" opacity="0.5"/>
            <line x1="192" y1="175" x2="148" y2="390" stroke="#60a5fa" strokeWidth="1.5" opacity="0.5"/>
          </>}
        </motion.g>

        {/* ═══════════════════════════════════════════════════════
            PALLET SUPPORT BARS (floated up from shelf)
        ═══════════════════════════════════════════════════════ */}
        <motion.g
          className="rack-part"
          style={{ opacity: opac('pallet') }}
          filter={isHigh('pallet') ? 'url(#orangeGlow)' : undefined}
          onMouseEnter={() => setHoveredPart('pallet')}
          onMouseLeave={() => setHoveredPart(null)}
          onClick={() => handleClick('pallet')}
          animate={{ y: isHigh('pallet') ? -14 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          {/* Pallet support bars on bottom level */}
          {[0.33, 0.66].map((frac, i) => {
            const x = 170 + (590 - 170) * frac;
            return (
              <g key={i}>
                {/* front face */}
                <polygon
                  points={`${x - 6},490 ${x + 6},483 ${x + 6},515 ${x - 6},522`}
                  fill="#c2410c"
                />
                {/* top face */}
                <polygon
                  points={`${x - 6},490 ${x + 6},483 ${x + 18},490 ${x + 6},497`}
                  fill="#f97316"
                />
              </g>
            );
          })}
          {/* Mid level */}
          {[0.33, 0.66].map((frac, i) => {
            const x = 170 + (590 - 170) * frac;
            return (
              <g key={i}>
                <polygon
                  points={`${x - 6},345 ${x + 6},338 ${x + 6},370 ${x - 6},377`}
                  fill="#c2410c"
                />
                <polygon
                  points={`${x - 6},345 ${x + 6},338 ${x + 18},345 ${x + 6},352`}
                  fill="#f97316"
                />
              </g>
            );
          })}
        </motion.g>

        {/* ═══════════════════════════════════════════════════════
            LOAD BEAMS  (exploded apart — 3 levels)
        ═══════════════════════════════════════════════════════ */}
        <motion.g
          className="rack-part"
          style={{ opacity: opac('beam') }}
          filter={isHigh('beam') ? 'url(#orangeGlow)' : undefined}
          onMouseEnter={() => setHoveredPart('beam')}
          onMouseLeave={() => setHoveredPart(null)}
          onClick={() => handleClick('beam')}
          animate={{ x: isHigh('beam') ? 16 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          {/* BEAM LEVEL 1 – bottom  (y~490) */}
          {/* Front beam */}
          <g>
            {/* front face */}
            <polygon points="170,508 590,470 590,490 170,528" fill="url(#gBeam)"/>
            {/* top face */}
            <polygon points="170,508 590,470 614,483 190,521" fill="url(#gBeamTop)"/>
            {/* left end face */}
            <polygon points="170,508 190,521 190,501 170,488" fill="#c2410c"/>
            {/* right end face */}
            <polygon points="590,470 614,483 614,463 590,450" fill="#c2410c"/>
          </g>
          {/* Rear beam */}
          <g>
            <polygon points="170,488 590,450 590,470 170,508" fill="#9a3412"/>
            <polygon points="170,488 590,450 570,440 150,478" fill="#b45309" opacity="0.5"/>
          </g>

          {/* BEAM LEVEL 2 – mid  (y~345) */}
          <g>
            <polygon points="170,362 590,324 590,344 170,382" fill="url(#gBeam)"/>
            <polygon points="170,362 590,324 614,337 190,375" fill="url(#gBeamTop)"/>
            <polygon points="170,362 190,375 190,355 170,342" fill="#c2410c"/>
            <polygon points="590,324 614,337 614,317 590,304" fill="#c2410c"/>
          </g>
          <g>
            <polygon points="170,342 590,304 590,324 170,362" fill="#9a3412"/>
            <polygon points="170,342 590,304 570,294 150,332" fill="#b45309" opacity="0.5"/>
          </g>

          {/* BEAM LEVEL 3 – top  (y~175) */}
          <g>
            <polygon points="170,192 590,154 590,174 170,212" fill="url(#gBeam)"/>
            <polygon points="170,192 590,154 614,167 190,205" fill="url(#gBeamTop)"/>
            <polygon points="170,192 190,205 190,185 170,172" fill="#c2410c"/>
            <polygon points="590,154 614,167 614,147 590,134" fill="#c2410c"/>
          </g>
          <g>
            <polygon points="170,172 590,134 590,154 170,192" fill="#9a3412"/>
          </g>

          {/* Beam flange detail lines */}
          {[[170,508,590,470],[170,362,590,324],[170,192,590,154]].map(([x1,y1,x2,y2], i) => (
            <line key={i} x1={x1+10} y1={y1+5} x2={x2-10} y2={y2+5}
              stroke="rgba(255,200,100,0.2)" strokeWidth="1" strokeDasharray="12,8"/>
          ))}
        </motion.g>

        {/* ═══════════════════════════════════════════════════════
            STEEL SHELVING PANELS  (exploded higher)
        ═══════════════════════════════════════════════════════ */}
        <motion.g
          className="rack-part"
          style={{ opacity: opac('shelf') }}
          filter={isHigh('shelf') ? 'url(#glow)' : undefined}
          onMouseEnter={() => setHoveredPart('shelf')}
          onMouseLeave={() => setHoveredPart(null)}
          onClick={() => handleClick('shelf')}
          animate={{ y: isHigh('shelf') ? -18 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          {/* Shelf panel – BOTTOM level  */}
          <g>
            {/* Top face of shelf */}
            <polygon points="175,468 595,430 622,445 202,483" fill="url(#gShelf)"/>
            {/* Front edge */}
            <polygon points="175,468 202,483 202,493 175,478" fill="url(#gShelfSide)"/>
            {/* Right edge */}
            <polygon points="595,430 622,445 622,455 595,440" fill="#475569"/>
            {/* bottom lip */}
            <polygon points="175,478 202,493 622,455 595,440" fill="#64748b"/>
            {/* Rib lines on top */}
            {[0.25, 0.5, 0.75].map((f, i) => {
              const x1 = 175 + (595 - 175) * f;
              const y1 = 468 + (430 - 468) * f;
              const x2 = 202 + (622 - 202) * f;
              const y2 = 483 + (445 - 483) * f;
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#7c8fa0" strokeWidth="0.8" opacity="0.6"/>;
            })}
          </g>

          {/* Shelf panel – MID level */}
          <g>
            <polygon points="175,322 595,284 622,299 202,337" fill="url(#gShelf)"/>
            <polygon points="175,322 202,337 202,347 175,332" fill="url(#gShelfSide)"/>
            <polygon points="595,284 622,299 622,309 595,294" fill="#475569"/>
            <polygon points="175,332 202,347 622,309 595,294" fill="#64748b"/>
            {[0.25, 0.5, 0.75].map((f, i) => {
              const x1 = 175 + (595 - 175) * f;
              const y1 = 322 + (284 - 322) * f;
              const x2 = 202 + (622 - 202) * f;
              const y2 = 337 + (299 - 337) * f;
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#7c8fa0" strokeWidth="0.8" opacity="0.6"/>;
            })}
          </g>

          {/* Shelf panel – TOP level */}
          <g>
            <polygon points="175,152 595,114 622,129 202,167" fill="url(#gShelf)"/>
            <polygon points="175,152 202,167 202,177 175,162" fill="url(#gShelfSide)"/>
            <polygon points="595,114 622,129 622,139 595,124" fill="#475569"/>
            <polygon points="175,162 202,177 622,139 595,124" fill="#64748b"/>
            {[0.25, 0.5, 0.75].map((f, i) => {
              const x1 = 175 + (595 - 175) * f;
              const y1 = 152 + (114 - 152) * f;
              const x2 = 202 + (622 - 202) * f;
              const y2 = 167 + (129 - 167) * f;
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#7c8fa0" strokeWidth="0.8" opacity="0.6"/>;
            })}
          </g>
        </motion.g>

        {/* ═══════════════════════════════════════════════════════
            WIRE MESH DECKING  (top level, floating above)
        ═══════════════════════════════════════════════════════ */}
        <motion.g
          className="rack-part"
          style={{ opacity: opac('mesh') }}
          filter={isHigh('mesh') ? 'url(#glow)' : undefined}
          onMouseEnter={() => setHoveredPart('mesh')}
          onMouseLeave={() => setHoveredPart(null)}
          onClick={() => handleClick('mesh')}
          animate={{ y: isHigh('mesh') ? -22 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          {/* Mesh on top shelf – clipped polygon */}
          <clipPath id="meshClip">
            <polygon points="175,112 595,74 622,89 202,127"/>
          </clipPath>
          <polygon points="175,112 595,74 622,89 202,127" fill="url(#meshPat)" clipPath="url(#meshClip)"/>
          <polygon points="175,112 595,74 622,89 202,127" fill="none"
            stroke="#4b5563" strokeWidth="1.5"/>
          {/* Mesh border frame */}
          <polygon points="175,112 202,127 202,132 175,117" fill="#374151"/>
          <polygon points="595,74 622,89 622,94 595,79" fill="#374151"/>
          <polygon points="175,117 202,132 622,94 595,79" fill="#2d3748"/>
        </motion.g>

        {/* ═══════════════════════════════════════════════════════
            LOCKING CLIPS / CONNECTORS  (small, bright yellow)
        ═══════════════════════════════════════════════════════ */}
        <motion.g
          className="rack-part"
          style={{ opacity: opac('clip') }}
          filter={isHigh('clip') ? 'url(#orangeGlow)' : undefined}
          onMouseEnter={() => setHoveredPart('clip')}
          onMouseLeave={() => setHoveredPart(null)}
          onClick={() => handleClick('clip')}
          animate={{ x: isHigh('clip') ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          {/* Clips at beam-column junctions */}
          {/* Top level */}
          <rect x="178" y="176" width="10" height="14" rx="2" fill="#fbbf24" transform="skewY(-12)"/>
          <rect x="596" y="138" width="10" height="14" rx="2" fill="#fbbf24" transform="skewY(-12)"/>
          {/* Mid level */}
          <rect x="178" y="330" width="10" height="14" rx="2" fill="#fbbf24" transform="skewY(-12)"/>
          <rect x="596" y="292" width="10" height="14" rx="2" fill="#fbbf24" transform="skewY(-12)"/>
          {/* Bottom level */}
          <rect x="178" y="476" width="10" height="14" rx="2" fill="#fbbf24" transform="skewY(-12)"/>
          <rect x="596" y="438" width="10" height="14" rx="2" fill="#fbbf24" transform="skewY(-12)"/>
          {/* Glow dots */}
          {isHigh('clip') && [
            [183,183],[601,145],[183,337],[601,299],[183,483],[601,445]
          ].map(([cx,cy],i) => (
            <circle key={i} cx={cx} cy={cy} r="5" fill="#fbbf24"
              style={{filter:'drop-shadow(0 0 6px #fbbf24)'}}/>
          ))}
        </motion.g>

        {/* ═══════════════════════════════════════════════════════
            ASSEMBLY CONNECTOR LINES  (exploded guide lines)
        ═══════════════════════════════════════════════════════ */}
        <g opacity="0.2" stroke="#60a5fa" strokeWidth="0.8" strokeDasharray="4,6">
          {/* Vertical guide from base to upright bottom */}
          <line x1="170" y1="540" x2="170" y2="570"/>
          <line x1="590" y1="540" x2="590" y2="570"/>
          {/* Shelf horizontal guides */}
          <line x1="175" y1="322" x2="145" y2="338"/>
          <line x1="175" y1="152" x2="145" y2="168"/>
          {/* Beam guides */}
          <line x1="170" y1="192" x2="140" y2="205"/>
          <line x1="170" y1="362" x2="140" y2="375"/>
        </g>

        {/* ═══════════════════════════════════════════════════════
            CALLOUT LINES + LABELS (technical annotation style)
        ═══════════════════════════════════════════════════════ */}
        {/* Right side callouts */}
        <g opacity={highlighted ? 0.15 : 0.9} style={{transition:'opacity 0.3s'}}>
          {/* Top – mesh */}
          <line x1="622" y1="89" x2="680" y2="65" stroke="#60a5fa" strokeWidth="0.8"/>
          <circle cx="680" cy="65" r="2" fill="#60a5fa"/>
          <text x="686" y="69" fill="#94a3b8" fontSize="9" fontFamily="Inter" letterSpacing="0.05em">WIRE MESH DECK</text>

          {/* Top shelf */}
          <line x1="622" y1="129" x2="700" y2="115" stroke="#60a5fa" strokeWidth="0.8"/>
          <circle cx="700" cy="115" r="2" fill="#60a5fa"/>
          <text x="706" y="119" fill="#94a3b8" fontSize="9" fontFamily="Inter" letterSpacing="0.05em">STEEL PANEL</text>

          {/* Beam */}
          <line x1="614" y1="167" x2="700" y2="168" stroke="#f97316" strokeWidth="0.8"/>
          <circle cx="700" cy="168" r="2" fill="#f97316"/>
          <text x="706" y="172" fill="#fb923c" fontSize="9" fontFamily="Inter" letterSpacing="0.05em">LOAD BEAM  ›  2,500kg</text>

          {/* Mid shelf */}
          <line x1="622" y1="299" x2="700" y2="290" stroke="#60a5fa" strokeWidth="0.8"/>
          <circle cx="700" cy="290" r="2" fill="#60a5fa"/>
          <text x="706" y="294" fill="#94a3b8" fontSize="9" fontFamily="Inter" letterSpacing="0.05em">SHELF PANEL</text>

          {/* Mid beam */}
          <line x1="614" y1="337" x2="700" y2="335" stroke="#f97316" strokeWidth="0.8"/>
          <circle cx="700" cy="335" r="2" fill="#f97316"/>
          <text x="706" y="339" fill="#fb923c" fontSize="9" fontFamily="Inter" letterSpacing="0.05em">CROSS BEAM</text>

          {/* Bottom */}
          <line x1="622" y1="445" x2="700" y2="440" stroke="#f97316" strokeWidth="0.8"/>
          <circle cx="700" cy="440" r="2" fill="#f97316"/>
          <text x="706" y="444" fill="#fb923c" fontSize="9" fontFamily="Inter" letterSpacing="0.05em">PALLET SUPPORT</text>

          {/* Base */}
          <line x1="622" y1="490" x2="700" y2="500" stroke="#94a3b8" strokeWidth="0.8"/>
          <circle cx="700" cy="500" r="2" fill="#94a3b8"/>
          <text x="706" y="504" fill="#64748b" fontSize="9" fontFamily="Inter" letterSpacing="0.05em">BASE PLATE</text>
        </g>

        {/* Left side callouts */}
        <g opacity={highlighted ? 0.15 : 0.9} style={{transition:'opacity 0.3s'}}>
          <line x1="148" y1="300" x2="90" y2="270" stroke="#3b82f6" strokeWidth="0.8"/>
          <circle cx="90" cy="270" r="2" fill="#3b82f6"/>
          <text x="5" y="274" fill="#60a5fa" fontSize="9" fontFamily="Inter" letterSpacing="0.05em">UPRIGHT FRAME</text>

          <line x1="148" y1="350" x2="90" y2="370" stroke="#3b82f6" strokeWidth="0.8"/>
          <circle cx="90" cy="370" r="2" fill="#3b82f6"/>
          <text x="5" y="374" fill="#60a5fa" fontSize="9" fontFamily="Inter" letterSpacing="0.05em">DIAGONAL BRACE</text>

          <line x1="178" y1="180" x2="90" y2="155" stroke="#fbbf24" strokeWidth="0.8"/>
          <circle cx="90" cy="155" r="2" fill="#fbbf24"/>
          <text x="5" y="159" fill="#fbbf24" fontSize="9" fontFamily="Inter" letterSpacing="0.05em">SAFETY CLIP</text>
        </g>

        {/* ═══════════════════════════════════════════════════════
            DIMENSION ARROWS
        ═══════════════════════════════════════════════════════ */}
        <g opacity="0.3">
          {/* Height arrow */}
          <line x1="130" y1="110" x2="130" y2="540" stroke="#475569" strokeWidth="0.8"/>
          <polygon points="130,100 126,116 134,116" fill="#475569"/>
          <polygon points="130,550 126,534 134,534" fill="#475569"/>
          <text x="118" y="330" fill="#475569" fontSize="9" fontFamily="Inter"
            transform="rotate(-90,118,330)" textAnchor="middle" letterSpacing="0.05em">
            UP TO 6m HEIGHT
          </text>
        </g>
      </motion.svg>

      {/* Interactive part legend */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-wrap gap-2 justify-center pb-2">
        {PARTS.map(p => (
          <button
            key={p.id}
            onMouseEnter={() => setHoveredPart(p.id)}
            onMouseLeave={() => setHoveredPart(null)}
            onClick={() => handleClick(p.id)}
            className="px-2 py-1 rounded text-xs font-medium transition-all duration-200"
            style={{
              background: (hoveredPart === p.id || activePart === p.id)
                ? `${p.color}22`
                : 'rgba(255,255,255,0.04)',
              border: `1px solid ${(hoveredPart === p.id || activePart === p.id) ? p.color : 'rgba(255,255,255,0.08)'}`,
              color: (hoveredPart === p.id || activePart === p.id) ? p.color : '#475569',
              fontSize: '10px',
              letterSpacing: '0.04em',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
