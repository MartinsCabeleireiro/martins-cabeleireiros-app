import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Smartphone, Trash2, CalendarPlus, UserPlus, Search, History } from "lucide-react";
import { BookingDialog } from "@/components/admin/BookingDialog";
import { ContactHistory } from "@/components/admin/ContactHistory";
import { api, errorText } from "@/lib/api";
import { formatPhone } from "@/lib/site";
import { parseContactsFile, pickerSupported, pickFromPhone } from "@/lib/contacts";

const btn = "inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/40 px-5 py-2.5 text-sm text-zinc-100 transition-colors hover:border-[#D4AF37] hover:bg-[#D4AF37]/10";
const field = "border-b border-[#D4AF37]/30 bg-transparent py-2 text-zinc-50 placeholder:text-zinc-500 focus:border-[#D4AF37] focus:outline-none";

const lastVisit = (c) => {
  if (!c.last_visit) return "Sem visitas ainda";
  const [y, m, d] = c.last_visit.split("-").map(Number);
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(y, m - 1, d)) / 86400000);
  const ago = days === 0 ? "hoje" : days === 1 ? "ontem" : `há ${days} dias`;
  return `Última visita ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y} (${ago}) · ${c.visits} atendimento(s)`;
};

export const ContactsPanel = () => {
  const [q, setQ] = useState("");
  const [data, setData] = useState({ total: 0, items: [] });
  const [manual, setManual] = useState({ name: "", phone: "" });
  const [booking, setBooking] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [lists, setLists] = useState([]);
  const [dest, setDest] = useState("Geral");
  const [newList, setNewList] = useState("");
  const [filterList, setFilterList] = useState("");
  const fileRef = useRef(null);
  const target = dest === "__new" ? newList.trim() : dest;

  const loadLists = useCallback(async () => {
    try { const { data: l } = await api.get("/contacts/lists"); setLists(Array.isArray(l) ? l : []); } catch { setLists([]); }
  }, []);
  useEffect(() => { loadLists(); }, [loadLists]);

  const load = useCallback(async (query = "") => {
    try {
      const { data: d } = await api.get("/contacts", { params: { q: query, limit: 100, list: filterList || undefined } });
      setData({ total: d?.total ?? 0, items: Array.isArray(d?.items) ? d.items : [] });
    } catch (e) { toast.error(errorText(e)); }
  }, [filterList]);
  useEffect(() => { const t = setTimeout(() => load(q), 250); return () => clearTimeout(t); }, [q, load]);

  const send = async (contacts) => {
    if (!contacts.length) return toast.error("Nenhum contato com telefone encontrado.");
    if (!target) return toast.error("Escolha ou digite a lista de destino.");
    let added = 0; let skipped = 0;
    for (let i = 0; i < contacts.length; i += 1000) {
      const { data: r } = await api.post("/contacts/import", { contacts: contacts.slice(i, i + 1000), list: target });
      added += r?.added ?? 0; skipped += r?.skipped ?? 0;
    }
    toast.success(`${added} contato(s) adicionados em “${target}” · ${skipped} já existiam ou inválidos.`);
    load(q); loadLists();
  };
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try { await send(await parseContactsFile(file)); } catch (err) { toast.error(errorText(err)); }
  };
  const onPicker = async () => {
    if (!pickerSupported()) {
      toast.info("Este navegador não permite ler a agenda direto. Exporte os contatos do celular em .vcf e escolha o arquivo.");
      fileRef.current?.click();
      return;
    }
    try { await send(await pickFromPhone()); } catch (err) { toast.error("Não foi possível acessar os contatos do celular."); }
  };
  const addManual = async (e) => {
    e.preventDefault();
    try { await api.post("/contacts", { ...manual, list: target || "Geral" }); toast.success("Contato adicionado."); setManual({ name: "", phone: "" }); load(q); loadLists(); }
    catch (err) { toast.error(errorText(err)); }
  };
  const remove = async (id) => {
    if (!window.confirm("Excluir este contato?")) return;
    try { await api.delete(`/contacts/${id}`); load(q); } catch (err) { toast.error(errorText(err)); }
  };

  return (
    <div data-testid="contacts-panel" className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 border border-[#D4AF37]/20 bg-[#141418] p-6">
        <p className="eyebrow">Sincronizar contatos · base compartilhada</p>
        <p className="text-sm text-zinc-300">Escolha em qual lista os contatos ficam guardados. Números repetidos são ignorados, então você e sua esposa podem sincronizar sem duplicar.</p>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-xs text-zinc-400">Conta / lista de destino
            <select data-testid="contacts-dest-list" className={`${field} min-w-[220px] [color-scheme:dark]`} value={dest} onChange={(e) => setDest(e.target.value)}>
              {["Geral", ...lists.map((l) => l.name).filter((n) => n !== "Geral")].map((n) => <option key={n} value={n} className="bg-[#141418]">{n}</option>)}
              <option value="__new" className="bg-[#141418]">+ Nova lista…</option>
            </select>
          </label>
          {dest === "__new" && <input data-testid="contacts-new-list" placeholder="Nome da nova lista (ex.: Conta Google do Martins)" maxLength={40} className={`${field} min-w-[260px] flex-1`} value={newList} onChange={(e) => setNewList(e.target.value)} />}
        </div>
        <div className="flex flex-wrap gap-3">
          <input ref={fileRef} type="file" accept=".vcf,.csv,text/vcard,text/x-vcard,text/csv" className="hidden" data-testid="contacts-file-input" onChange={onFile} />
          <button type="button" data-testid="contacts-import-phone" onClick={onPicker} className={btn}><Smartphone size={16} /> Sincronizar Contatos do Dispositivo</button>
          <button type="button" data-testid="contacts-import-file" onClick={() => fileRef.current?.click()} className={btn}><Upload size={16} /> Importar arquivo (.vcf / .csv do Google)</button>
        </div>
        <form onSubmit={addManual} className="mt-2 flex flex-wrap items-end gap-4">
          <input data-testid="contact-manual-name" placeholder="Nome" required className={`${field} flex-1 min-w-[160px]`} value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} />
          <input data-testid="contact-manual-phone" placeholder="Telefone" required inputMode="tel" className={`${field} w-44`} value={manual.phone} onChange={(e) => setManual({ ...manual, phone: e.target.value })} />
          <button data-testid="contact-manual-add" className={btn}><UserPlus size={16} /> Adicionar</button>
        </form>
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <div className="flex min-w-[260px] flex-1 items-center gap-2 border border-[#D4AF37]/30 px-3">
            <Search size={16} className="text-[#D4AF37]" />
            <input data-testid="contacts-search" placeholder="Buscar por nome ou telefone" value={q} onChange={(e) => setQ(e.target.value)} className="w-full bg-transparent py-3 text-zinc-50 placeholder:text-zinc-500 focus:outline-none" />
          </div>
          <select data-testid="contacts-filter-list" className={`${field} [color-scheme:dark]`} value={filterList} onChange={(e) => setFilterList(e.target.value)}>
            <option value="" className="bg-[#141418]">Todas as listas</option>
            {lists.map((l) => <option key={l.name} value={l.name} className="bg-[#141418]">{l.name} ({l.count})</option>)}
          </select>
          <span data-testid="contacts-total" className="font-mono-x text-xs text-zinc-400">{data.total} contato(s) na base</span>
        </div>
        {data.items.length === 0 && <p data-testid="contacts-empty" className="border border-dashed border-[#D4AF37]/20 p-8 text-center text-zinc-400">Nenhum contato encontrado.</p>}
        <ul className="flex flex-col divide-y divide-[#D4AF37]/10 border border-[#D4AF37]/15">
          {data.items.map((c) => (
            <li key={c.id} data-testid={`contact-row-${c.id}`} className="bg-[#141418] px-4">
              <div className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-zinc-50">{c.name}</p>
                  <p className="font-mono-x text-xs text-zinc-400">{formatPhone(c.phone)}{c.added_by ? ` · por ${c.added_by}` : ""}</p>
                  <p data-testid={`contact-last-visit-${c.id}`} className={`mt-0.5 text-xs ${c.last_visit ? "text-[#E5C158]" : "text-zinc-500"}`}>{lastVisit(c)}</p>
                </div>
                <button data-testid={`contact-history-toggle-${c.id}`} onClick={() => setOpenId(openId === c.id ? null : c.id)} aria-expanded={openId === c.id}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs transition-colors ${openId === c.id ? "border-[#D4AF37] text-[#D4AF37]" : "border-[#D4AF37]/30 text-zinc-200 hover:border-[#D4AF37]"}`}>
                  <History size={14} /> <span className="hidden sm:inline">Histórico</span>
                </button>
                <button data-testid={`contact-book-${c.id}`} onClick={() => setBooking(c)} className="inline-flex items-center gap-1.5 rounded-full bg-[#D4AF37] px-3.5 py-1.5 text-xs font-semibold text-[#0D0D0F] hover:bg-[#E5C158]"><CalendarPlus size={14} /> <span className="hidden sm:inline">Agendar</span></button>
                <button data-testid={`contact-delete-${c.id}`} onClick={() => remove(c.id)} aria-label="Excluir contato" className="grid h-8 w-8 place-items-center rounded-full border border-[#D4AF37]/20 text-zinc-300 hover:border-red-400 hover:text-red-300"><Trash2 size={14} /></button>
              </div>
              {openId === c.id && <div className="border-t border-[#D4AF37]/10"><ContactHistory contactId={c.id} /></div>}
            </li>
          ))}
        </ul>
      </div>
      <BookingDialog open={!!booking} onOpenChange={(o) => !o && setBooking(null)} contact={booking} onSaved={() => { load(q); setOpenId(null); }} />
    </div>
  );
};
