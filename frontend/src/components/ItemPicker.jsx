import { useMemo, useState } from "react";
import { Check, Search, Clock, ShoppingBag } from "lucide-react";
import { PriceTag } from "@/components/PriceTag";
import { formatDuration } from "@/lib/site";

const norm = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const Row = ({ on, onClick, testid, name, meta, item }) => (
  <button type="button" data-testid={testid} onClick={onClick} aria-pressed={on}
    className={`flex w-full flex-wrap items-center gap-x-3 gap-y-1 border px-4 py-3 text-left transition-colors ${on ? "border-[#D4AF37] bg-[#D4AF37]/10" : "border-[#D4AF37]/15 hover:border-[#D4AF37]/50"}`}>
    <span className={`grid h-5 w-5 shrink-0 place-items-center border ${on ? "border-[#D4AF37] bg-[#D4AF37] text-[#0D0D0F]" : "border-zinc-500"}`}>{on && <Check size={13} />}</span>
    <span className="min-w-0 flex-1 basis-[65%] sm:basis-0">
      <span className="block text-zinc-50">{name}</span>
      {meta && <span className="font-mono-x flex items-center gap-1 text-xs text-zinc-400">{meta}</span>}
    </span>
    <PriceTag item={item} className="ml-auto shrink-0 justify-end text-sm" />
  </button>
);

export const ItemPicker = ({ services, products, sel, prefix = "picker" }) => {
  const [q, setQ] = useState("");
  const s = useMemo(() => services.filter((x) => norm(x.name).includes(norm(q))), [services, q]);
  const p = useMemo(() => products.filter((x) => norm(x.name).includes(norm(q))), [products, q]);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center gap-2 border border-[#D4AF37]/30 bg-[#141418] px-3">
        <Search size={16} className="text-[#D4AF37]" />
        <input data-testid={`${prefix}-search`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar serviço ou produto"
          className="w-full bg-transparent py-3 text-zinc-50 placeholder:text-zinc-500 focus:outline-none" />
      </div>
      <div className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1" data-lenis-prevent>
        {s.map((x) => (
          <Row key={x.slug} testid={`${prefix}-service-${x.slug}`} on={sel.slugs.includes(x.slug)} onClick={() => sel.toggleService(x.slug)}
            name={x.name} meta={<><Clock size={11} />{formatDuration(x.duration_min)}</>} item={x} />
        ))}
        {p.length > 0 && <p className="eyebrow mt-2 flex items-center gap-2"><ShoppingBag size={12} /> Produtos</p>}
        {p.map((x) => (
          <Row key={x.id} testid={`${prefix}-product-${x.id}`} on={sel.pids.includes(x.id)} onClick={() => sel.toggleProduct(x.id)}
            name={x.name} meta={x.description || "Produto"} item={x} />
        ))}
        {!s.length && !p.length && <p className="py-4 text-center text-sm text-zinc-400">Nada encontrado para “{q}”.</p>}
      </div>
    </div>
  );
};
