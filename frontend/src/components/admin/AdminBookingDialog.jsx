import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContactSearch } from "@/components/admin/ContactSearch";
import { api, errorText, useServices } from "@/lib/api";
import { SLOTS, formatDuration, formatPhone, isoDate } from "@/lib/site";

const field = "w-full border-b border-[#D4AF37]/30 bg-transparent py-2 text-zinc-50 placeholder:text-zinc-500 focus:border-[#D4AF37] focus:outline-none [color-scheme:dark]";

export const AdminBookingDialog = ({ open, onOpenChange, contact, date, onCreated }) => {
  const { services } = useServices();
  const [f, setF] = useState({ name: "", phone: "", slug: "", date: isoDate(new Date()), time: "", notes: "" });
  const [unavailable, setUnavailable] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF({ name: contact?.name || "", phone: contact ? formatPhone(contact.phone) : "", slug: "", date: date || isoDate(new Date()), time: "", notes: "" });
  }, [open, contact, date]);

  useEffect(() => {
    if (!open || !f.date) return undefined;
    let alive = true;
    api.get("/availability", { params: { date: f.date, service: f.slug || undefined } })
      .then(({ data }) => { if (alive) setUnavailable(Array.isArray(data?.unavailable) ? data.unavailable : []); })
      .catch(() => { if (alive) setUnavailable([]); });
    return () => { alive = false; };
  }, [open, f.date, f.slug]);

  const submit = async (e) => {
    e.preventDefault();
    if (!f.slug || !f.time) return toast.error("Escolha serviço e horário.");
    setBusy(true);
    try {
      const { data } = await api.post("/bookings", { name: f.name, phone: f.phone, service_slug: f.slug, date: f.date, time: f.time, notes: f.notes });
      await api.patch(`/bookings/${data.id}`, { status: "confirmado" });
      api.post("/contacts", { name: f.name, phone: f.phone }).catch(() => {});
      toast.success("Agendamento criado e confirmado.");
      onCreated?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="admin-booking-dialog" className="max-h-[92vh] overflow-y-auto border-[#D4AF37]/25 bg-[#141418] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl font-normal text-zinc-50">Novo agendamento</DialogTitle>
          <DialogDescription className="text-zinc-400">Busque um cliente na base de contatos ou digite um novo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <ContactSearch onPick={(c) => setF((x) => ({ ...x, name: c.name, phone: formatPhone(c.phone) }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <input data-testid="admin-booking-name" required minLength={2} placeholder="Nome" className={field} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <input data-testid="admin-booking-phone" required placeholder="Telefone" inputMode="tel" className={field} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </div>
          <Select value={f.slug} onValueChange={(v) => setF({ ...f, slug: v, time: "" })}>
            <SelectTrigger data-testid="admin-booking-service" className="rounded-none border-[#D4AF37]/30 bg-transparent text-zinc-50"><SelectValue placeholder="Serviço" /></SelectTrigger>
            <SelectContent className="border-[#D4AF37]/20 bg-[#141418]">
              {services.map((s) => <SelectItem key={s.slug} value={s.slug}>{s.name} · {formatDuration(s.duration_min)}</SelectItem>)}
            </SelectContent>
          </Select>
          <input data-testid="admin-booking-date" type="date" required className={field} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value, time: "" })} />
          <div className="grid grid-cols-4 gap-2">
            {SLOTS.map((t) => {
              const off = unavailable.includes(t);
              return (
                <button type="button" key={t} disabled={off} data-testid={`admin-booking-slot-${t.replace(":", "")}`} onClick={() => setF({ ...f, time: t })}
                  className={`font-mono-x rounded-full border py-1.5 text-xs ${f.time === t ? "border-[#D4AF37] bg-[#D4AF37] text-[#0D0D0F]" : off ? "border-zinc-800 text-zinc-600 line-through" : "border-[#D4AF37]/25 text-zinc-200 hover:border-[#D4AF37]"}`}>{t}</button>
              );
            })}
          </div>
          <input data-testid="admin-booking-notes" placeholder="Observações (opcional)" maxLength={300} className={field} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          <button data-testid="admin-booking-submit" disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D4AF37] py-3 text-sm font-semibold text-[#0D0D0F] hover:bg-[#E5C158] disabled:opacity-60">
            {busy && <Loader2 size={16} className="animate-spin" />} Agendar e confirmar
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
