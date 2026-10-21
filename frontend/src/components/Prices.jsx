import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { SectionHead, Reveal } from "@/components/Reveal";
import { formatPrice, SITE } from "@/lib/site";

export const Prices = ({ services }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);

  return (
    <section id="precos" ref={ref} className="border-t border-[#D4AF37]/10 bg-[#111114] py-24 lg:py-36">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHead index="02" eyebrow="Tabela de preços" title={<>O menu da <em className="text-[#D4AF37]">casa.</em></>}>
          Valores atualizados pelo salão. Serviços marcados como “sob consulta” são avaliados no atendimento.
        </SectionHead>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-5">
            <div className="relative h-[420px] overflow-hidden rounded-t-full border border-[#D4AF37]/25 sm:h-[520px]">
              <motion.img style={{ y }} src="/img/interior.jpg" alt="Interior de barbearia" className="absolute inset-0 h-[125%] w-full -translate-y-[10%] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0F]/80 to-transparent" />
              <p className="font-display absolute bottom-8 left-8 right-8 text-2xl italic text-zinc-100">{SITE.hours}</p>
            </div>
          </Reveal>
          <ul data-testid="price-table" className="flex flex-col lg:col-span-7">
            {services.map((s, i) => (
              <Reveal key={s.slug} delay={i * 0.06}>
                <li data-testid={`price-row-${s.slug}`} className="group border-b border-[#D4AF37]/15 py-7 transition-[padding] duration-500 hover:pl-3">
                  <div className="flex items-baseline gap-4">
                    <span className="font-mono-x text-xs text-[#D4AF37]">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="font-display text-2xl text-zinc-50 transition-colors group-hover:text-[#E5C158] sm:text-3xl">{s.name}</h3>
                    <span className="leader hidden sm:block" />
                    <span className="font-mono-x ml-auto shrink-0 text-sm text-[#E5C158] sm:ml-0">{formatPrice(s.price)}</span>
                  </div>
                  <p className="mt-2 pl-8 text-sm text-zinc-400">{s.description}</p>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
