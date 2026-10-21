import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Smartphone, Trash2, CalendarPlus, UserPlus, Search } from "lucide-react";
import { AdminBookingDialog } from "@/components/admin/AdminBookingDialog";
import { api, errorText } from "@/lib/api";
import { formatPhone } from "@/lib/site";
import { parseContactsFile, pickerSupported, pickFromPhone } from "@/lib/contacts";

const btn = "inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/40 px-5 py-2.5 text-sm text-zinc-100 transition-colors hover:border-[#D4AF37] hover:bg-[#D4AF37]/10";
const field = "border-b border-[#D4AF37]/30 bg-transparent py-2 text-zinc-50 placeholder:text-zinc-500 focus:border-[#D4AF37] focus:outline-none";

export const ContactsPanel = () => {
  const [q, setQ] = useState("");
  const [data, setData] = useState({ total: 0, items: [] });
  const [manual, setManual] = useState({ name: "", phone: "" });
  const [booking, setBooking] = useState(null);
  const fileRef = useRef(null);

  const load = useCallback(async (query = "") => {
    try {
      const { data: d } = await api.get("/contacts", { params: { q: query, limit: 100 } });
      setData({ total: d?.total ?? 0, items: Array.isArray(d?.items) ? d.items : [] });
    } catch (e) { toast.error(errorText(e)); }
  }, []);
  useEffect(() => { const t = setTimeout(() => load(q), 250); return () => clearTimeout(t); }, [q, load]);

  const send = async (contacts) => {
    if (!contacts.length) return toast.error("Nenhum contato com telefone encontrado.");
    let added = 0; let skipped = 0;
    for (let i = 0; i < contacts.length; i += 1000) {
      const { data: r } = await api.post("/contacts/import", { contacts: contacts.slice(i, i + 1000) });
      added += r?.added ?? 0; skipped += r?.skipped ?? 0;
    }
    toast.success(`${added} contato(s) adicionados · ${skipped} já existiam ou inválidos.`);
    load(q);
  };
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try { await send(await parseContactsFile(file)); } catch (err) { toast.error(errorText(err)); }
  };
  const onPicker = async () => {
    try { await send(await pickFromPhone()); } catch (err) { toast.error("Não foi possível acessar os contatos do celular."); }
  };
  const addManual = async (e) => {
    e.preventDefault();
    try { await api.post("/contacts", manual); toast.success("Contato adicionado."); setManual({ name: "", phone: "" }); load(q); }
    catch (err) { toast.error(errorText(err)); }
  };
  const remove = async (id) => {
    if (!window.confirm("Excluir este contato?")) return;
    try { await api.delete(`/contacts/${id}`); load(q); } catch (err) { toast.error(errorText(err)); }
  };

  return (
    <div data-testid="contacts-panel" className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 border border-[#D4AF37]/20 bg-[#141418] p-6">
        <p className="eyebrow">Importar contatos · base compartilhada</p>
        <p className="text-sm text-zinc-300">Envie o arquivo exportado do celular (.vcf) ou do Google Contatos (.csv). Números repetidos são ignorados, então você e sua esposa podem importar sem duplicar.</p>
        <div className="flex flex-wrap gap-3">
          <input ref={fileRef} type="file" accept=".vcf,.csv,text/vcard,text/x-vcard,text/csv" className="hidden" data-testid="contacts-file-input" onChange={onFile} />
          <button type="button" data-testid="contacts-import-file" onClick={() => fileRef.current?.click()} className={btn}><Upload size={16} /> Importar arquivo (.vcf / .csv)</button>
          {pickerSupported() && <button type="button" data-testid="contacts-import-phone" onClick={onPicker} className={btn}><Smartphone size={16} /> Escolher da agenda do celular</button>}
        </div>
        <form onSubmit={addManual} className="mt-2 flex flex-wrap items-end gap-4">
          <input data-testid="contact-manual-name" placeholder="Nome" required className={`${field} flex-1 min-w-[160px]`} value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} />
          <input data-testid="contact-manual-phone" placeholder="Telefone" required inputMode="tel" className={`${field} w-44`} value={manual.phone} onChange={(e) => setManual({ ...manual, phone: e.target.value })} />
          <button data-testid="contact-manual-add" className={btn}><UserPlus size={16} /> Adicionar</button>
        </form>
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <div className="flex flex-1 items-center gap-2 border border-[#D4AF37]/30 px-3">
            <Search size={16} className="text-[#D4AF37]" />
            <input data-testid="contacts-search" placeholder="Buscar por nome ou telefone" value={q} onChange={(e) => setQ(e.target.value)} className="w-full bg-transparent py-3 text-zinc-50 placeholder:text-zinc-500 focus:outline-none" />
          </div>
          <span data-testid="contacts-total" className="font-mono-x text-xs text-zinc-400">{data.total} contato(s) na base</span>
        </div>
        {data.items.length === 0 && <p data-testid="contacts-empty" className="border border-dashed border-[#D4AF37]/20 p-8 text-center text-zinc-400">Nenhum contato encontrado.</p>}
        <ul className="flex flex-col divide-y divide-[#D4AF37]/10 border border-[#D4AF37]/15">
          {data.items.map((c) => (
            <li key={c.id} data-testid={`contact-row-${c.id}`} className="flex items-center gap-3 bg-[#141418] px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-zinc-50">{c.name}</p>
                <p className="font-mono-x text-xs text-zinc-400">{formatPhone(c.phone)}{c.added_by ? ` · por ${c.added_by}` : ""}</p>
              </div>
              <button data-testid={`contact-book-${c.id}`} onClick={() => setBooking(c)} className="inline-flex items-center gap-1.5 rounded-full bg-[#D4AF37] px-3.5 py-1.5 text-xs font-semibold text-[#0D0D0F] hover:bg-[#E5C158]"><CalendarPlus size={14} /> Agendar</button>
              <button data-testid={`contact-delete-${c.id}`} onClick={() => remove(c.id)} aria-label="Excluir contato" className="grid h-8 w-8 place-items-center rounded-full border border-[#D4AF37]/20 text-zinc-300 hover:border-red-400 hover:text-red-300"><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      </div>
      <AdminBookingDialog open={!!booking} onOpenChange={(o) => !o && setBooking(null)} contact={booking} />
    </div>
  );
};
