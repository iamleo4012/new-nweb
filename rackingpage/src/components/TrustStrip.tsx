import { motion } from 'framer-motion';

const logos = [
  { name: 'SEMA', sub: 'Certified Member' },
  { name: 'CE', sub: 'EN 15512 Compliant' },
  { name: 'ISO', sub: '9001:2015' },
  { name: 'FEM', sub: 'Registered' },
  { name: 'BSI', sub: 'Kitemarked' },
];

const clients = ['Amazon', 'DHL', 'Jaguar Land Rover', 'NHS Logistics', 'Royal Mail', 'Ocado'];

export default function TrustStrip() {
  return (
    <div className="space-y-8">
      {/* Certification badges */}
      <div className="flex flex-wrap items-center justify-center gap-6">
        {logos.map((l, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="flex flex-col items-center gap-1"
          >
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span className="text-sm font-bold text-slate-300 tracking-tight">{l.name}</span>
            </div>
            <span className="text-xs text-slate-600 text-center leading-tight max-w-14">{l.sub}</span>
          </motion.div>
        ))}
      </div>

      {/* Divider */}
      <div className="divider-gradient"/>

      {/* Client logos text */}
      <div className="text-center space-y-4">
        <p className="text-xs tracking-widest text-slate-600 uppercase font-medium">
          Trusted by leading operations teams
        </p>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
          {clients.map((c, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="text-sm font-semibold text-slate-600 hover:text-slate-400 transition-colors duration-200 cursor-default"
            >
              {c}
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  );
}
