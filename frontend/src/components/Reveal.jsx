import { motion } from "framer-motion";

export const Reveal = ({ children, delay = 0, className = "", y = 36 }) => (
  <motion.div
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.15 }}
    transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

export const SectionHead = ({ index, eyebrow, title, children }) => (
  <Reveal className="mb-14 grid gap-6 lg:grid-cols-12 lg:items-end">
    <div className="lg:col-span-7">
      <p className="eyebrow mb-5">{index} — {eyebrow}</p>
      <h2 className="font-display text-4xl font-medium leading-[1.02] text-zinc-50 sm:text-5xl lg:text-6xl">{title}</h2>
    </div>
    {children && <p className="text-base leading-relaxed text-zinc-300 lg:col-span-5">{children}</p>}
  </Reveal>
);
