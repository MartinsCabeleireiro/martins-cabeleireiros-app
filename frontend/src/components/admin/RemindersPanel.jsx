import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { BellRing, Check } from "lucide-react";
import { api, errorText } from "@/lib/api";
import { addMinutes, clientWa, formatPhone, isoDate, SITE, FULL_ADDRESS } from "@/lib/site";

const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return isoDate(d); };
const label = (ds) => { const [y, m, d] = ds.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" }); };
const msg = (b) => `Olá, ${b.name.split(" ")[0]}! Passando para lembrar do seu horário no ${SITE.name}:\n\n*${b.service_name}*\n${label(b.date)} às ${b.time}\n\nEndereço: ${FULL_ADDRESS}\n\nSe precisar remarcar, é só responder esta mensagem. Até lá!`;

export const RemindersPanel = () => {
  const [date, setDate] = useState(tomorrow());
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    try { const { data } = await api.get("/bookings"); setItems(Array.isArray(data) ? data : []); }
    catch (e) { toast.error(errorText(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const day = items.filter((b) => b.date === date).sort((a, b) => a.time.localeCompare(b.time));
  const confirmed = day.filter((b) => b.status === "confirmado");
  const pending = day.filter((b) => b.status === "pendente").length;

  const send = async (b) => {
    try {
      const { data } = await api.post(`/bookings/${b.id}/reminded`);
      setItems((list) => list.map((x) => (x.id === b.id ? { ...x, reminded_at: data?.reminded_at } : x)));
    } catch (e) { toast.error(errorText(e)); }
  };

  return (
    <div data-testid="reminders-panel">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <input data-testid="reminders-date" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="border-b border-[#D4AF37]/30 bg-transparent py-2 text-zinc-50 [color-scheme:dark] focus:outline-none" />
        <p className="font-display text-2xl text-zinc-50 first-letter:uppercase">{label(date)}</p>
        <span data-testid="reminders-summary" className="font-mono-x ml-auto text-xs text-zinc-400">
          {confirmed.filter((b) => b.reminded_at).length}/{confirmed.length} lembretes enviados
        </span>
      </div>
      {pending > 0 && <p data-testid="reminders-pending-note" className="mb-4 text-sm text-amber-300">{pending} agendamento(s) ainda pendente(s) nesta data. Confirme-os em “Agendamentos” para aparecerem aqui.</p>}
      {confirmed.length === 0 && <p data-testid="reminders-empty" className="border border-dashed border-[#D4AF37]/20 p-10 text-center text-zinc-400">Nenhum horário confirmado para esta data.</p>}
      <ul className="flex flex-col gap-3">
        {confirmed.map((b) => (
          <li key={b.id} data-testid={`reminder-row-${b.id}`} className="flex flex-col gap-4 border border-[#D4AF37]/15 bg-[#141418] p-5 sm:flex-row sm:items-center">
            <div className="font-mono-x w-32 shrink-0 text-zinc-50">{b.time}–{addMinutes(b.time, b.duration_min || 30)}</div>
            <div className="min-w-0 flex-1">
              <p className="text-zinc-50">{b.name} <span className="text-zinc-400">· {formatPhone(b.phone)}</span></p>
              <p className="text-sm text-[#E5C158]">{b.service_name}</p>
            </div>
            <a data-testid={`reminder-send-${b.id}`} href={clientWa(b.phone, msg(b))} target="_blank" rel="noreferrer" onClick={() => send(b)}
              className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${b.reminded_at ? "border border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10" : "bg-[#25D366] text-[#0D0D0F] hover:bg-[#3be07a]"}`}>
              {b.reminded_at ? <><Check size={16} /> Enviado · reenviar</> : <><BellRing size={16} /> Enviar lembrete</>}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};
