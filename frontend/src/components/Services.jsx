import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { SectionHead } from "@/components/Reveal";
import { SERVICE_IMAGES, formatPrice } from "@/lib/site";

const SPANS = {
  corte: "lg:col-span-4 lg:row-span-2 h-[380px] lg:h-auto",
  coloracao: "lg:col-span-2 lg:row-span-2 h-[380px] lg:h-auto",
  escova: "lg:col-span-2 h-[300px] lg:h-auto",
  sobrancelha: "lg:col-span-2 h-[300px] lg:h-auto",
  tratamentos: "lg:col-span-2 h-[300px] lg:h-auto",
};

const Card = ({ s, i, onBook }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.15 }}
    transition={{ duration: 1, delay: (i % 3) * 0.08, ease: [0.16, 1, 0.3, 1] }}
    className={SPANS[s.slug] || "lg:col-span-2 h-[300px] lg:h-auto"}
  >
    <article data-testid={`service-card-${s.slug}`} className="group relative h-full overflow-hidden rounded-[2px] bg-[#141418]">
      <img src={SERVICE_IMAGES[s.slug] || "/img/interior.jpg"} alt={s.name} loading="lazy" className="absolute inset-0 h-full w-full scale-105 object-cover grayscale-[40%] transition-[transform,filter] duration-[1400ms] ease-out group-hover:scale-110 group-hover:grayscale-0" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0F] via-[#0D0D0F]/55 to-[#0D0D0F]/10" />
      <div className="pointer-events-none absolute inset-3 border border-[#D4AF37]/0 transition-[border-color] duration-500 group-hover:border-[#D4AF37]/45" />
      <span className="font-mono-x absolute left-6 top-6 text-xs tracking-[0.25em] text-[#D4AF37]">{String(i + 1).padStart(2, "0")}</span>
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-6 sm:p-8">
        <h3 className="font-display text-3xl font-medium leading-tight text-zinc-50 sm:text-4xl">{s.name}</h3>
        <p className="max-w-md text-sm leading-relaxed text-zinc-300">{s.description}</p>
        <div className="mt-2 flex items-center justify-between gap-4">
          <span data-testid={`service-price-${s.slug}`} className="font-mono-x text-sm text-[#E5C158]">{formatPrice(s.price)}</span>
          <button data-testid={`service-book-${s.slug}`} onClick={() => onBook(s.slug)} className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/50 px-4 py-2 text-xs font-medium uppercase tracking-[0.15em] text-zinc-100 transition-[background-color,color] duration-300 hover:bg-[#D4AF37] hover:text-[#0D0D0F]">
            Agendar <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </article>
  </motion.div>
);

export const Services = ({ services, onBook }) => (
  <section id="servicos" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-36">
    <SectionHead index="01" eyebrow="Catálogo" title={<>Barbearia e salão,<br /><em className="text-[#D4AF37]">no mesmo endereço.</em></>}>
      Do corte clássico ao cuidado completo com os fios. Toque em um serviço para reservar seu horário.
    </SectionHead>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-6 lg:auto-rows-[260px]">
      {services.map((s, i) => <Card key={s.slug} s={s} i={i} onBook={onBook} />)}
    </div>
  </section>
);
