import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { SectionHead, Reveal } from "@/components/Reveal";
import { SlotPicker } from "@/components/SlotPicker";
import { BookingSummary } from "@/components/BookingSummary";
import { ItemPicker } from "@/components/ItemPicker";
import { api, errorText } from "@/lib/api";
import { useSelection } from "@/lib/cart";
import { SLOTS, waLink, formatDuration, formatPrice, addMinutes } from "@/lib/site";

const maskPhone = (v) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const field = "w-full rounded-none border-0 border-b border-[#D4AF37]/30 bg-transparent px-0 py-3 text-base text-zinc-50 placeholder:text-zinc-500 focus:border-[#D4AF37] focus:outline-none transition-[border-color]";

const Step = ({ n, label, children }) => (
  <div className="border-t border-[#D4AF37]/15 pt-6">
    <p className="eyebrow mb-5">{n} · {label}</p>
    {children}
  </div>
);

export const Booking = ({ services, products = [], preselect }) => {
  const sel = useSelection(services, products);
  const [date, setDate] = useState();
  const [time, setTime] = useState("");
  const [unavailable, setUnavailable] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "", notes: "" });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(null);
  const [blockedDays, setBlockedDays] = useState([]);

  useEffect(() => {
    api.get("/blocked-days")
      .then(({ data }) => setBlockedDays(Array.isArray(data) ? data.map((d) => { const [y, m, dd] = d.split("-").map(Number); return new Date(y, m - 1, dd); }) : []))
      .catch(() => setBlockedDays([]));
  }, []);
  useEffect(() => {
    if (preselect?.slug) sel.setSlugs((l) => (l.includes(preselect.slug) ? l : [...l, preselect.slug]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselect]);
  const dateStr = date ? format(date, "yyyy-MM-dd") : "";
  const slugKey = sel.slugs.join(",");
  useEffect(() => {
    if (!dateStr) return undefined;
    let alive = true;
    setTime("");
    api.get("/availability", { params: { date: dateStr, services: slugKey || undefined } })
      .then(({ data }) => { if (alive) setUnavailable(Array.isArray(data?.unavailable) ? data.unavailable : []); })
      .catch(() => { if (alive) setUnavailable([]); });
    return () => { alive = false; };
  }, [dateStr, slugKey, done]);

  const duration = sel.duration;
  const isPast = (t) => {
    if (!date || date.getTime() !== today().getTime()) return false;
    const [h, m] = t.split(":").map(Number);
    const now = new Date();
    return h * 60 + m <= now.getHours() * 60 + now.getMinutes();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!sel.slugs.length || !date || !time) return toast.error("Escolha ao menos um serviço, a data e o horário.");
    const end = addMinutes(time, duration);
    if (form.name.trim().length < 2 || form.phone.replace(/\D/g, "").length < 10) return toast.error("Informe seu nome e um WhatsApp válido.");
    setSending(true);
    const win = window.open("about:blank", "_blank");
    try {
      const { data } = await api.post("/bookings", { service_slugs: sel.slugs, product_ids: sel.pids, date: dateStr, time, ...form });
      const msg = `Olá! Gostaria de agendar no Martins Cabeleireiro:\n\n*Nome:* ${form.name}\n*Telefone:* ${form.phone}\n*Serviços:* ${sel.names}\n*Data:* ${format(date, "dd/MM/yyyy (EEEE)", { locale: ptBR })}\n*Horário:* ${time} às ${end} (${formatDuration(duration)})\n*Total:* ${formatPrice(data?.price ?? sel.total)}${form.notes ? `\n*Obs.:* ${form.notes}` : ""}\n\nAguardo a confirmação!`;
      const link = waLink(msg);
      if (win) win.location.href = link;
      setDone({ ...data, link });
      toast.success("Agendamento enviado! Confirme pelo WhatsApp.");
    } catch (err) {
      if (win) win.close();
      toast.error(errorText(err));
    } finally {
      setSending(false);
    }
  };

  const reset = () => { setDone(null); setTime(""); sel.reset(); setForm({ name: "", phone: "", notes: "" }); };

  return (
    <section id="agendar" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-36">
      <SectionHead index="03" eyebrow="Agendamento" title={<>Reserve sua <em className="text-[#D4AF37]">cadeira.</em></>}>
        Seu pedido fica registrado com o salão e abrimos o WhatsApp com a mensagem pronta para você confirmar.
      </SectionHead>
      <form data-testid="booking-form" onSubmit={submit} className="grid gap-10 lg:grid-cols-12">
        <Reveal className="flex min-w-0 flex-col gap-10 lg:col-span-7">
          <Step n="01" label="Serviços (escolha um ou mais)">
            <ItemPicker services={services} products={products} sel={sel} prefix="booking" />
          </Step>
          <Step n="02" label="Data e horário">
            <div className="grid gap-6 md:grid-cols-[auto_1fr]">
              <div data-testid="booking-date-picker" className="w-fit rounded-sm border border-[#D4AF37]/20 bg-[#141418]">
                <Calendar mode="single" locale={ptBR} selected={date} onSelect={setDate} disabled={[{ before: today() }, { dayOfWeek: [0] }, ...blockedDays]} />
              </div>
              {date ? (
                <div className="flex flex-col gap-4">
                  {duration > 0 && <p data-testid="booking-duration-hint" className="text-sm text-zinc-300">Duração total estimada: <span className="text-[#E5C158]">{formatDuration(duration)}</span>. Mostramos só horários com tempo livre suficiente.</p>}
                  <SlotPicker slots={SLOTS} unavailable={unavailable} isPast={isPast} value={time} onChange={setTime} />
                </div>
              ) : <p className="self-center text-sm text-zinc-400">Selecione uma data (segunda a sábado) para ver os horários livres.</p>}
            </div>
          </Step>
          <Step n="03" label="Seus dados">
            <div className="grid gap-6 sm:grid-cols-2">
              <input data-testid="booking-name-input" className={field} placeholder="Nome completo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input data-testid="booking-phone-input" className={field} placeholder="WhatsApp (69) 90000-0000" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })} />
              <input data-testid="booking-notes-input" className={`${field} sm:col-span-2`} placeholder="Observações (opcional)" value={form.notes} maxLength={300} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </Step>
        </Reveal>
        <BookingSummary sel={sel} date={date} time={time} sending={sending} done={done} onReset={reset} />
      </form>
    </section>
  );
};
