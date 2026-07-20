import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function NavHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled
          ? 'rgba(10,12,16,0.92)'
          : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            {/* S-shaped bracket icon */}
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="2" width="11" height="3" rx="1" fill="#f97316"/>
              <rect x="2" y="2" width="3" height="13" rx="1" fill="#f97316"/>
              <rect x="2" y="12.5" width="11" height="3" rx="1" fill="#f97316"/>
              <rect x="10" y="12.5" width="3" height="13" rx="1" fill="#1d4ed8"/>
              <rect x="2" y="23" width="11" height="3" rx="1" fill="#1d4ed8"/>
            </svg>
          </div>
          <span className="text-white font-bold text-lg tracking-widest font-space">
            STEELFORM
          </span>
          <span
            className="text-xs font-medium px-1.5 py-0.5 rounded ml-1 hidden sm:inline-block"
            style={{
              background: 'rgba(249,115,22,0.15)',
              border: '1px solid rgba(249,115,22,0.3)',
              color: '#f97316',
              fontSize: '9px',
              letterSpacing: '0.1em',
            }}
          >
            RACKING
          </span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {['Systems', 'Configurator', 'Projects', 'Resources', 'About'].map(item => (
            <a
              key={item}
              href="#"
              className="text-sm text-slate-400 hover:text-white transition-colors duration-200 animated-underline"
            >
              {item}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden lg:flex items-center gap-3">
          <a
            href="#"
            className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5"
          >
            Contact
          </a>
          <button className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold text-white">
            Request a Quote
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="lg:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5"
          onClick={() => setMenuOpen(m => !m)}
        >
          <span className={`block h-0.5 w-5 bg-slate-300 transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`}/>
          <span className={`block h-0.5 w-5 bg-slate-300 transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`}/>
          <span className={`block h-0.5 w-5 bg-slate-300 transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`}/>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="lg:hidden border-t border-white/5"
          style={{ background: 'rgba(10,12,16,0.98)' }}
        >
          <nav className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-3">
            {['Systems', 'Configurator', 'Projects', 'Resources', 'About', 'Contact'].map(item => (
              <a
                key={item}
                href="#"
                className="text-sm text-slate-300 hover:text-white py-2 border-b border-white/05"
                onClick={() => setMenuOpen(false)}
              >
                {item}
              </a>
            ))}
            <button className="btn-primary mt-2 px-4 py-3 rounded-xl text-sm font-semibold text-white text-center">
              Request a Quote
            </button>
          </nav>
        </motion.div>
      )}
    </motion.header>
  );
}
