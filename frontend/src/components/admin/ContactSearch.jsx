import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { formatPhone } from "@/lib/site";

export const ContactSearch = ({ onPick }) => {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) { setItems([]); return undefined; }
    let alive = true;
    const t = setTimeout(() => {
      api.get("/contacts", { params: { q, limit: 8 } })
        .then(({ data }) => { if (alive) setItems(Array.isArray(data?.items) ? data.items : []); })
        .catch(() => { if (alive) setItems([]); });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 border border-[#D4AF37]/30 px-3">
        <Search size={16} className="text-[#D4AF37]" />
        <input data-testid="contact-search-input" placeholder="Buscar cliente por nome ou telefone" value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          className="w-full bg-transparent py-3 text-zinc-50 placeholder:text-zinc-500 focus:outline-none" />
      </div>
      {open && items.length > 0 && (
        <ul data-testid="contact-search-results" className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto border border-[#D4AF37]/25 bg-[#0D0D0F]">
          {items.map((c) => (
            <li key={c.id}>
              <button type="button" data-testid={`contact-pick-${c.id}`} onClick={() => { onPick(c); setQ(""); setOpen(false); }}
                className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-[#D4AF37]/10">
                <span className="truncate text-zinc-100">{c.name}</span>
                <span className="font-mono-x shrink-0 text-xs text-zinc-400">{formatPhone(c.phone)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
