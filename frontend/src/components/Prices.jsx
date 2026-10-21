import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { SectionHead, Reveal } from "@/components/Reveal";
import { formatPrice, formatDuration, SITE, GROUPS } from "@/lib/site";

export const Prices = ({ services }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);

  return (
    <section id="precos" ref={ref} className="border-t border-[#D4AF37]/10 bg-[#111114] py-24 lg:py-36">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHead index="02" eyebrow="Tabela de preços" title={<>O menu da <em className="text-[#D4AF37]">casa.</em></>}>
          Valores do salão com o tempo médio de cada procedimento — é esse tempo que reservamos na agenda para você.
        </SectionHead>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-5">
            <div className="relative h-[420px] overflow-hidden rounded-t-full border border-[#D4AF37]/25 sm:h-[520px] lg:sticky lg:top-28">
              <motion.img style={{ y }} src="/img/interior.jpg" alt="Interior de barbearia" className="absolute inset-0 h-[125%] w-full -translate-y-[10%] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0F]/80 to-transparent" />
              <p className="font-display absolute bottom-8 left-8 right-8 text-2xl italic text-zinc-100">{SITE.hours}</p>
            </div>
          </Reveal>
          <div data-testid="price-table" className="flex flex-col gap-12 lg:col-span-7">
            {GROUPS.map((g, gi) => {
              const items = services.filter((s) => s.group === g.key);
              if (!items.length) return null;
              return (
                <Reveal key={g.key} delay={0.04}>
                  <p className="eyebrow mb-2">{String(gi + 1).padStart(2, "0")} · {g.name}</p>
                  <ul>
                    {items.map((s) => (
                      <li key={s.slug} data-testid={`price-row-${s.slug}`} className="group flex items-baseline gap-3 border-b border-[#D4AF37]/15 py-4 transition-[padding] duration-500 hover:pl-3">
                        <h3 className="font-display text-2xl text-zinc-50 transition-colors group-hover:text-[#E5C158]">{s.name}</h3>
                        <span data-testid={`price-duration-${s.slug}`} className="font-mono-x shrink-0 text-xs text-zinc-400">{formatDuration(s.duration_min)}</span>
                        <span className="leader" />
                        <span data-testid={`price-value-${s.slug}`} className="font-mono-x shrink-0 text-sm text-[#E5C158]">{formatPrice(s.price)}</span>
                      </li>
                    ))}
                  </ul>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
