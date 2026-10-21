import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { api, errorText } from "@/lib/api";

const field = "w-full border-0 border-b border-[#D4AF37]/30 bg-transparent py-3 text-zinc-50 placeholder:text-zinc-500 focus:border-[#D4AF37] focus:outline-none";

export const AdminLogin = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("mc_token", data.token);
      onLogin(data.user);
    } catch (e2) {
      setErr(errorText(e2));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[#0D0D0F] px-5">
      <motion.form data-testid="admin-login-modal" onSubmit={submit} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm border border-[#D4AF37]/25 bg-[#141418] p-8 sm:p-10">
        <LogoMark className="mb-6 h-14 w-14 text-[#D4AF37]" />
        <p className="eyebrow mb-2">Área restrita</p>
        <h1 className="font-display mb-8 text-4xl text-zinc-50">Painel do salão</h1>
        <div className="flex flex-col gap-5">
          <input data-testid="admin-email-input" type="email" required placeholder="E-mail" className={field} value={email} onChange={(e) => setEmail(e.target.value)} />
          <input data-testid="admin-password-input" type="password" required placeholder="Senha" className={field} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {err && <p data-testid="admin-login-error" className="mt-4 text-sm text-red-400">{err}</p>}
        <button data-testid="admin-submit-button" disabled={busy} className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#D4AF37] py-3.5 text-sm font-semibold text-[#0D0D0F] hover:bg-[#E5C158] disabled:opacity-60">
          {busy && <Loader2 size={16} className="animate-spin" />} Entrar
        </button>
        <Link to="/" className="mt-6 block text-center text-xs text-zinc-400 hover:text-[#D4AF37]">← Voltar ao site</Link>
      </motion.form>
    </div>
  );
};
