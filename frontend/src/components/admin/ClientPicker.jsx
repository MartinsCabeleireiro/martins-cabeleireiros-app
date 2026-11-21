import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Search, UserPlus, X } from "lucide-react";
import { api, errorText } from "@/lib/api";
import { formatPhone } from "@/lib/site";

const field = "w-full border-b border-[#D4AF37]/30 bg-transparent py-2 text-zinc-50 placeholder:text-zinc-500 focus:border-[#D4AF37] focus:outline-none";

const QuickAdd = ({ seed, onDone, onCancel }) => {
  const digits = /\d{3,}/.test(seed);
  const [f, setF] = useState({ name: digits ? "" : seed, phone: digits ? seed : "", list: "Geral" });
  const save = async () => {
    try {
      await api.post("/contacts", f);
      toast.success("Cliente adicionada à base.");
      onDone({ name: f.name, phone: f.phone });
    } catch (e) { toast.error(errorText(e)); }
  };
  return (
    <div data-testid="quick-add-form" className="flex flex-col gap-3 border border-[#D4AF37]/30 bg-[#0D0D0F] p-4">
      <p className="eyebrow">Nova cliente</p>
      <input data-testid="quick-add-name" placeholder="Nome" className={field} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <input data-testid="quick-add-phone" placeholder="Telefone / WhatsApp" inputMode="tel" className={field} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      <div className="flex gap-2">
        <button type="button" data-testid="quick-add-save" onClick={save} className="rounded-full bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-[#0D0D0F]">Salvar e usar</button>
        <button type="button" onClick={onCancel} className="rounded-full border border-[#D4AF37]/30 px-4 py-2 text-sm text-zinc-300">Cancelar</button>
      </div>
    </div>
  );
};

export const ClientPicker = ({ onPick }) => {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [searched, setSearched] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setSearched(false);
    if (q.trim().length < 2) { setItems([]); return undefined; }
    let alive = true;
    const t = setTimeout(() => {
      api.get("/contacts", { params: { q, limit: 8 } })
        .then(({ data }) => { if (alive) { setItems(Array.isArray(data?.items) ? data.items : []); setSearched(true); } })
        .catch(() => { if (alive) { setItems([]); setSearched(true); } });
    }, 200);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);

  const pick = (c) => { onPick(c); setQ(""); setItems([]); setAdding(false); };

  return (
    <div className="relative flex flex-col gap-2">
      <div className="flex items-center gap-2 border border-[#D4AF37]/30 px-3">
        <Search size={16} className="text-[#D4AF37]" />
        <input data-testid="contact-search-input" placeholder="Buscar cliente por nome, parte do nome ou telefone" value={q}
          onChange={(e) => { setQ(e.target.value); setAdding(false); }} className="w-full bg-transparent py-3 text-zinc-50 placeholder:text-zinc-500 focus:outline-none" />
        {q && <button type="button" aria-label="Limpar" onClick={() => setQ("")} className="text-zinc-400"><X size={14} /></button>}
      </div>
      {items.length > 0 && (
        <ul data-testid="contact-search-results" className="max-h-56 overflow-y-auto border border-[#D4AF37]/25 bg-[#0D0D0F]" data-lenis-prevent>
          {items.map((c) => (
            <li key={c.id}>
              <button type="button" data-testid={`contact-pick-${c.id}`} onClick={() => pick(c)} className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-[#D4AF37]/10">
                <span className="truncate text-zinc-100">{c.name}</span>
                <span className="font-mono-x shrink-0 text-xs text-zinc-400">{formatPhone(c.phone)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {searched && !items.length && !adding && (
        <button type="button" data-testid="quick-add-button" onClick={() => setAdding(true)} className="inline-flex w-fit items-center gap-2 rounded-full border border-dashed border-[#D4AF37]/60 px-4 py-2 text-sm text-[#E5C158] hover:bg-[#D4AF37]/10">
          <UserPlus size={15} /> + Adicionar Nova Cliente “{q}”
        </button>
      )}
      {adding && <QuickAdd seed={q.trim()} onDone={pick} onCancel={() => setAdding(false)} />}
    </div>
  );
};
