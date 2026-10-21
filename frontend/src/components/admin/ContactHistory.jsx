import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatPrice, formatDuration, isoDate } from "@/lib/site";

const fmt = (d) => d.split("-").reverse().join("/");
const TONE = { pendente: "text-amber-300", confirmado: "text-emerald-300", cancelado: "text-red-300 line-through" };

const Item = ({ b }) => (
  <li data-testid={`history-item-${b.id}`} className="grid grid-cols-[92px_1fr_auto] items-baseline gap-3 py-2 text-sm">
    <span className="font-mono-x text-zinc-300">{fmt(b.date)}</span>
    <span className={`sm:truncate ${b.status === "cancelado" ? "text-zinc-500 line-through" : "text-zinc-100"}`}>
      {b.time} · {b.service_name} <span className="text-zinc-400">({formatDuration(b.duration_min || 30)})</span>
    </span>
    <span className={`font-mono-x text-xs ${TONE[b.status] || ""}`}>{b.status === "cancelado" ? "cancelado" : formatPrice(b.price)}</span>
  </li>
);

export const ContactHistory = ({ contactId }) => {
  const [items, setItems] = useState(null);
  useEffect(() => {
    let alive = true;
    api.get(`/contacts/${contactId}/history`)
      .then(({ data }) => { if (alive) setItems(Array.isArray(data) ? data : []); })
      .catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [contactId]);

  if (items === null) return <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-[#D4AF37]" /></div>;
  if (!items.length) return <p data-testid="history-empty" className="py-3 text-sm text-zinc-400">Nenhum atendimento registrado para este cliente.</p>;

  const today = isoDate(new Date());
  const upcoming = items.filter((b) => b.date > today && b.status !== "cancelado").reverse();
  const past = items.filter((b) => !(b.date > today && b.status !== "cancelado"));
  const spent = past.filter((b) => b.status !== "cancelado").reduce((s, b) => s + (b.price || 0), 0);

  return (
    <div data-testid={`contact-history-${contactId}`} className="flex flex-col gap-4 py-3">
      {upcoming.length > 0 && (
        <div>
          <p className="eyebrow mb-1">Próximos horários</p>
          <ul className="divide-y divide-[#D4AF37]/10">{upcoming.map((b) => <Item key={b.id} b={b} />)}</ul>
        </div>
      )}
      <div>
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <p className="eyebrow">Atendimentos anteriores</p>
          {spent > 0 && <span data-testid="history-total" className="font-mono-x text-xs text-zinc-400">Total: {formatPrice(spent)}</span>}
        </div>
        {past.length ? <ul className="divide-y divide-[#D4AF37]/10">{past.map((b) => <Item key={b.id} b={b} />)}</ul>
          : <p className="py-2 text-sm text-zinc-400">Ainda sem atendimentos anteriores.</p>}
      </div>
    </div>
  );
};
