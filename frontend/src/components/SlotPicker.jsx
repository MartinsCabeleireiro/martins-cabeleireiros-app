import { motion } from "framer-motion";

export const SlotPicker = ({ slots, unavailable, isPast, value, onChange }) => (
  <div data-testid="booking-slots" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
    {slots.map((t) => {
      const off = unavailable.includes(t) || isPast(t);
      const on = value === t;
      return (
        <motion.button
          type="button"
          key={t}
          whileTap={{ scale: 0.94 }}
          disabled={off}
          data-testid={`booking-slot-${t.replace(":", "")}`}
          onClick={() => onChange(t)}
          className={`font-mono-x rounded-full border py-2.5 text-sm transition-[background-color,border-color,color] duration-200 ${
            on ? "border-[#D4AF37] bg-[#D4AF37] text-[#0D0D0F]"
              : off ? "cursor-not-allowed border-zinc-800 text-zinc-600 line-through"
              : "border-[#D4AF37]/25 text-zinc-200 hover:border-[#D4AF37]"
          }`}
        >
          {t}
        </motion.button>
      );
    })}
  </div>
);
