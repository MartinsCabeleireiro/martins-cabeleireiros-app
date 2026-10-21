import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, errorText, useServices } from "@/lib/api";

const PriceRow = ({ s, onSaved }) => {
  const [val, setVal] = useState(s.price ?? "");
  useEffect(() => { setVal(s.price ?? ""); }, [s.price]);
  const save = async () => {
    const price = val === "" ? null : Number(String(val).replace(",", "."));
    if (price !== null && (Number.isNaN(price) || price < 0)) return toast.error("Valor inválido.");
    try { await api.put(`/services/${s.slug}`, { price }); toast.success(`Preço de “${s.name}” salvo.`); onSaved(); }
    catch (e) { toast.error(errorText(e)); }
  };
  return (
    <li className="flex flex-col gap-3 border-b border-[#D4AF37]/15 py-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-display text-2xl text-zinc-50">{s.name}</p>
      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-400">R$</span>
        <input data-testid={`admin-price-input-${s.slug}`} inputMode="decimal" placeholder="Sob consulta" value={val} onChange={(e) => setVal(e.target.value)} className="w-32 border-b border-[#D4AF37]/30 bg-transparent py-2 font-mono text-zinc-50 placeholder:text-zinc-500 focus:border-[#D4AF37] focus:outline-none" />
        <button data-testid={`admin-price-save-${s.slug}`} onClick={save} className="rounded-full bg-[#D4AF37] px-5 py-2 text-sm font-semibold text-[#0D0D0F] hover:bg-[#E5C158]">Salvar</button>
      </div>
    </li>
  );
};

export const PricesPanel = () => {
  const { services, reload } = useServices();
  return (
    <div>
      <p className="mb-6 text-sm text-zinc-400">Deixe o campo vazio para exibir “Sob consulta” no site.</p>
      <ul>{services.map((s) => <PriceRow key={s.slug} s={s} onSaved={reload} />)}</ul>
    </div>
  );
};
