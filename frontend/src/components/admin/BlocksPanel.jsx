import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, Ban } from "lucide-react";
import { api, errorText } from "@/lib/api";
import { SLOTS } from "@/lib/site";

const ENDS = [...SLOTS.slice(1), "20:00"];
const fmtDate = (d) => d.split("-").reverse().join("/");
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const input = "border-b border-[#D4AF37]/30 bg-transparent py-2 text-zinc-50 focus:border-[#D4AF37] focus:outline-none [color-scheme:dark]";

export const BlocksPanel = () => {
  const [items, setItems] = useState([]);
  const [f, setF] = useState({ date: todayStr(), all_day: true, start: "08:00", end: "12:00", reason: "" });

  const load = useCallback(async () => {
    try { const { data } = await api.get("/blocks"); setItems(Array.isArray(data) ? data : []); }
    catch (e) { toast.error(errorText(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async (e) => {
    e.preventDefault();
    try { await api.post("/blocks", f); toast.success("Bloqueio adicionado."); setF({ ...f, reason: "" }); load(); }
    catch (err) { toast.error(errorText(err)); }
  };
  const remove = async (id) => {
    try { await api.delete(`/blocks/${id}`); toast.success("Bloqueio removido."); load(); }
    catch (err) { toast.error(errorText(err)); }
  };
  const upcoming = items.filter((b) => b.date >= todayStr());

  return (
    <div className="grid gap-10 lg:grid-cols-[380px_1fr]">
      <form data-testid="block-form" onSubmit={add} className="flex flex-col gap-5 border border-[#D4AF37]/20 bg-[#141418] p-6">
        <p className="eyebrow">Novo bloqueio</p>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">Data
          <input data-testid="block-date-input" type="date" required className={input} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </label>
        <label className="flex items-center gap-3 text-sm text-zinc-200">
          <input data-testid="block-allday-checkbox" type="checkbox" className="h-4 w-4 accent-[#D4AF37]" checked={f.all_day} onChange={(e) => setF({ ...f, all_day: e.target.checked })} />
          Dia inteiro (feriado / folga)
        </label>
        {!f.all_day && (
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-xs text-zinc-400">Das
              <select data-testid="block-start-select" className={input} value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })}>{SLOTS.map((s) => <option key={s} value={s} className="bg-[#141418]">{s}</option>)}</select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-400">Até
              <select data-testid="block-end-select" className={input} value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })}>{ENDS.map((s) => <option key={s} value={s} className="bg-[#141418]">{s}</option>)}</select>
            </label>
          </div>
        )}
        <input data-testid="block-reason-input" placeholder="Motivo (ex.: Feriado, Folga, Almoço)" maxLength={80} className={input} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} />
        <button data-testid="block-submit-button" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D4AF37] py-3 text-sm font-semibold text-[#0D0D0F] hover:bg-[#E5C158]"><Ban size={16} /> Bloquear</button>
      </form>
      <div>
        <p className="eyebrow mb-4">Próximos bloqueios</p>
        {upcoming.length === 0 && <p data-testid="blocks-empty" className="border border-dashed border-[#D4AF37]/20 p-8 text-center text-zinc-400">Nenhum bloqueio agendado.</p>}
        <ul className="flex flex-col gap-3">
          {upcoming.map((b) => (
            <li key={b.id} data-testid={`block-row-${b.id}`} className="flex items-center justify-between gap-4 border border-[#D4AF37]/15 bg-[#141418] p-4">
              <div>
                <p className="font-mono-x text-zinc-50">{fmtDate(b.date)} <span className="text-[#E5C158]">· {b.all_day ? "Dia inteiro" : `${b.start}–${b.end}`}</span></p>
                {b.reason && <p className="text-sm text-zinc-400">{b.reason}</p>}
              </div>
              <button data-testid={`block-delete-${b.id}`} onClick={() => remove(b.id)} aria-label="Remover bloqueio" className="grid h-9 w-9 place-items-center rounded-full border border-[#D4AF37]/20 text-zinc-300 hover:border-red-400 hover:text-red-300"><Trash2 size={15} /></button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
