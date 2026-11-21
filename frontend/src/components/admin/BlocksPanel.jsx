import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Unlock } from "lucide-react";
import { BlockForm } from "@/components/admin/BlockForm";
import { api, errorText } from "@/lib/api";
import { blockLabel } from "@/lib/site";

const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export const BlocksPanel = () => {
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    try { const { data } = await api.get("/blocks"); setItems(Array.isArray(data) ? data : []); }
    catch (e) { toast.error(errorText(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (id) => {
    try { await api.delete(`/blocks/${id}`); toast.success("Horários desbloqueados."); load(); }
    catch (err) { toast.error(errorText(err)); }
  };
  const t = todayStr();
  const upcoming = items.filter((b) => b.forever || (b.until || b.date) >= t);

  return (
    <div className="grid gap-10 lg:grid-cols-[380px_1fr]">
      <BlockForm onCreated={load} />
      <div>
        <p className="eyebrow mb-4">Bloqueios ativos</p>
        {upcoming.length === 0 && <p data-testid="blocks-empty" className="border border-dashed border-[#D4AF37]/20 p-8 text-center text-zinc-400">Nenhum bloqueio agendado.</p>}
        <ul className="flex flex-col gap-3">
          {upcoming.map((b) => (
            <li key={b.id} data-testid={`block-row-${b.id}`} className="flex items-center justify-between gap-4 border border-[#D4AF37]/15 bg-[#141418] p-4">
              <div>
                <p className="font-mono-x text-zinc-50">{blockLabel(b)}</p>
                {b.reason && <p className="text-sm text-zinc-400">{b.reason}</p>}
                {b.except_dates?.length > 0 && <p className="text-xs text-zinc-500">Liberado em: {b.except_dates.map((d) => d.split("-").reverse().join("/")).join(", ")}</p>}
              </div>
              <button data-testid={`block-delete-${b.id}`} onClick={() => remove(b.id)} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#D4AF37]/30 px-4 py-2 text-sm text-zinc-200 hover:border-emerald-400 hover:text-emerald-300"><Unlock size={15} /> Desbloquear</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
