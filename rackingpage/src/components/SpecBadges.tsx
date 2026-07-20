import { motion } from 'framer-motion';

const specs = [
  { value: '2,500', unit: 'kg', label: 'Per-Beam Capacity' },
  { value: '6.0', unit: 'm', label: 'Max Upright Height' },
  { value: '10', unit: 'yr', label: 'Structural Warranty' },
  { value: '48', unit: 'hr', label: 'Typical Install Time' },
  { value: '100+', unit: '', label: 'Custom Configurations' },
  { value: 'CE', unit: '', label: 'SEMA Certified' },
];

export default function SpecBadges() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {specs.map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.07, duration: 0.4 }}
          className="stat-card rounded-xl p-4 text-center card-glass"
        >
          <div className="flex items-baseline justify-center gap-0.5 mb-1">
            <span className="text-2xl font-bold text-white tracking-tight">{s.value}</span>
            {s.unit && (
              <span className="text-sm font-semibold ml-0.5" style={{ color: '#f97316' }}>
                {s.unit}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 leading-tight tracking-wide uppercase font-medium">
            {s.label}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
