import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";
import { PriceTag } from "@/components/PriceTag";
import { api, errorText, useServices, useProducts } from "@/lib/api";
import { formatDuration } from "@/lib/site";

const inp = "border-b border-[#D4AF37]/30 bg-transparent py-1.5 text-zinc-50 placeholder:text-zinc-500 focus:border-[#D4AF37] focus:outline-none [color-scheme:dark]";
const num = (v) => (v === "" || v == null ? null : Number(String(v).replace(",", ".")));
const toForm = (x) => ({ ...x, price: x.price ?? "", promo_type: x.promo_type || "", promo_value: x.promo_value ?? "", promo_start: x.promo_start || "", promo_end: x.promo_end || "" });
const toBody = (f) => ({
  price: num(f.price), promo_type: f.promo_type || null, promo_value: f.promo_type ? num(f.promo_value) : null,
  promo_start: f.promo_type && f.promo_start ? f.promo_start : null, promo_end: f.promo_type && f.promo_end ? f.promo_end : null,
});

const PromoFields = ({ f, set, id }) => (
  <div className="flex flex-wrap items-end gap-3 text-xs text-zinc-400">
    <label className="flex flex-col gap-1">Promoção
      <select data-testid={`promo-type-${id}`} className={inp} value={f.promo_type} onChange={(e) => set({ ...f, promo_type: e.target.value })}>
        <option value="" className="bg-[#141418]">Sem promoção</option>
        <option value="price" className="bg-[#141418]">Preço promocional (R$)</option>
        <option value="percent" className="bg-[#141418]">Desconto (%)</option>
      </select>
    </label>
    {f.promo_type && <>
      <label className="flex flex-col gap-1">{f.promo_type === "price" ? "Novo preço" : "% off"}
        <input data-testid={`promo-value-${id}`} inputMode="decimal" className={`${inp} w-24`} value={f.promo_value} onChange={(e) => set({ ...f, promo_value: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1">Início (opcional)<input type="date" className={inp} value={f.promo_start} onChange={(e) => set({ ...f, promo_start: e.target.value })} /></label>
      <label className="flex flex-col gap-1">Fim (vazio = até desativar)<input type="date" className={inp} value={f.promo_end} onChange={(e) => set({ ...f, promo_end: e.target.value })} /></label>
    </>}
  </div>
);

const ServiceRow = ({ s, onSaved }) => {
  const [f, setF] = useState(toForm(s));
  useEffect(() => { setF(toForm(s)); }, [s]);
  const save = async () => {
    try { await api.put(`/services/${s.slug}`, toBody(f)); toast.success(`“${s.name}” salvo.`); onSaved(); } catch (e) { toast.error(errorText(e)); }
  };
  return (
    <li data-testid={`catalog-service-${s.slug}`} className="flex flex-col gap-3 border-b border-[#D4AF37]/15 py-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-display text-2xl text-zinc-50">{s.name}</p>
        <span className="font-mono-x text-xs text-zinc-400">{formatDuration(s.duration_min)}</span>
        <PriceTag item={s} className="ml-auto text-sm" />
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-xs text-zinc-400">Preço (R$)
          <input data-testid={`admin-price-input-${s.slug}`} inputMode="decimal" placeholder="Sob consulta" className={`${inp} w-28`} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
        </label>
        <PromoFields f={f} set={setF} id={s.slug} />
        <button data-testid={`admin-price-save-${s.slug}`} onClick={save} className="ml-auto inline-flex items-center gap-2 rounded-full bg-[#D4AF37] px-5 py-2 text-sm font-semibold text-[#0D0D0F] hover:bg-[#E5C158]"><Save size={14} /> Salvar</button>
      </div>
    </li>
  );
};

const EMPTY = { name: "", description: "", price: "", active: true, promo_type: "", promo_value: "", promo_start: "", promo_end: "" };

const ProductRow = ({ p, onSaved }) => {
  const [f, setF] = useState(p ? toForm(p) : EMPTY);
  useEffect(() => { setF(p ? toForm(p) : EMPTY); }, [p]);
  const id = p?.id || "new";
  const save = async () => {
    const body = { name: f.name, description: f.description, active: f.active, ...toBody(f) };
    try {
      if (p) await api.put(`/admin/products/${p.id}`, body); else await api.post("/admin/products", body);
      toast.success("Produto salvo."); if (!p) setF(EMPTY); onSaved();
    } catch (e) { toast.error(errorText(e)); }
  };
  const remove = async () => {
    if (!window.confirm(`Excluir “${p.name}”?`)) return;
    try { await api.delete(`/admin/products/${p.id}`); onSaved(); } catch (e) { toast.error(errorText(e)); }
  };
  return (
    <li data-testid={`catalog-product-${id}`} className={`flex flex-col gap-3 border p-4 ${p ? "border-[#D4AF37]/15" : "border-dashed border-[#D4AF37]/40"}`}>
      <div className="flex flex-wrap items-end gap-4">
        <input data-testid={`product-name-${id}`} placeholder="Nome do produto" className={`${inp} min-w-[180px] flex-1 text-lg`} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input placeholder="Descrição (opcional)" className={`${inp} min-w-[160px] flex-1`} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        <label className="flex flex-col gap-1 text-xs text-zinc-400">Preço (R$)
          <input data-testid={`product-price-${id}`} inputMode="decimal" className={`${inp} w-24`} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-300"><input type="checkbox" className="accent-[#D4AF37]" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Ativo</label>
        {p && <PriceTag item={p} className="text-sm" />}
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <PromoFields f={f} set={setF} id={`product-${id}`} />
        <div className="ml-auto flex gap-2">
          {p && <button onClick={remove} aria-label="Excluir produto" className="grid h-9 w-9 place-items-center rounded-full border border-[#D4AF37]/20 text-zinc-300 hover:border-red-400 hover:text-red-300"><Trash2 size={14} /></button>}
          <button data-testid={`product-save-${id}`} onClick={save} className="inline-flex items-center gap-2 rounded-full bg-[#D4AF37] px-5 py-2 text-sm font-semibold text-[#0D0D0F] hover:bg-[#E5C158]">{p ? <Save size={14} /> : <Plus size={14} />} {p ? "Salvar" : "Adicionar produto"}</button>
        </div>
      </div>
    </li>
  );
};

export const CatalogPanel = () => {
  const { services, reload } = useServices();
  const { products, reload: reloadP } = useProducts(true);
  return (
    <div data-testid="catalog-panel" className="flex flex-col gap-12">
      <section>
        <p className="eyebrow mb-2">Serviços · preços e promoções</p>
        <p className="mb-4 text-sm text-zinc-400">Preço vazio = “Sob consulta”. Sem data de fim, a promoção fica ativa até você escolher “Sem promoção”.</p>
        <ul>{services.map((s) => <ServiceRow key={s.slug} s={s} onSaved={reload} />)}</ul>
      </section>
      <section>
        <p className="eyebrow mb-4">Produtos</p>
        <ul className="flex flex-col gap-3">
          <ProductRow onSaved={reloadP} />
          {products.map((p) => <ProductRow key={p.id} p={p} onSaved={reloadP} />)}
        </ul>
      </section>
    </div>
  );
};
