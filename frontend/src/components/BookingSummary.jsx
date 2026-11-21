import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { Check, Loader2, MessageCircle } from "lucide-react";
import { formatPrice, formatDuration, addMinutes } from "@/lib/site";
import { PromoBadge } from "@/components/PriceTag";
import { finalPrice } from "@/lib/cart";

const Row = ({ k, v, testid }) => (
  <div className="flex items-baseline justify-between gap-4 border-b border-[#D4AF37]/10 py-4">
    <span className="font-mono-x text-xs uppercase tracking-[0.2em] text-zinc-400">{k}</span>
    <span data-testid={testid} className="text-right text-zinc-100">{v || "—"}</span>
  </div>
);

export const BookingSummary = ({ sel, date, time, sending, done, onReset }) => (
  <div className="lg:col-span-5">
    <div className="sticky top-28 border border-[#D4AF37]/25 bg-[#141418] p-7 shadow-[0_0_60px_rgba(212,175,55,0.06)] sm:p-9">
      <p className="eyebrow mb-3">Resumo</p>
      <h3 className="font-display mb-6 text-3xl text-zinc-50">Seu horário</h3>
      <div data-testid="summary-service" className="border-b border-[#D4AF37]/10 pb-3">
        {[...sel.svcs, ...sel.prods].length === 0 && <p className="py-1 text-zinc-400">Nenhum serviço escolhido</p>}
        {[...sel.svcs, ...sel.prods].map((x) => (
          <div key={x.slug || x.id} className="flex items-baseline justify-between gap-3 py-1 text-sm">
            <span className="text-zinc-100">{x.name}{x.duration_min ? <span className="text-zinc-400"> · {formatDuration(x.duration_min)}</span> : null}</span>
            <span className="font-mono-x shrink-0 text-zinc-300">{formatPrice(finalPrice(x))}</span>
          </div>
        ))}
      </div>
      <Row k="Data" v={date && format(date, "EEE, dd 'de' MMM", { locale: ptBR })} testid="summary-date" />
      <Row k="Duração" v={sel.duration > 0 && formatDuration(sel.duration)} testid="summary-duration" />
      <Row k="Horário" v={time && (sel.duration ? `${time} às ${addMinutes(time, sel.duration)}` : time)} testid="summary-time" />
      <div className="flex items-baseline justify-between gap-4 border-b border-[#D4AF37]/10 py-4">
        <span className="font-mono-x text-xs uppercase tracking-[0.2em] text-zinc-400">Total</span>
        <span data-testid="summary-price" className="flex items-baseline gap-2 text-right">
          {sel.total != null && sel.original > sel.total && <><PromoBadge /><span className="font-mono-x text-xs text-zinc-500 line-through">{formatPrice(sel.original)}</span></>}
          <span className="font-mono-x text-lg text-[#E5C158]">{sel.svcs.length || sel.prods.length ? formatPrice(sel.total) : "—"}</span>
        </span>
      </div>
      {done ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} data-testid="booking-success" className="mt-8 flex flex-col gap-4">
          <p className="flex items-center gap-2 text-sm text-emerald-300"><Check size={16} /> Pedido registrado. Envie a mensagem no WhatsApp para confirmar.</p>
          <a data-testid="booking-open-whatsapp" href={done.link} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] py-4 text-sm font-semibold text-[#0D0D0F] transition-transform hover:-translate-y-0.5">
            <MessageCircle size={18} /> Abrir WhatsApp
          </a>
          <button type="button" data-testid="booking-new" onClick={onReset} className="text-sm text-zinc-300 underline-offset-4 hover:underline">Fazer outro agendamento</button>
        </motion.div>
      ) : (
        <button data-testid="booking-submit-button" type="submit" disabled={sending} className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#D4AF37] py-4 text-sm font-semibold text-[#0D0D0F] transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-[#E5C158] disabled:opacity-60">
          {sending ? <Loader2 size={18} className="animate-spin" /> : <MessageCircle size={18} />}
          Agendar e confirmar no WhatsApp
        </button>
      )}
    </div>
  </div>
);
