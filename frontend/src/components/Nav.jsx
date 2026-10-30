import { useEffect, useState } from "react";
import { Menu, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Wordmark } from "@/components/Logo";
import { scrollToId } from "@/lib/smooth";

const LINKS = [
  ["servicos", "Serviços", "nav-link-services"],
  ["precos", "Preços", "nav-link-prices"],
  ["agendar", "Agendamento", "nav-link-booking"],
  ["local", "Localização", "nav-link-location"],
];

export const Nav = () => {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const go = (id) => { setOpen(false); scrollToId(id); };

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500 ${solid ? "border-b border-[#D4AF37]/15 bg-[#0D0D0F]/75 backdrop-blur-xl" : "border-b border-transparent"}`}>
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        <button onClick={() => scrollToId("inicio")} aria-label="Início"><Wordmark /></button>
        <div className="hidden items-center gap-9 lg:flex">
          {LINKS.map(([id, label, tid]) => (
            <button key={id} data-testid={tid} onClick={() => go(id)} className="group relative text-sm text-zinc-300 transition-colors hover:text-white">
              {label}
              <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-[#D4AF37] transition-transform duration-300 group-hover:scale-x-100" />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button data-testid="nav-cta-booking" onClick={() => go("agendar")} className="hidden rounded-full bg-[#D4AF37] px-6 py-2.5 text-sm font-semibold text-[#0D0D0F] transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-[#E5C158] sm:inline-flex">
            Agendar horário
          </button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button data-testid="nav-mobile-menu" aria-label="Menu" className="grid h-11 w-11 place-items-center rounded-full border border-[#D4AF37]/30 text-zinc-100 lg:hidden"><Menu size={18} /></button>
            </SheetTrigger>
            <SheetContent side="right" className="border-[#D4AF37]/20 bg-[#0D0D0F]">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="mt-12 flex flex-col gap-6">
                {[["inicio", "Início"], ...LINKS].map(([id, label]) => (
                  <button key={id} data-testid={`mobile-link-${id}`} onClick={() => go(id)} className="font-display text-left text-4xl text-zinc-100 hover:text-[#D4AF37]">{label}</button>
                ))}
              </div>
              <Link data-testid="mobile-link-admin" to="/admin" onClick={() => setOpen(false)}
                className="mt-12 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/40 px-5 py-3 text-sm text-zinc-100 transition-colors hover:border-[#D4AF37] hover:bg-[#D4AF37]/10">
                <Lock size={15} className="text-[#D4AF37]" /> Acesso Administrativo
              </Link>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
};
