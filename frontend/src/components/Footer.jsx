import { Link } from "react-router-dom";
import { LogoMark } from "@/components/Logo";
import { SITE, FULL_ADDRESS } from "@/lib/site";

export const Footer = () => (
  <footer className="overflow-hidden border-t border-[#D4AF37]/15 bg-[#0D0D0F] pt-20">
    <div className="mx-auto max-w-7xl px-5 sm:px-8">
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4 text-[#D4AF37]">
          <LogoMark className="h-14 w-14" />
          <p className="max-w-xs text-sm leading-relaxed text-zinc-400">{FULL_ADDRESS}<br />{SITE.hours}</p>
        </div>
        <Link data-testid="footer-admin-link" to="/admin" className="font-mono-x text-xs uppercase tracking-[0.25em] text-zinc-400 hover:text-[#D4AF37]">Área do salão</Link>
      </div>
      <p className="font-caps mt-14 select-none whitespace-nowrap text-[17vw] font-semibold leading-[0.8] tracking-tight text-[#D4AF37]/[0.09] lg:text-[13rem]">MARTINS</p>
      <p className="py-6 text-xs text-zinc-500">© {new Date().getFullYear()} {SITE.name}. Todos os direitos reservados.</p>
    </div>
  </footer>
);
