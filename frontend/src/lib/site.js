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
  { key: "corte", name: "Corte e Barba", description: "Cortes clássicos e modernos, para ele e para ela, e barba com acabamento preciso.", image: "/img/corte.jpg" },
  { key: "coloracao", name: "Coloração e Luzes", description: "Cor uniforme, luzes e mechas para renovar o visual com brilho.", image: "/img/coloracao.jpg" },
  { key: "tratamentos", name: "Selagem e Botox capilar", description: "Tratamentos capilares tradicionais e orgânicos para fios alinhados e com brilho.", image: "/img/tratamentos.jpg" },
  { key: "escova", name: "Escova e Hidratação", description: "Escova modelada e hidratação para fios macios e alinhados.", image: "/img/escova.jpg" },
  { key: "sobrancelha", name: "Designer de Sobrancelha", description: "Desenho de sobrancelha que valoriza o olhar.", image: "/img/sobrancelha.jpg" },
];

const fb = (slug, name, group, duration_min, price) => ({ slug, name, group, duration_min, price, description: "" });
export const FALLBACK_SERVICES = [
  fb("corte-masculino", "Corte Masculino", "corte", 30, 25),
  fb("corte-feminino", "Corte Feminino", "corte", 45, 30),
  fb("barba", "Barba", "corte", 30, 20),
  fb("sobrancelha", "Designer de Sobrancelha", "sobrancelha", 20, 20),
  fb("selagem-masculino", "Selagem Masculino", "tratamentos", 120, 100),
  fb("selagem-tradicional", "Selagem Tradicional", "tratamentos", 240, 150),
  fb("selagem-organica", "Selagem Orgânica", "tratamentos", 300, 180),
  fb("botox-tradicional", "Botox Tradicional", "tratamentos", 240, 150),
  fb("botox-organico", "Botox Orgânico", "tratamentos", 240, 150),
  fb("luzes-masculina", "Luzes Masculina", "coloracao", 120, 80),
  fb("luzes", "Luzes", "coloracao", 240, 250),
  fb("coloracao", "Coloração", "coloracao", 90, 80),
  fb("escova", "Escova", "escova", 40, 60),
  fb("hidratacao", "Hidratação", "escova", 60, 60),
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

export const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

export const phoneDigits = (p) => {
  let d = String(p || "").replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  return d;
};
export const formatPhone = (p) => {
  const d = phoneDigits(p);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return p;
};
export const clientWa = (phone, text) => `https://wa.me/55${phoneDigits(phone)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
export const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
