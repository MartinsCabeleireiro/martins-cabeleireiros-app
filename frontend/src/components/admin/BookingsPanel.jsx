import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, X, Trash2, MessageCircle } from "lucide-react";
import { api, errorText } from "@/lib/api";

const FILTERS = [["todos", "Todos"], ["pendente", "Pendentes"], ["confirmado", "Confirmados"], ["cancelado", "Cancelados"]];
const BADGE = { pendente: "border-amber-400/40 text-amber-300", confirmado: "border-emerald-400/40 text-emerald-300", cancelado: "border-red-400/40 text-red-300" };
const fmtDate = (d) => d.split("-").reverse().join("/");
const waClient = (b) => `https://wa.me/55${b.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${b.name}! Seu horário de ${b.service_name} em ${fmtDate(b.date)} às ${b.time} no Martins Cabeleireiro está confirmado.`)}`;

const Act = ({ onClick, label, testid, children }) => (
  <button data-testid={testid} onClick={onClick} title={label} aria-label={label} className="grid h-9 w-9 place-items-center rounded-full border border-[#D4AF37]/20 text-zinc-300 transition-colors hover:border-[#D4AF37] hover:text-[#D4AF37]">{children}</button>
);

export const BookingsPanel = () => {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("todos");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/bookings");
      setItems(Array.isArray(data) ? data : []);
    } catch (e) { toast.error(errorText(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (id, status) => {
    try { await api.patch(`/bookings/${id}`, { status }); toast.success(`Agendamento ${status}.`); load(); }
    catch (e) { toast.error(errorText(e)); }
  };
  const remove = async (id) => {
    if (!window.confirm("Excluir este agendamento?")) return;
    try { await api.delete(`/bookings/${id}`); toast.success("Agendamento excluído."); load(); }
    catch (e) { toast.error(errorText(e)); }
  };

  const shown = filter === "todos" ? items : items.filter((b) => b.status === filter);

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map(([k, l]) => (
          <button key={k} data-testid={`admin-filter-${k}`} onClick={() => setFilter(k)} className={`rounded-full border px-4 py-1.5 text-sm ${filter === k ? "border-[#D4AF37] bg-[#D4AF37] text-[#0D0D0F]" : "border-[#D4AF37]/25 text-zinc-300"}`}>{l}</button>
        ))}
      </div>
      {shown.length === 0 && <p data-testid="admin-empty" className="border border-dashed border-[#D4AF37]/20 p-10 text-center text-zinc-400">Nenhum agendamento por aqui.</p>}
      <ul className="flex flex-col gap-3">
        {shown.map((b) => (
          <li key={b.id} data-testid={`admin-booking-row-${b.id}`} className="grid gap-4 border border-[#D4AF37]/15 bg-[#141418] p-5 md:grid-cols-[140px_1fr_auto] md:items-center">
            <div className="font-mono-x"><p className="text-lg text-zinc-50">{b.time}</p><p className="text-xs text-zinc-400">{fmtDate(b.date)}</p></div>
            <div>
              <p className="text-zinc-50">{b.name} <span className="text-zinc-400">· {b.phone}</span></p>
              <p className="text-sm text-[#E5C158]">{b.service_name}</p>
              {b.notes && <p className="mt-1 text-sm text-zinc-400">“{b.notes}”</p>}
            </div>
            <div className="flex items-center gap-2">
              <span data-testid={`admin-booking-status-${b.id}`} className={`mr-2 rounded-full border px-3 py-1 text-xs capitalize ${BADGE[b.status]}`}>{b.status}</span>
              <Act testid={`admin-confirm-${b.id}`} label="Confirmar" onClick={() => setStatus(b.id, "confirmado")}><Check size={15} /></Act>
              <Act testid={`admin-cancel-${b.id}`} label="Cancelar" onClick={() => setStatus(b.id, "cancelado")}><X size={15} /></Act>
              <a data-testid={`admin-wa-${b.id}`} href={waClient(b)} target="_blank" rel="noreferrer" title="WhatsApp do cliente" className="grid h-9 w-9 place-items-center rounded-full border border-[#D4AF37]/20 text-zinc-300 hover:border-[#25D366] hover:text-[#25D366]"><MessageCircle size={15} /></a>
              <Act testid={`admin-delete-${b.id}`} label="Excluir" onClick={() => remove(b.id)}><Trash2 size={15} /></Act>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
