export const SITE = {
  name: "Martins Cabeleireiro",
  wa: "5569999640881",
  waDisplay: "(69) 99964-0881",
  street: "Rua Apolinário Cortes, 572",
  district: "Nova Ouro Preto",
  city: "Ouro Preto do Oeste - RO",
  hours: "Segunda a Sábado · 08:00 às 20:00",
};

export const FULL_ADDRESS = `${SITE.street} - ${SITE.district}, ${SITE.city}`;
export const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(FULL_ADDRESS)}`;
export const MAPS_EMBED = `https://www.google.com/maps?q=${encodeURIComponent(FULL_ADDRESS)}&output=embed`;

export const waLink = (text) =>
  `https://wa.me/${SITE.wa}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export const SERVICE_IMAGES = {
  corte: "/img/corte.jpg",
  coloracao: "/img/coloracao.jpg",
  escova: "/img/escova.jpg",
  sobrancelha: "/img/sobrancelha.jpg",
  tratamentos: "/img/tratamentos.jpg",
};

export const FALLBACK_SERVICES = [
  { slug: "corte", name: "Corte Masculino e Feminino", description: "Cortes clássicos e modernos, para ele e para ela, com acabamento preciso.", price: null },
  { slug: "coloracao", name: "Coloração e Luzes", description: "Cor uniforme, luzes e mechas para renovar o visual com brilho.", price: null },
  { slug: "escova", name: "Escova e Hidratação", description: "Escova modelada e hidratação para fios macios e alinhados.", price: null },
  { slug: "sobrancelha", name: "Designer de Sobrancelha", description: "Desenho de sobrancelha que valoriza o olhar e a harmonia do rosto.", price: null },
  { slug: "tratamentos", name: "Outros procedimentos e tratamentos capilares", description: "Tratamentos e procedimentos capilares sob avaliação no salão.", price: null },
];

export const formatPrice = (p) =>
  p == null ? "Sob consulta" : Number(p).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const SLOTS = Array.from({ length: 24 }, (_, i) => {
  const h = 8 + Math.floor(i / 2);
  return `${String(h).padStart(2, "0")}:${i % 2 ? "30" : "00"}`;
});
