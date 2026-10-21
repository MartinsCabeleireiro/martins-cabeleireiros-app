import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, CalendarPlus } from "lucide-react";
import { AdminBookingDialog } from "@/components/admin/AdminBookingDialog";
import { api, errorText } from "@/lib/api";
import { addMinutes, formatDuration, toMin } from "@/lib/site";

const OPEN = 8 * 60;
const CLOSE = 20 * 60;
const PX = 1.4;
const HOURS = Array.from({ length: 13 }, (_, i) => 8 + i);
const pad = (n) => String(n).padStart(2, "0");
const toStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const LABEL = (d) => d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
const TONE = { pendente: "border-amber-400/60 bg-amber-400/10", confirmado: "border-emerald-400/60 bg-emerald-400/10" };

const pos = (start, end) => {
  const s = Math.max(start, OPEN);
  const e = Math.min(end, CLOSE);
  return { top: (s - OPEN) * PX + 1, height: Math.max((e - s) * PX - 3, 22) };
};

export const DayAgenda = () => {
  const [day, setDay] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [bookings, setBookings] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [newOpen, setNewOpen] = useState(false);
  const ds = toStr(day);

  const load = useCallback(async () => {
    try {
      const [b, bl] = await Promise.all([api.get("/bookings"), api.get("/blocks")]);
      setBookings(Array.isArray(b.data) ? b.data : []);
      setBlocks(Array.isArray(bl.data) ? bl.data : []);
    } catch (e) { toast.error(errorText(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const shift = (n) => setDay((d) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; });
  const dayBookings = bookings.filter((b) => b.date === ds && b.status !== "cancelado");
  const dayBlocks = blocks.filter((b) => b.date === ds);
  const closed = day.getDay() === 0 || dayBlocks.some((b) => b.all_day);

  return (
    <div data-testid="day-agenda">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button data-testid="agenda-prev-day" onClick={() => shift(-1)} aria-label="Dia anterior" className="grid h-10 w-10 place-items-center rounded-full border border-[#D4AF37]/30 hover:border-[#D4AF37]"><ChevronLeft size={16} /></button>
        <button data-testid="agenda-next-day" onClick={() => shift(1)} aria-label="Próximo dia" className="grid h-10 w-10 place-items-center rounded-full border border-[#D4AF37]/30 hover:border-[#D4AF37]"><ChevronRight size={16} /></button>
        <input data-testid="agenda-date-input" type="date" value={ds} onChange={(e) => { if (e.target.value) { const [y, m, d] = e.target.value.split("-").map(Number); setDay(new Date(y, m - 1, d)); } }} className="border-b border-[#D4AF37]/30 bg-transparent py-2 text-zinc-50 [color-scheme:dark] focus:outline-none" />
        <p data-testid="agenda-day-label" className="font-display text-2xl text-zinc-50 first-letter:uppercase">{LABEL(day)}</p>
        <span data-testid="agenda-count" className="font-mono-x ml-auto text-xs text-zinc-400">{dayBookings.length} atendimento(s)</span>
        <button data-testid="agenda-new-booking" onClick={() => setNewOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-[#0D0D0F] hover:bg-[#E5C158]"><CalendarPlus size={15} /> Novo agendamento</button>
      </div>
      <AdminBookingDialog open={newOpen} onOpenChange={setNewOpen} date={ds} onCreated={load} />
      <div className="relative border border-[#D4AF37]/15 bg-[#141418]" style={{ height: (CLOSE - OPEN) * PX + 16 }}>
        {HOURS.map((h) => (
          <div key={h} className="absolute inset-x-0 flex items-start" style={{ top: (h * 60 - OPEN) * PX + 8 }}>
            <span className="font-mono-x w-14 -translate-y-1/2 pl-3 text-[11px] text-zinc-400">{pad(h)}:00</span>
            <span className="h-px flex-1 bg-[#D4AF37]/10" />
          </div>
        ))}
        <div className="absolute bottom-2 left-14 right-2 top-2">
          {closed && <div data-testid="agenda-closed" className="absolute inset-0 grid place-items-center bg-[repeating-linear-gradient(45deg,rgba(212,175,55,0.07)_0_10px,transparent_10px_20px)] text-sm text-zinc-300">{day.getDay() === 0 ? "Fechado (domingo)" : `Dia bloqueado${dayBlocks.find((b) => b.all_day)?.reason ? ` · ${dayBlocks.find((b) => b.all_day).reason}` : ""}`}</div>}
          {dayBlocks.filter((b) => !b.all_day).map((b) => (
            <div key={b.id} data-testid={`agenda-block-${b.id}`} style={pos(toMin(b.start), toMin(b.end))} className="absolute inset-x-0 flex items-start border-l-2 border-zinc-500 bg-[repeating-linear-gradient(45deg,rgba(161,161,170,0.12)_0_8px,transparent_8px_16px)] px-3 py-1 text-xs text-zinc-300">
              Bloqueado {b.start}–{b.end}{b.reason ? ` · ${b.reason}` : ""}
            </div>
          ))}
          {dayBookings.map((b) => {
            const start = toMin(b.time);
            const dur = b.duration_min || 30;
            return (
              <div key={b.id} data-testid={`agenda-item-${b.id}`} style={pos(start, start + dur)} className={`absolute inset-x-0 overflow-hidden rounded-[2px] border border-l-[3px] px-3 py-1.5 ${TONE[b.status] || TONE.pendente}`}>
                <p className="font-mono-x text-xs text-zinc-100">{b.time}–{addMinutes(b.time, dur)} <span className="text-zinc-400">· {formatDuration(dur)}</span></p>
                <p className="truncate text-sm text-zinc-50">{b.name} <span className="text-[#E5C158]">· {b.service_name}</span></p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
