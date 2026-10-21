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

export const GROUPS = [
  { key: "corte", name: "Corte Masculino e Feminino", description: "Cortes clássicos e modernos, para ele e para ela, com acabamento preciso.", image: "/img/corte.jpg" },
  { key: "coloracao", name: "Coloração e Luzes", description: "Cor uniforme, luzes e mechas para renovar o visual com brilho.", image: "/img/coloracao.jpg" },
  { key: "escova", name: "Escova e Hidratação", description: "Escova modelada e hidratação para fios macios e alinhados.", image: "/img/escova.jpg" },
  { key: "sobrancelha", name: "Designer de Sobrancelha", description: "Desenho de sobrancelha que valoriza o olhar.", image: "/img/sobrancelha.jpg" },
  { key: "tratamentos", name: "Outros procedimentos e tratamentos capilares", description: "Tratamentos capilares sob avaliação no salão.", image: "/img/tratamentos.jpg" },
];

const fb = (slug, name, group, duration_min, description) => ({ slug, name, group, duration_min, description, price: null });
export const FALLBACK_SERVICES = [
  fb("corte-masculino", "Corte Masculino", "corte", 30, "Corte clássico ou moderno com acabamento preciso."),
  fb("corte-feminino", "Corte Feminino", "corte", 45, "Corte personalizado para o seu estilo."),
  fb("coloracao", "Coloração", "coloracao", 90, "Cor uniforme e brilho para os fios."),
  fb("luzes", "Luzes", "coloracao", 150, "Luzes e mechas para iluminar o visual."),
  fb("escova", "Escova", "escova", 40, "Escova modelada, lisa ou com movimento."),
  fb("hidratacao", "Hidratação", "escova", 45, "Hidratação para fios macios e alinhados."),
  fb("sobrancelha", "Designer de Sobrancelha", "sobrancelha", 20, "Desenho que valoriza o olhar e a harmonia do rosto."),
  fb("selagem", "Selagem", "tratamentos", 240, "Tratamento capilar que reduz o volume e o frizz."),
];

export const formatDuration = (min) => {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h}h ${m} min` : `${h}h`;
};

export const addMinutes = (t, min) => {
  const [h, m] = t.split(":").map(Number);
  const total = h * 60 + m + (min || 0);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

export const formatPrice = (p) =>
  p == null ? "Sob consulta" : Number(p).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const SLOTS = Array.from({ length: 24 }, (_, i) => {
  const h = 8 + Math.floor(i / 2);
  return `${String(h).padStart(2, "0")}:${i % 2 ? "30" : "00"}`;
});
