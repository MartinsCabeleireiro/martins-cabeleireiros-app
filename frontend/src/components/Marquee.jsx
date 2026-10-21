const WORDS = ["Corte masculino", "Corte feminino", "Coloração & luzes", "Escova & hidratação", "Design de sobrancelha", "Tratamentos capilares"];

const Row = () => (
  <div className="flex shrink-0 items-center">
    {WORDS.map((w) => (
      <span key={w} className="flex items-center">
        <span className="font-display px-8 text-5xl italic text-zinc-100 sm:text-7xl">{w}</span>
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#D4AF37]" fill="currentColor" aria-hidden="true"><path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" /></svg>
      </span>
    ))}
  </div>
);

export const Marquee = () => (
  <section data-testid="editorial-marquee" aria-label="Serviços" className="relative overflow-hidden border-y border-[#D4AF37]/15 bg-[#0D0D0F] py-8 sm:py-10">
    <div className="marquee-track flex w-max">
      <Row />
      <Row />
    </div>
  </section>
);
