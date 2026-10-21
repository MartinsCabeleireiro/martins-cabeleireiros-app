import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Trash2, Loader2 } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { api, errorText } from "@/lib/api";
import { useLogo } from "@/lib/logo";

export const SettingsPanel = () => {
  const { url, refresh } = useLogo();
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error("A imagem deve ter até 2 MB.");
    const form = new FormData();
    form.append("file", file);
    setBusy(true);
    try { await api.post("/settings/logo", form); await refresh(); toast.success("Logo atualizada no site."); }
    catch (err) { toast.error(errorText(err)); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    try { await api.delete("/settings/logo"); await refresh(); toast.success("Logo removida. Voltamos ao símbolo padrão."); }
    catch (err) { toast.error(errorText(err)); }
  };

  return (
    <div data-testid="settings-panel" className="grid gap-8 md:grid-cols-[260px_1fr]">
      <div className="grid aspect-square place-items-center border border-[#D4AF37]/25 bg-[#0D0D0F] p-6">
        {url ? <img data-testid="settings-logo-preview" src={url} alt="Logo atual" className="max-h-full max-w-full object-contain" /> : <LogoMark className="h-28 w-28 text-[#D4AF37]" />}
      </div>
      <div className="flex flex-col gap-4">
        <p className="eyebrow">Logo do salão</p>
        <p className="text-sm text-zinc-300">Envie a logo oficial (PNG com fundo transparente fica melhor, até 2 MB). Ela aparece no topo do site, no destaque principal, no painel e no ícone da aba do navegador.</p>
        <div className="flex flex-wrap gap-3">
          <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" data-testid="logo-file-input" onChange={upload} />
          <button data-testid="logo-upload-button" disabled={busy} onClick={() => ref.current?.click()} className="inline-flex items-center gap-2 rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-semibold text-[#0D0D0F] hover:bg-[#E5C158] disabled:opacity-60">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} {url ? "Trocar logo" : "Enviar logo"}
          </button>
          {url && <button data-testid="logo-remove-button" onClick={remove} className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 px-6 py-3 text-sm text-zinc-200 hover:border-red-400 hover:text-red-300"><Trash2 size={16} /> Remover</button>}
        </div>
      </div>
    </div>
  );
};
