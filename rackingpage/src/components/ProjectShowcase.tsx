import { motion } from 'framer-motion';

const projects = [
  {
    sector: 'E-commerce Fulfilment',
    title: 'Amazon DSP — Manchester',
    details: '2,400 pallet bays · 12,000 m² · 6m uprights · 48hr install',
    tag: 'Selective Pallet Racking',
    color: '#f97316',
    gradient: 'from-orange-950/60 to-transparent',
  },
  {
    sector: 'Cold Chain Logistics',
    title: 'DHL Cold Store — Northampton',
    details: '1,800 pallet positions · Drive-in system · -25°C rated · 3-day fit-out',
    tag: 'Drive-In Racking',
    color: '#3b82f6',
    gradient: 'from-blue-950/60 to-transparent',
  },
  {
    sector: 'Automotive Manufacturing',
    title: 'JLR Component Store — Coventry',
    details: 'Long-span cantilever · 900 arm positions · Bespoke widths · Mezzanine deck',
    tag: 'Cantilever + Mezzanine',
    color: '#8b5cf6',
    gradient: 'from-purple-950/60 to-transparent',
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export default function ProjectShowcase() {
  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-3 gap-4"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
    >
      {projects.map((p, i) => (
        <motion.div
          key={i}
          variants={cardVariants}
          whileHover={{ y: -6 }}
          transition={{ duration: 0.2 }}
          className="relative rounded-2xl overflow-hidden group cursor-pointer"
          style={{
            background: `linear-gradient(160deg, ${p.color}0a, rgba(13,15,22,0.95))`,
            border: `1px solid ${p.color}18`,
            minHeight: 220,
          }}
        >
          {/* Gradient fill */}
          <div
            className={`absolute inset-0 bg-gradient-to-b ${p.gradient}`}
          />

          {/* Grid lines decorative */}
          <div className="absolute inset-0 grid-bg opacity-30"/>

          {/* Hover glow */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: `radial-gradient(ellipse at 30% 0%, ${p.color}12, transparent 70%)`,
            }}
          />

          {/* Content */}
          <div className="relative z-10 p-6 h-full flex flex-col justify-between">
            <div className="space-y-3">
              {/* Tag */}
              <span
                className="inline-block text-xs font-semibold px-3 py-1 rounded-full tracking-widest uppercase"
                style={{
                  background: `${p.color}18`,
                  border: `1px solid ${p.color}35`,
                  color: p.color,
                }}
              >
                {p.tag}
              </span>

              {/* Sector */}
              <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">
                {p.sector}
              </p>

              {/* Title */}
              <h3 className="text-base font-bold text-white leading-tight">{p.title}</h3>

              {/* Details */}
              <p className="text-xs text-slate-500 leading-relaxed">{p.details}</p>
            </div>

            {/* Link */}
            <div className="mt-4 flex items-center gap-2 group/link">
              <span
                className="text-xs font-semibold transition-colors"
                style={{ color: p.color }}
              >
                View case study
              </span>
              <svg
                className="w-3 h-3 transition-transform group-hover/link:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                style={{ color: p.color }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
              </svg>
            </div>
          </div>

          {/* Bottom accent bar */}
          <div
            className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: `linear-gradient(90deg, transparent, ${p.color}, transparent)` }}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
