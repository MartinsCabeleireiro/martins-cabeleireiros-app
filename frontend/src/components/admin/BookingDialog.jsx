import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ClientPicker } from "@/components/admin/ClientPicker";
import { ItemPicker } from "@/components/ItemPicker";
import { PromoBadge } from "@/components/PriceTag";
import { api, errorText, useServices, useProducts } from "@/lib/api";
import { useSelection } from "@/lib/cart";
import { SLOTS, formatDuration, formatPhone, formatPrice, addMinutes, isoDate } from "@/lib/site";

const field = "w-full border-b border-[#D4AF37]/30 bg-transparent py-2 text-zinc-50 placeholder:text-zinc-500 focus:border-[#D4AF37] focus:outline-none [color-scheme:dark]";

export const BookingDialog = ({ open, onOpenChange, contact, date, booking, onSaved }) => {
  const { services } = useServices();
  const { products } = useProducts();
  const sel = useSelection(services, products);
  const [f, setF] = useState({ name: "", phone: "", date: isoDate(new Date()), time: "", notes: "" });
  const [unavailable, setUnavailable] = useState([]);
  const [busy, setBusy] = useState(false);
  const editing = !!booking;

  useEffect(() => {
    if (!open) return;
    if (booking) {
      setF({ name: booking.name, phone: booking.phone, date: booking.date, time: booking.time, notes: booking.notes || "" });
      sel.setSlugs(booking.services?.length ? booking.services.map((s) => s.slug) : [booking.service_slug]);
      sel.setPids((booking.products || []).map((p) => p.id));
    } else {
      setF({ name: contact?.name || "", phone: contact ? formatPhone(contact.phone) : "", date: date || isoDate(new Date()), time: "", notes: "" });
      sel.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contact, date, booking]);

  const slugKey = sel.slugs.join(",");
  useEffect(() => {
    if (!open || !f.date) return undefined;
    let alive = true;
    api.get("/availability", { params: { date: f.date, services: slugKey || undefined, exclude: booking?.id } })
      .then(({ data }) => { if (alive) setUnavailable(Array.isArray(data?.unavailable) ? data.unavailable : []); })
      .catch(() => { if (alive) setUnavailable([]); });
    return () => { alive = false; };
  }, [open, f.date, slugKey, booking]);

  const conflict = f.time && unavailable.includes(f.time);

  const submit = async (e) => {
    e.preventDefault();
    if (!sel.slugs.length || !f.time) return toast.error("Escolha ao menos um serviço e o horário.");
    setBusy(true);
    const body = { ...f, service_slugs: sel.slugs, product_ids: sel.pids };
    try {
      const { data } = editing ? await api.put(`/admin/bookings/${booking.id}`, body) : await api.post("/admin/bookings", body);
      if (data?.conflict) toast.warning("Salvo como encaixe: este horário se sobrepõe a outro atendimento ou bloqueio.");
      else toast.success(editing ? "Agendamento atualizado." : "Agendamento criado e confirmado.");
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="admin-booking-dialog" className="max-h-[92vh] overflow-y-auto border-[#D4AF37]/25 bg-[#141418] sm:max-w-2xl" data-lenis-prevent>
        <DialogHeader>
          <DialogTitle className="font-display text-3xl font-normal text-zinc-50">{editing ? "Editar agendamento" : "Novo agendamento"}</DialogTitle>
          <DialogDescription className="text-zinc-400">Busque a cliente, escolha um ou mais serviços e o horário.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <ClientPicker onPick={(c) => setF((x) => ({ ...x, name: c.name, phone: formatPhone(c.phone) }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <input data-testid="admin-booking-name" required minLength={2} placeholder="Nome" className={field} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <input data-testid="admin-booking-phone" required placeholder="Telefone" inputMode="tel" className={field} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </div>
          <ItemPicker services={services} products={products} sel={sel} prefix="admin-picker" />
          <div data-testid="admin-booking-totals" className="flex flex-wrap items-baseline justify-between gap-3 border-y border-[#D4AF37]/15 py-3 text-sm">
            <span className="text-zinc-300">{sel.svcs.length + sel.prods.length} item(ns) · <span className="text-[#E5C158]">{formatDuration(sel.duration) || "—"}</span></span>
            <span className="flex items-baseline gap-2">
              {sel.total != null && sel.original > sel.total && <><PromoBadge /><s className="font-mono-x text-xs text-zinc-500">{formatPrice(sel.original)}</s></>}
              <span className="font-mono-x text-lg text-[#E5C158]">{sel.slugs.length || sel.pids.length ? formatPrice(sel.total) : "—"}</span>
            </span>
          </div>
          <input data-testid="admin-booking-date" type="date" required className={field} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          <div className="flex flex-col gap-2">
            <p className="text-xs text-zinc-400">Todos os horários estão liberados para encaixe. Em âmbar: já há atendimento ou bloqueio no intervalo.</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {SLOTS.map((t) => {
                const b = unavailable.includes(t);
                return (
                  <button type="button" key={t} data-testid={`admin-booking-slot-${t.replace(":", "")}`} onClick={() => setF({ ...f, time: t })}
                    className={`font-mono-x rounded-full border py-1.5 text-xs ${f.time === t ? "border-[#D4AF37] bg-[#D4AF37] text-[#0D0D0F]" : b ? "border-amber-400/40 text-amber-300" : "border-[#D4AF37]/25 text-zinc-200 hover:border-[#D4AF37]"}`}>{t}</button>
                );
              })}
            </div>
            <label className="mt-1 flex items-center gap-3 text-xs text-zinc-400">Ou outro horário:
              <input data-testid="admin-booking-custom-time" type="time" className={`${field} w-32`} value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} />
            </label>
            {f.time && sel.duration > 0 && <p className="text-xs text-zinc-300">Ocupa {f.time} às {addMinutes(f.time, sel.duration)}</p>}
            {conflict && <p data-testid="admin-booking-conflict" className="flex items-center gap-2 text-xs text-amber-300"><AlertTriangle size={14} /> Conflita com outro atendimento ou bloqueio — será salvo como encaixe.</p>}
          </div>
          <input data-testid="admin-booking-notes" placeholder="Observações (opcional)" maxLength={300} className={field} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          <button data-testid="admin-booking-submit" disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D4AF37] py-3 text-sm font-semibold text-[#0D0D0F] hover:bg-[#E5C158] disabled:opacity-60">
            {busy && <Loader2 size={16} className="animate-spin" />} {editing ? "Salvar alterações" : "Agendar e confirmar"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
