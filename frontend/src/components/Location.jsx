import { MapPin, Clock, Phone, Navigation } from "lucide-react";
import { SectionHead, Reveal } from "@/components/Reveal";
import { SITE, MAPS_URL, MAPS_EMBED, waLink } from "@/lib/site";

const Info = ({ icon: Icon, label, children }) => (
  <div className="flex gap-5 border-b border-[#D4AF37]/15 py-6">
    <Icon size={20} className="mt-1 shrink-0 text-[#D4AF37]" />
    <div>
      <p className="font-mono-x mb-1 text-xs uppercase tracking-[0.2em] text-zinc-400">{label}</p>
      <div className="text-lg text-zinc-100">{children}</div>
    </div>
  </div>
);

export const Location = () => (
  <section id="local" className="border-t border-[#D4AF37]/10 bg-[#111114] py-24 lg:py-36">
    <div className="mx-auto max-w-7xl px-5 sm:px-8">
      <SectionHead index="04" eyebrow="Localização" title={<>Venha nos <em className="text-[#D4AF37]">visitar.</em></>} />
      <div className="grid gap-10 lg:grid-cols-12">
        <Reveal className="lg:col-span-5">
          <Info icon={MapPin} label="Endereço"><span data-testid="location-address">{SITE.street}<br />{SITE.district}, {SITE.city}</span></Info>
          <Info icon={Clock} label="Funcionamento"><span data-testid="location-hours">{SITE.hours}</span></Info>
          <Info icon={Phone} label="WhatsApp"><a data-testid="location-whatsapp" href={waLink("Olá! Vim pelo site do Martins Cabeleireiro.")} target="_blank" rel="noreferrer" className="hover:text-[#D4AF37]">{SITE.waDisplay}</a></Info>
          <a data-testid="location-directions" href={MAPS_URL} target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/40 px-7 py-3.5 text-sm text-zinc-100 transition-[background-color,border-color] duration-300 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10">
            <Navigation size={16} /> Como chegar
          </a>
        </Reveal>
        <Reveal delay={0.1} className="lg:col-span-7">
          <div className="relative h-[360px] overflow-hidden border border-[#D4AF37]/25 sm:h-[460px]">
            <iframe data-testid="location-map" title="Mapa Martins Cabeleireiro" src={MAPS_EMBED} loading="lazy" className="map-dark h-full w-full" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);
