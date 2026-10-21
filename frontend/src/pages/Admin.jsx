import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wordmark } from "@/components/Logo";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { BookingsPanel } from "@/components/admin/BookingsPanel";
import { PricesPanel } from "@/components/admin/PricesPanel";
import { DayAgenda } from "@/components/admin/DayAgenda";
import { BlocksPanel } from "@/components/admin/BlocksPanel";
import { api } from "@/lib/api";

export default function Admin() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("mc_token")) { setChecking(false); return undefined; }
    api.get("/auth/me")
      .then(({ data }) => setUser(data))
      .catch(() => localStorage.removeItem("mc_token"))
      .finally(() => setChecking(false));
    return undefined;
  }, []);

  const logout = () => { localStorage.removeItem("mc_token"); setUser(null); };

  if (checking) return <div className="min-h-screen bg-[#0D0D0F]" />;
  if (!user) return <AdminLogin onLogin={setUser} />;

  return (
    <div data-testid="admin-dashboard" className="min-h-screen bg-[#0D0D0F] text-zinc-100">
      <header className="border-b border-[#D4AF37]/15">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link to="/"><Wordmark testid="admin-logo" /></Link>
          <button data-testid="admin-logout-button" onClick={logout} className="inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-[#D4AF37]"><LogOut size={16} /> Sair</button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <p className="eyebrow mb-3">Painel do salão</p>
        <h1 className="font-display mb-10 text-4xl text-zinc-50 sm:text-5xl">Olá, Martins.</h1>
        <Tabs defaultValue="dia">
          <TabsList className="mb-8 h-auto flex-wrap bg-[#141418]">
            <TabsTrigger data-testid="admin-tab-day" value="dia">Agenda do dia</TabsTrigger>
            <TabsTrigger data-testid="admin-tab-bookings" value="agenda">Agendamentos</TabsTrigger>
            <TabsTrigger data-testid="admin-tab-blocks" value="bloqueios">Bloqueios</TabsTrigger>
            <TabsTrigger data-testid="admin-tab-prices" value="precos">Preços</TabsTrigger>
          </TabsList>
          <TabsContent value="dia"><DayAgenda /></TabsContent>
          <TabsContent value="agenda"><BookingsPanel /></TabsContent>
          <TabsContent value="bloqueios"><BlocksPanel /></TabsContent>
          <TabsContent value="precos"><PricesPanel /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
