import { useLogo } from "@/lib/logo";

export const LogoMark = ({ className = "" }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="32" cy="32" r="25.5" stroke="currentColor" strokeWidth="0.6" opacity="0.55" />
    <path d="M20 43V22l12 14 12-14v21" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square" />
    <path d="M17 48.5h30" stroke="currentColor" strokeWidth="0.8" opacity="0.7" />
    <circle cx="32" cy="14.5" r="1.5" fill="currentColor" />
  </svg>
);

export const Wordmark = ({ testid = "nav-logo" }) => {
  const { url } = useLogo();
  if (url) {
    return (
      <span data-testid={testid} className="flex items-center">
        <img src={url} alt="Martins Cabeleireiro" className="h-12 w-auto max-w-[180px] object-contain" />
      </span>
    );
  }
  return (
    <span data-testid={testid} className="flex items-center gap-3 text-[#D4AF37]">
      <LogoMark className="h-10 w-10" />
      <span className="flex flex-col leading-none">
        <span className="font-caps text-lg font-semibold tracking-[0.22em] text-zinc-50">MARTINS</span>
        <span className="font-mono-x mt-1 text-[10px] uppercase tracking-[0.34em] text-[#D4AF37]">Cabeleireiro</span>
      </span>
    </span>
  );
};
