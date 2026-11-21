import { formatPrice } from "@/lib/site";

export const PromoBadge = ({ className = "" }) => (
  <span data-testid="promo-badge" className={`rounded-full bg-[#D4AF37] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0D0D0F] ${className}`}>Promoção</span>
);

export const PriceTag = ({ item, badge = true, className = "" }) => {
  if (!item) return null;
  const promo = item.promo_active && item.final_price != null && item.final_price !== item.price;
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-2 ${className}`}>
      {promo && badge && <PromoBadge />}
      {promo && <span data-testid="price-old" className="font-mono-x text-xs text-zinc-500 line-through">{formatPrice(item.price)}</span>}
      <span className="font-mono-x text-[#E5C158]">{formatPrice(promo ? item.final_price : item.price)}</span>
    </span>
  );
};
