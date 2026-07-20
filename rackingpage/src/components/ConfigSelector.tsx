import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const configs = [
  {
    id: 'selective',
    name: 'Selective Pallet',
    desc: 'Single-deep pallet access from every aisle. Ideal for high-SKU warehouses needing 100% accessibility.',
    specs: ['Up to 4 levels', '1,200–2,500 kg/beam', 'All aisle widths', 'FLT compatible'],
    color: '#f97316',
  },
  {
    id: 'drive-in',
    name: 'Drive-In Racking',
    desc: 'High-density block storage eliminating aisles. Perfect for LIFO operations with limited SKU ranges.',
    specs: ['Up to 10 pallets deep', 'Maximized floor use', 'LIFO stock rotation', 'Cold-store rated'],
    color: '#3b82f6',
  },
  {
    id: 'cantilever',
    name: 'Cantilever Arms',
    desc: 'Open-arm design for long, bulky, or oddly-shaped loads. No front column obstruction.',
    specs: ['Single/double sided', 'Custom arm lengths', 'Pipe & lumber rated', 'Heavy-duty base'],
    color: '#8b5cf6',
  },
  {
    id: 'mezzanine',
    name: 'Mezzanine Platform',
    desc: 'Multi-level structural platform doubling your usable floor space with integrated racking below.',
    specs: ['Up to 3 floors', '500 kg/m² floor load', 'Staircase + handrail', 'Planning support'],
    color: '#10b981',
  },
];

export default function ConfigSelector() {
  const [active, setActive] = useState('selective');
  const current = configs.find(c => c.id === active)!;

  return (
    <div className="space-y-4">
      {/* Tab selectors */}
      <div className="flex flex-wrap gap-2">
        {configs.map(c => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            className="config-pill px-4 py-2 rounded-full text-xs font-semibold tracking-wide uppercase transition-all"
            style={{
              background: active === c.id ? c.color : 'rgba(255,255,255,0.05)',
              border: `1px solid ${active === c.id ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
              color: active === c.id ? 'white' : '#64748b',
              boxShadow: active === c.id ? `0 4px 16px ${c.color}40` : 'none',
            }}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Detail panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl p-6 card-glass relative overflow-hidden"
        >
          {/* Corner glow */}
          <div
            className="absolute top-0 right-0 w-48 h-48 rounded-full"
            style={{
              background: `radial-gradient(circle at top right, ${current.color}15, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />

          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-2 h-8 rounded-full"
                  style={{ background: `linear-gradient(to bottom, ${current.color}, ${current.color}40)` }}
                />
                <h4 className="text-lg font-bold text-white tracking-tight">{current.name}</h4>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">{current.desc}</p>

              {/* Spec pills */}
              <div className="flex flex-wrap gap-2">
                {current.specs.map((s, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      background: `${current.color}12`,
                      border: `1px solid ${current.color}30`,
                      color: current.color,
                    }}
                  >
                    ✓ {s}
                  </span>
                ))}
              </div>
            </div>

            {/* CTA inside panel */}
            <div className="flex-shrink-0 flex flex-col gap-2">
              <button
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${current.color}, ${current.color}cc)`,
                  boxShadow: `0 4px 16px ${current.color}35`,
                }}
              >
                Get a Quote
              </button>
              <button className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 transition-all duration-200 hover:text-white btn-secondary">
                View Details
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
