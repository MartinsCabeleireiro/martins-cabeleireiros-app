import { useState } from "react";
import { toast } from "sonner";
import { Ban } from "lucide-react";
import { api, errorText } from "@/lib/api";
import { SLOTS, isoDate } from "@/lib/site";

const ENDS = [...SLOTS.slice(1), "20:00"];
export const SCOPES = [["dia", "Apenas 1 dia"], ["semana", "1 semana"], ["mes", "1 mês"], ["ano", "1 ano"], ["indeterminado", "Indeterminado (até eu desbloquear)"]];
const input = "border-b border-[#D4AF37]/30 bg-transparent py-2 text-zinc-50 focus:border-[#D4AF37] focus:outline-none [color-scheme:dark]";

export const BlockForm = ({ date, onCreated }) => {
  const [f, setF] = useState({ date: date || isoDate(new Date()), scope: "dia", all_day: false, start: "12:00", end: "14:00", reason: "Almoço" });
  const add = async (e) => {
    e.preventDefault();
    try { await api.post("/blocks", f); toast.success("Bloqueio adicionado."); onCreated?.(); }
    catch (err) { toast.error(errorText(err)); }
  };
  const opt = (s) => <option key={s} value={s} className="bg-[#141418]">{s}</option>;
  return (
    <form data-testid="block-form" onSubmit={add} className="flex flex-col gap-5 border border-[#D4AF37]/20 bg-[#141418] p-6">
      <p className="eyebrow">Bloquear horários</p>
      <label className="flex flex-col gap-1 text-xs text-zinc-400">A partir de
        <input data-testid="block-date-input" type="date" required className={input} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-400">Por quanto tempo
        <select data-testid="block-scope-select" className={input} value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value })}>
          {SCOPES.map(([k, l]) => <option key={k} value={k} className="bg-[#141418]">{l}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-3 text-sm text-zinc-200">
        <input data-testid="block-allday-checkbox" type="checkbox" className="h-4 w-4 accent-[#D4AF37]" checked={f.all_day} onChange={(e) => setF({ ...f, all_day: e.target.checked })} />
        Dia inteiro (feriado / folga)
      </label>
      {!f.all_day && (
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-xs text-zinc-400">Das
            <select data-testid="block-start-select" className={input} value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })}>{SLOTS.map(opt)}</select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-400">Até
            <select data-testid="block-end-select" className={input} value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })}>{ENDS.map(opt)}</select>
          </label>
        </div>
      )}
      <input data-testid="block-reason-input" placeholder="Motivo (ex.: Almoço, Feriado, Folga)" maxLength={80} className={input} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} />
      <button data-testid="block-submit-button" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D4AF37] py-3 text-sm font-semibold text-[#0D0D0F] hover:bg-[#E5C158]"><Ban size={16} /> Bloquear</button>
    </form>
  );
};
