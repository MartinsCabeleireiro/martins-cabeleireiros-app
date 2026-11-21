import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayAgenda } from "@/components/admin/DayAgenda";
import { api } from "@/lib/api";
import { isoDate } from "@/lib/site";

const COLORS = {
  livre: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
  parcial: "border-amber-400/50 bg-amber-400/15 text-amber-200",
  lotado: "border-red-500/50 bg-red-500/20 text-red-200",
  bloqueado: "border-zinc-500/40 bg-zinc-600/30 text-zinc-300",
  fechado: "border-zinc-700/40 bg-zinc-800/40 text-zinc-500",
};
const LEGEND = [["livre", "Livre"], ["parcial", "Parcial"], ["lotado", "Lotado"], ["bloqueado", "Bloqueado / fechado"]];
const WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const CalendarTab = () => {
  const [day, setDay] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [month, setMonth] = useState(() => new Date(day.getFullYear(), day.getMonth(), 1));
  const [days, setDays] = useState([]);
  const [tick, setTick] = useState(0);
  const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;

  useEffect(() => {
    let alive = true;
    api.get("/admin/month", { params: { month: key } })
      .then(({ data }) => { if (alive) setDays(Array.isArray(data) ? data : []); })
      .catch(() => { if (alive) setDays([]); });
    return () => { alive = false; };
  }, [key, tick]);
  useEffect(() => {
    setMonth((m) => (day.getMonth() !== m.getMonth() || day.getFullYear() !== m.getFullYear() ? new Date(day.getFullYear(), day.getMonth(), 1) : m));
  }, [day]);

  const shift = (n) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
  const sel = isoDate(day);
  const today = isoDate(new Date());

  return (
    <div className="flex flex-col gap-10">
      <div data-testid="month-calendar" className="border border-[#D4AF37]/15 bg-[#141418] p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <button data-testid="month-prev" onClick={() => shift(-1)} aria-label="Mês anterior" className="grid h-9 w-9 place-items-center rounded-full border border-[#D4AF37]/30"><ChevronLeft size={16} /></button>
          <p data-testid="month-label" className="font-display flex-1 text-center text-2xl text-zinc-50 first-letter:uppercase">{month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</p>
          <button data-testid="month-next" onClick={() => shift(1)} aria-label="Próximo mês" className="grid h-9 w-9 place-items-center rounded-full border border-[#D4AF37]/30"><ChevronRight size={16} /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {WEEK.map((w) => <p key={w} className="font-mono-x pb-1 text-center text-[11px] uppercase text-zinc-400">{w}</p>)}
          {Array.from({ length: month.getDay() }).map((_, i) => <span key={`e${i}`} />)}
          {days.map((d) => (
            <button key={d.date} data-testid={`month-day-${d.date}`} onClick={() => { const [y, m, dd] = d.date.split("-").map(Number); setDay(new Date(y, m - 1, dd)); }}
              className={`flex aspect-square flex-col items-center justify-center rounded-sm border text-sm transition-transform hover:scale-105 sm:aspect-auto sm:h-16 ${COLORS[d.status]} ${d.date === sel ? "ring-2 ring-[#D4AF37]" : ""} ${d.date < today ? "opacity-50" : ""}`}>
              <span className="font-mono-x">{Number(d.date.slice(-2))}</span>
              {d.count > 0 && <span className="text-[10px] opacity-80">{d.count}</span>}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          {LEGEND.map(([k, l]) => <span key={k} className="flex items-center gap-2 text-xs text-zinc-300"><span className={`h-3 w-3 rounded-sm border ${COLORS[k]}`} />{l}</span>)}
        </div>
      </div>
      <DayAgenda day={day} setDay={setDay} onChanged={() => setTick((t) => t + 1)} />
    </div>
  );
};
