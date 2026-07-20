import { motion } from 'framer-motion';

const items = [
  '✦  UPRIGHT FRAMES  ·  20–100mm pitch adjustment',
  '✦  LOAD BEAMS  ·  1,000 – 2,500 kg rated',
  '✦  WIRE MESH DECKING  ·  galvanized steel',
  '✦  BASE PLATES  ·  M16 anchor bolt pattern',
  '✦  SAFETY CLIPS  ·  double-lock pin design',
  '✦  DIAGONAL BRACING  ·  welded X-frame',
  '✦  PALLET SUPPORTS  ·  50 × 50mm SHS',
  '✦  POWDER COAT FINISH  ·  RAL any colour',
  '✦  SEMA APPROVED  ·  EN 15512:2009 compliant',
  '✦  SHELF PANELS  ·  2mm cold-rolled steel',
];

const duplicated = [...items, ...items];

export default function SpecTicker() {
  return (
    <div
      className="relative overflow-hidden py-3 border-y"
      style={{
        borderColor: 'rgba(255,255,255,0.04)',
        background: 'rgba(255,255,255,0.015)',
      }}
    >
      {/* Left fade */}
      <div
        className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, #080a0f, transparent)' }}
      />
      {/* Right fade */}
      <div
        className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, #080a0f, transparent)' }}
      />

      <motion.div
        className="flex gap-12 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
      >
        {duplicated.map((item, i) => (
          <span
            key={i}
            className="text-xs font-medium tracking-widest uppercase flex-shrink-0"
            style={{ color: i % 2 === 0 ? '#374151' : '#4b5563' }}
          >
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
