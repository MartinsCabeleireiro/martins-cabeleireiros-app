import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionHead, Reveal } from "@/components/Reveal";
import { SlotPicker } from "@/components/SlotPicker";
import { BookingSummary } from "@/components/BookingSummary";
import { api, errorText } from "@/lib/api";
import { SLOTS, waLink, formatDuration, addMinutes } from "@/lib/site";

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

export const Booking = ({ services, preselect }) => {
  const [slug, setSlug] = useState("");
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
  useEffect(() => { if (preselect?.slug) setSlug(preselect.slug); }, [preselect]);
  const dateStr = date ? format(date, "yyyy-MM-dd") : "";
  useEffect(() => {
    if (!dateStr) return undefined;
    let alive = true;
    setTime("");
    api.get("/availability", { params: { date: dateStr, service: slug || undefined } })
      .then(({ data }) => { if (alive) setUnavailable(Array.isArray(data?.unavailable) ? data.unavailable : []); })
      .catch(() => { if (alive) setUnavailable([]); });
    return () => { alive = false; };
  }, [dateStr, slug, done]);

  const service = useMemo(() => services.find((s) => s.slug === slug), [services, slug]);
  const isPast = (t) => {
    if (!date || date.getTime() !== today().getTime()) return false;
    const [h, m] = t.split(":").map(Number);
    const now = new Date();
    return h * 60 + m <= now.getHours() * 60 + now.getMinutes();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!service || !date || !time) return toast.error("Escolha serviço, data e horário.");
    const end = addMinutes(time, service.duration_min);
    if (form.name.trim().length < 2 || form.phone.replace(/\D/g, "").length < 10) return toast.error("Informe seu nome e um WhatsApp válido.");
    setSending(true);
    const win = window.open("about:blank", "_blank");
    try {
      const { data } = await api.post("/bookings", { service_slug: slug, date: dateStr, time, ...form });
      const msg = `Olá! Gostaria de agendar no Martins Cabeleireiro:\n\n*Nome:* ${form.name}\n*Telefone:* ${form.phone}\n*Serviço:* ${service.name}\n*Data:* ${format(date, "dd/MM/yyyy (EEEE)", { locale: ptBR })}\n*Horário:* ${time} às ${end} (${formatDuration(service.duration_min)})${form.notes ? `\n*Obs.:* ${form.notes}` : ""}\n\nAguardo a confirmação!`;
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

  const reset = () => { setDone(null); setTime(""); setForm({ name: "", phone: "", notes: "" }); };

  return (
    <section id="agendar" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-36">
      <SectionHead index="03" eyebrow="Agendamento" title={<>Reserve sua <em className="text-[#D4AF37]">cadeira.</em></>}>
        Seu pedido fica registrado com o salão e abrimos o WhatsApp com a mensagem pronta para você confirmar.
      </SectionHead>
      <form data-testid="booking-form" onSubmit={submit} className="grid gap-10 lg:grid-cols-12">
        <Reveal className="flex flex-col gap-10 lg:col-span-7">
          <Step n="01" label="Serviço">
            <Select value={slug} onValueChange={setSlug}>
              <SelectTrigger data-testid="booking-service-select" className="h-14 rounded-none border-[#D4AF37]/30 bg-[#141418] text-base text-zinc-50">
                <SelectValue placeholder="Escolha um serviço" />
              </SelectTrigger>
              <SelectContent className="border-[#D4AF37]/20 bg-[#141418]">
                {services.map((s) => (
                  <SelectItem key={s.slug} value={s.slug} data-testid={`booking-service-option-${s.slug}`}>
                    {s.name} <span className="font-mono-x ml-2 text-xs text-[#D4AF37]">· {formatDuration(s.duration_min)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Step>
          <Step n="02" label="Data e horário">
            <div className="grid gap-6 md:grid-cols-[auto_1fr]">
              <div data-testid="booking-date-picker" className="w-fit rounded-sm border border-[#D4AF37]/20 bg-[#141418]">
                <Calendar mode="single" locale={ptBR} selected={date} onSelect={setDate} disabled={[{ before: today() }, { dayOfWeek: [0] }, ...blockedDays]} />
              </div>
              {date ? (
                <div className="flex flex-col gap-4">
                  {service && <p data-testid="booking-duration-hint" className="text-sm text-zinc-300">Duração estimada: <span className="text-[#E5C158]">{formatDuration(service.duration_min)}</span>. Mostramos só horários com tempo livre suficiente.</p>}
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
        <BookingSummary service={service} date={date} time={time} sending={sending} done={done} onReset={reset} />
      </form>
    </section>
  );
};
