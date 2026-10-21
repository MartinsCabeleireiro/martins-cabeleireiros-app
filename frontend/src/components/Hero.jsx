import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowDownRight } from "lucide-react";
import { HeroEmblem } from "@/components/HeroEmblem";
import { scrollToId } from "@/lib/smooth";
import { SITE } from "@/lib/site";

const LINES = [
  { t: "Tradição", c: "text-zinc-50" },
  { t: "na tesoura,", c: "text-zinc-50 pl-[8vw] lg:pl-24" },
  { t: "estilo no espelho.", c: "italic text-[#D4AF37]" },
];
const ease = [0.16, 1, 0.3, 1];

export const Hero = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "-18%"]);

  return (
    <section id="inicio" ref={ref} className="relative min-h-[100svh] overflow-hidden pt-24">
      <motion.div style={{ y: imgY }} className="absolute inset-0 -z-10">
        <img src="/img/hero.jpg" alt="Cadeira de barbeiro clássica" className="h-[115%] w-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0D0D0F] via-[#0D0D0F]/70 to-[#0D0D0F]/30" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0D0D0F]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_35%,rgba(212,175,55,0.16),transparent_55%)]" />
      </motion.div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-5 pb-20 pt-6 sm:px-8 lg:grid-cols-12 lg:pt-16">
        <HeroEmblem className="order-first mx-auto w-48 sm:w-60 lg:order-last lg:col-span-5 lg:w-full lg:max-w-[440px]" />
        <motion.div style={{ y: textY }} className="lg:col-span-7">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 1 }} className="eyebrow mb-8">
            Barbearia & Salão · {SITE.city}
          </motion.p>
          <h1 data-testid="hero-title" className="font-display text-[13vw] font-medium leading-[0.92] tracking-tight sm:text-7xl lg:text-[6.6rem] xl:text-[7.5rem]">
            {LINES.map((l, i) => (
              <span key={l.t} className="block overflow-hidden pb-[0.08em]">
                <motion.span initial={{ y: "110%" }} animate={{ y: "0%" }} transition={{ duration: 1.2, delay: 0.25 + i * 0.14, ease }} className={`block ${l.c}`}>
                  {l.t}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 1, ease }} className="mt-10 max-w-xl">
            <p className="text-base leading-relaxed text-zinc-300 md:text-lg">
              Cortes masculinos e femininos, coloração, escova, hidratação e design de sobrancelha. Escolha o serviço, reserve seu horário e confirme pelo WhatsApp.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <button data-testid="hero-cta-booking" onClick={() => scrollToId("agendar")} className="group inline-flex items-center gap-3 rounded-full bg-[#D4AF37] px-8 py-4 text-sm font-semibold text-[#0D0D0F] transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-[#E5C158]">
                Agendar agora
                <ArrowDownRight size={18} className="transition-transform duration-300 group-hover:rotate-[-45deg]" />
              </button>
              <button data-testid="hero-cta-prices" onClick={() => scrollToId("precos")} className="rounded-full border border-[#D4AF37]/40 px-8 py-4 text-sm font-medium text-zinc-100 transition-[border-color,background-color] duration-300 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10">
                Ver tabela de preços
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 md:flex">
        <span className="font-mono-x text-[11px] uppercase tracking-[0.3em] text-zinc-400">Role</span>
        <span className="h-12 w-px animate-pulse bg-gradient-to-b from-[#D4AF37] to-transparent" />
      </motion.div>
    </section>
  );
};
