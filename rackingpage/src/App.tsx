import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import NavHeader from './components/NavHeader';
import IsometricRacking from './components/IsometricRacking';
import FeatureCards from './components/FeatureCards';
import SpecBadges from './components/SpecBadges';
import ConfigSelector from './components/ConfigSelector';
import TrustStrip from './components/TrustStrip';
import ProjectShowcase from './components/ProjectShowcase';

// ── Floating particle backdrop ─────────────────────────────────
function Particles() {
  const particles = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    dur: Math.random() * 12 + 8,
    del: Math.random() * 6,
    opacity: Math.random() * 0.4 + 0.1,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.id % 3 === 0 ? '#f97316' : p.id % 3 === 1 ? '#3b82f6' : '#94a3b8',
            opacity: p.opacity,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [p.opacity, p.opacity * 2, p.opacity],
          }}
          transition={{
            duration: p.dur,
            delay: p.del,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// ── Scan-line overlay ──────────────────────────────────────────
function ScanLine() {
  return (
    <motion.div
      className="absolute left-0 right-0 h-px pointer-events-none z-10"
      style={{ background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.15), rgba(249,115,22,0.3), rgba(249,115,22,0.15), transparent)' }}
      animate={{ top: ['0%', '100%'] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'linear', repeatDelay: 4 }}
    />
  );
}

// ── Section label ─────────────────────────────────────────────
function SectionLabel({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px w-8 bg-gradient-to-r from-transparent to-orange-500"/>
      <span className="text-xs tracking-widest uppercase font-semibold text-orange-500/80">
        {text}
      </span>
      <div className="h-px w-8 bg-gradient-to-l from-transparent to-orange-500"/>
    </div>
  );
}

export default function App() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const vizScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.94]);

  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: '#080a0f' }}>
      <NavHeader />

      {/* ══════════════════════════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex flex-col overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(29,78,216,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 50%, rgba(249,115,22,0.07) 0%, transparent 55%), #080a0f',
        }}
      >
        {/* Grid background */}
        <div className="absolute inset-0 grid-bg opacity-60"/>

        {/* Particles */}
        <Particles />

        {/* Scan line */}
        <ScanLine />

        {/* Large ambient glow behind racking */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse, rgba(29,78,216,0.07) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />

        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="relative z-10 flex-1 flex flex-col"
        >
          {/* ── Top hero content ── */}
          <div className="flex-1 max-w-7xl mx-auto w-full px-6 lg:px-8 pt-28 lg:pt-24 grid lg:grid-cols-2 gap-12 items-center">

            {/* Left: copy */}
            <div className="space-y-6 order-2 lg:order-1">
              {/* Eyebrow */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={loaded ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <SectionLabel text="Industrial Storage Systems" />
              </motion.div>

              {/* Headline */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={loaded ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="space-y-2"
              >
                <h1 className="font-space text-5xl sm:text-6xl lg:text-6xl xl:text-7xl font-bold leading-[1.0] tracking-tight">
                  <span className="text-white">Custom-Built</span>
                  <br />
                  <span className="text-gradient-orange">Heavy-Duty</span>
                  <br />
                  <span className="text-white">Racking</span>
                  <span className="text-slate-600">.</span>
                </h1>
              </motion.div>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={loaded ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.35 }}
                className="text-base lg:text-lg text-slate-400 leading-relaxed max-w-md"
              >
                Engineered for industrial performance. Every system is precision-designed around your space, your stock, and your workflow — from a single bay to a full warehouse installation.
              </motion.p>

              {/* CTA row */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={loaded ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="flex flex-wrap gap-3 pt-2"
              >
                <button className="btn-primary px-6 py-3.5 rounded-2xl text-sm font-semibold text-white flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                  Request Custom Build
                </button>
                <button className="btn-secondary px-6 py-3.5 rounded-2xl text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7"/>
                  </svg>
                  View Configurations
                </button>
              </motion.div>

              {/* Quick stats row */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={loaded ? { opacity: 1 } : {}}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="flex flex-wrap gap-6 pt-4 border-t border-white/5"
              >
                {[
                  { val: '2,500kg', lbl: 'Load Rated' },
                  { val: '48hr',    lbl: 'Install Time' },
                  { val: '10yr',    lbl: 'Warranty' },
                ].map((s, i) => (
                  <div key={i} className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold text-white tracking-tight">{s.val}</span>
                    <span className="text-xs text-slate-500 uppercase tracking-widest">{s.lbl}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right: Isometric racking visualization */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={loaded ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.9, delay: 0.3 }}
              style={{ scale: vizScale }}
              className="order-1 lg:order-2 relative"
            >
              {/* Glow halo */}
              <div
                className="absolute inset-0 -m-8 rounded-full pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse, rgba(249,115,22,0.06) 0%, transparent 65%)',
                  filter: 'blur(20px)',
                }}
              />
              {/* Tag badge */}
              <div
                className="absolute top-2 left-4 z-10 px-3 py-1.5 rounded-full flex items-center gap-2"
                style={{
                  background: 'rgba(10,12,16,0.9)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <motion.span
                  className="w-1.5 h-1.5 rounded-full bg-green-400"
                  style={{ boxShadow: '0 0 6px #4ade80' }}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="text-xs text-slate-400 font-medium">Interactive — hover components</span>
              </div>

              {/* Spec callout floating card */}
              <motion.div
                className="absolute bottom-16 right-0 z-10 px-4 py-3 rounded-xl hidden lg:block"
                style={{
                  background: 'rgba(10,12,16,0.92)',
                  border: '1px solid rgba(249,115,22,0.2)',
                  backdropFilter: 'blur(12px)',
                  minWidth: 160,
                }}
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              >
                <p className="text-xs text-slate-500 mb-1 uppercase tracking-widest">Load Beam Rating</p>
                <p className="text-xl font-bold text-white">2,500<span className="text-orange-500 text-sm ml-0.5">kg</span></p>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="h-1 flex-1 rounded-full bg-slate-800 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, #f97316, #fbbf24)' }}
                      initial={{ width: '0%' }}
                      animate={{ width: '85%' }}
                      transition={{ delay: 1.5, duration: 1.2 }}
                    />
                  </div>
                  <span className="text-xs text-orange-500 font-bold">85%</span>
                </div>
              </motion.div>

              <IsometricRacking />
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={loaded ? { opacity: 1 } : {}}
            transition={{ delay: 1.2 }}
            className="flex justify-center pb-10 pt-4"
          >
            <div className="flex flex-col items-center gap-2 bounce-slow">
              <span className="text-xs text-slate-600 tracking-widest uppercase">Explore System</span>
              <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
              </svg>
            </div>
          </motion.div>
        </motion.div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, #080a0f)' }}/>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SPEC BADGES STRIP
      ══════════════════════════════════════════════════════════ */}
      <section className="relative py-16 overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #080a0f 0%, #0d0f16 100%)' }}
      >
        <div className="divider-gradient mb-12"/>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <SectionLabel text="Engineering Specification" />
            <h2 className="mt-4 font-space text-3xl font-bold text-white">
              Industrial-Grade by Default
            </h2>
          </motion.div>
          <SpecBadges />
        </div>
        <div className="divider-gradient mt-12"/>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FEATURES SECTION
      ══════════════════════════════════════════════════════════ */}
      <section
        className="relative py-24"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(29,78,216,0.06) 0%, transparent 60%), #0d0f16',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4 max-w-2xl"
          >
            <SectionLabel text="System Advantages" />
            <h2 className="font-space text-4xl lg:text-5xl font-bold text-white leading-tight">
              Modular Storage{' '}
              <span className="text-gradient-blue">Designed Around</span>
              <br/>Your Space
            </h2>
            <p className="text-slate-400 text-base leading-relaxed">
              From a single bay to a full-warehouse grid, STEELFORM racking systems adapt to your exact operational requirements — with zero compromise on structural integrity.
            </p>
          </motion.div>

          <FeatureCards />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          CONFIGURATOR SECTION
      ══════════════════════════════════════════════════════════ */}
      <section
        className="relative py-24 overflow-hidden"
        style={{ background: '#0a0c12' }}
      >
        {/* Decorative background lines */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[0.2, 0.4, 0.6, 0.8].map((f, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px"
              style={{
                left: `${f * 100}%`,
                background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.02), transparent)',
              }}
            />
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <SectionLabel text="System Configurations" />
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <h2 className="font-space text-4xl lg:text-5xl font-bold text-white leading-tight">
                Choose Your
                <br/>
                <span className="text-gradient-orange">Racking System</span>
              </h2>
              <p className="text-slate-400 max-w-md text-sm leading-relaxed lg:text-right">
                Each system is fully engineered to specification. Our structural design team will review your site, load requirements, and operational flow before final quotation.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
          >
            <ConfigSelector />
          </motion.div>

          {/* Process steps */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4"
          >
            {[
              { step: '01', title: 'Site Survey', desc: 'Free on-site assessment of your facility dimensions and floor loads' },
              { step: '02', title: 'Custom Design', desc: 'Structural engineers design a system around your exact requirements' },
              { step: '03', title: 'Manufacture', desc: 'Precision-fabricated in our UK facility to your specification' },
              { step: '04', title: 'Installation', desc: 'Certified installation team completes your project on time' },
            ].map((s, i) => (
              <div
                key={i}
                className="relative p-5 rounded-2xl space-y-3 card-glass group"
              >
                <div
                  className="text-5xl font-bold tracking-tight leading-none"
                  style={{ color: 'rgba(249,115,22,0.12)' }}
                >
                  {s.step}
                </div>
                <h4 className="text-sm font-semibold text-white">{s.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
                {/* connector dot */}
                {i < 3 && (
                  <div
                    className="absolute top-1/2 -right-2 w-4 h-px hidden lg:block"
                    style={{ background: 'rgba(249,115,22,0.3)' }}
                  />
                )}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          PROJECTS SHOWCASE SECTION
      ══════════════════════════════════════════════════════════ */}
      <section
        className="relative py-24"
        style={{ background: 'linear-gradient(180deg, #0a0c12 0%, #080a0f 100%)' }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col lg:flex-row lg:items-end justify-between gap-4"
          >
            <div className="space-y-4">
              <SectionLabel text="Featured Projects" />
              <h2 className="font-space text-4xl lg:text-5xl font-bold text-white leading-tight">
                Built for the
                <br/>
                <span className="text-gradient-orange">World's Best Operations</span>
              </h2>
            </div>
            <button className="self-start lg:self-end btn-secondary px-5 py-2.5 rounded-xl text-sm font-medium text-slate-300 flex items-center gap-2">
              All case studies
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
              </svg>
            </button>
          </motion.div>

          <ProjectShowcase />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          CTA / BANNER SECTION
      ══════════════════════════════════════════════════════════ */}
      <section
        className="relative py-24 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(29,78,216,0.12) 0%, rgba(249,115,22,0.08) 50%, rgba(29,78,216,0.06) 100%), #080a0f',
        }}
      >
        <div className="absolute inset-0 grid-bg opacity-30"/>

        {/* Large decorative background text */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none select-none"
          style={{
            fontSize: 'clamp(80px, 15vw, 200px)',
            fontFamily: 'Space Grotesk, sans-serif',
            fontWeight: 900,
            color: 'rgba(255,255,255,0.015)',
            letterSpacing: '-0.04em',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          STEEL
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-8 text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-5"
          >
            <SectionLabel text="Start Your Project" />
            <h2 className="font-space text-5xl lg:text-6xl font-bold text-white leading-tight">
              Ready to Build
              <br/>
              <span className="text-gradient-orange">Something Stronger?</span>
            </h2>
            <p className="text-slate-400 text-base leading-relaxed max-w-xl mx-auto">
              Talk to our engineering team today. We'll assess your space, design a custom system, and deliver a fully installed racking solution — built to last.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <button className="btn-primary px-8 py-4 rounded-2xl text-sm font-bold text-white flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              Request Custom Build
            </button>
            <button className="btn-secondary px-8 py-4 rounded-2xl text-sm font-bold text-slate-300 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/>
              </svg>
              Call Us: 0800 123 4567
            </button>
          </motion.div>

          {/* Guarantees row */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.35 }}
            className="flex flex-wrap justify-center gap-6 pt-4"
          >
            {[
              '✓ Free site survey',
              '✓ No-obligation quote',
              '✓ Nationwide delivery',
              '✓ Certified installation',
            ].map((g, i) => (
              <span key={i} className="text-xs text-slate-500 font-medium">{g}</span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          TRUST SECTION
      ══════════════════════════════════════════════════════════ */}
      <section className="py-16" style={{ background: '#080a0f' }}>
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <TrustStrip />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════ */}
      <footer
        className="py-12 border-t"
        style={{ background: '#050608', borderColor: 'rgba(255,255,255,0.05)' }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
                  <rect x="2" y="2" width="11" height="3" rx="1" fill="#f97316"/>
                  <rect x="2" y="2" width="3" height="13" rx="1" fill="#f97316"/>
                  <rect x="2" y="12.5" width="11" height="3" rx="1" fill="#f97316"/>
                  <rect x="10" y="12.5" width="3" height="13" rx="1" fill="#1d4ed8"/>
                  <rect x="2" y="23" width="11" height="3" rx="1" fill="#1d4ed8"/>
                </svg>
                <span className="text-white font-bold tracking-widest font-space text-sm">STEELFORM</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed max-w-xs">
                Custom-engineered heavy-duty racking and storage systems for industrial, commercial, and logistics operations.
              </p>
              <div className="flex gap-3">
                {['LinkedIn', 'X', 'YouTube'].map(s => (
                  <a
                    key={s}
                    href="#"
                    className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
                  >
                    {s}
                  </a>
                ))}
              </div>
            </div>

            {/* Links */}
            {[
              { title: 'Systems', links: ['Selective Pallet', 'Drive-In Racking', 'Cantilever Arms', 'Mezzanines', 'Cold Store'] },
              { title: 'Company',  links: ['About Us', 'Projects', 'Careers', 'Contact', 'News'] },
              { title: 'Support', links: ['Site Survey', 'Installation', 'Maintenance', 'Safety Inspections', 'Downloads'] },
            ].map(col => (
              <div key={col.title} className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 tracking-widest uppercase">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(l => (
                    <li key={l}>
                      <a href="#" className="text-xs text-slate-600 hover:text-slate-400 transition-colors animated-underline">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/5">
            <p className="text-xs text-slate-700">
              © 2025 STEELFORM Racking Systems Ltd. All rights reserved.
            </p>
            <div className="flex gap-6">
              {['Privacy Policy', 'Terms', 'Cookies'].map(l => (
                <a key={l} href="#" className="text-xs text-slate-700 hover:text-slate-500 transition-colors">{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
