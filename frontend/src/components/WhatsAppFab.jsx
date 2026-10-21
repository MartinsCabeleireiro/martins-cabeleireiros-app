import { motion } from "framer-motion";
import { waLink } from "@/lib/site";

export const WhatsAppFab = () => (
  <motion.a
    data-testid="floating-whatsapp-button"
    href={waLink("Olá! Vim pelo site do Martins Cabeleireiro e gostaria de mais informações.")}
    target="_blank"
    rel="noreferrer"
    aria-label="Falar no WhatsApp"
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ delay: 1.8, type: "spring", stiffness: 200, damping: 15 }}
    whileHover={{ scale: 1.08 }}
    whileTap={{ scale: 0.94 }}
    className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_10px_40px_rgba(37,211,102,0.35)] sm:bottom-8 sm:right-8 sm:h-16 sm:w-16"
  >
    <span className="absolute inset-0 animate-ping rounded-full bg-[#25D366]/30" />
    <svg viewBox="0 0 32 32" className="relative h-7 w-7" fill="currentColor" aria-hidden="true">
      <path d="M16.04 3C9.1 3 3.46 8.63 3.46 15.57c0 2.22.58 4.38 1.68 6.29L3.36 28.5l6.8-1.78a12.53 12.53 0 0 0 5.88 1.49h.01c6.93 0 12.57-5.63 12.58-12.57C28.63 8.64 22.98 3 16.04 3Zm0 23.07h-.01a10.44 10.44 0 0 1-5.32-1.46l-.38-.23-4.04 1.06 1.08-3.94-.25-.4a10.42 10.42 0 0 1-1.6-5.53c0-5.77 4.7-10.46 10.48-10.46 2.8 0 5.43 1.09 7.4 3.07a10.38 10.38 0 0 1 3.06 7.4c0 5.78-4.7 10.49-10.42 10.49Zm5.74-7.83c-.31-.16-1.86-.92-2.15-1.02-.29-.1-.5-.16-.71.16-.21.31-.81 1.02-1 1.23-.18.21-.37.23-.68.08-.31-.16-1.33-.49-2.53-1.56-.93-.83-1.56-1.86-1.75-2.17-.18-.31-.02-.48.14-.64.14-.14.31-.37.47-.55.16-.18.21-.31.31-.52.1-.21.05-.39-.03-.55-.08-.16-.71-1.71-.97-2.34-.26-.61-.52-.53-.71-.54h-.6c-.21 0-.55.08-.84.39-.29.31-1.1 1.07-1.1 2.62s1.13 3.04 1.28 3.25c.16.21 2.22 3.39 5.38 4.75.75.32 1.34.52 1.8.66.75.24 1.44.21 1.98.13.6-.09 1.86-.76 2.12-1.5.26-.73.26-1.36.18-1.5-.08-.13-.29-.21-.6-.37Z" />
    </svg>
  </motion.a>
);
