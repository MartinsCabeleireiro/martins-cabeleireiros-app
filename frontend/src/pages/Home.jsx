import { useState } from "react";
import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Marquee } from "@/components/Marquee";
import { Services } from "@/components/Services";
import { Prices } from "@/components/Prices";
import { Booking } from "@/components/Booking";
import { Location } from "@/components/Location";
import { Footer } from "@/components/Footer";
import { WhatsAppFab } from "@/components/WhatsAppFab";
import { useServices, useProducts } from "@/lib/api";
import { useLenis, scrollToId } from "@/lib/smooth";

export default function Home() {
  useLenis();
  const { services } = useServices();
  const { products } = useProducts();
  const [preselect, setPreselect] = useState(null);
  const onBook = (slug) => {
    setPreselect({ slug, at: Date.now() });
    scrollToId("agendar");
  };

  return (
    <main className="overflow-x-clip bg-[#0D0D0F]">
      <Nav />
      <Hero />
      <Marquee />
      <Services services={services} onBook={onBook} />
      <Prices services={services} products={products} />
      <Booking services={services} products={products} preselect={preselect} />
      <Location />
      <Footer />
      <WhatsAppFab />
    </main>
  );
}
