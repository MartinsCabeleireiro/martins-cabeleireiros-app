import { useMemo, useState } from "react";

export const finalPrice = (x) => (x?.final_price ?? x?.price ?? null);

export function useSelection(services, products) {
  const [slugs, setSlugs] = useState([]);
  const [pids, setPids] = useState([]);
  const toggle = (setter) => (id) => setter((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const summary = useMemo(() => {
    const svcs = slugs.map((s) => services.find((x) => x.slug === s)).filter(Boolean);
    const prods = pids.map((p) => products.find((x) => x.id === p)).filter(Boolean);
    const all = [...svcs, ...prods];
    const known = all.filter((x) => finalPrice(x) != null);
    return {
      svcs,
      prods,
      duration: svcs.reduce((s, x) => s + (x.duration_min || 0), 0),
      total: known.length ? known.reduce((s, x) => s + finalPrice(x), 0) : null,
      original: known.length ? known.reduce((s, x) => s + (x.price ?? finalPrice(x)), 0) : null,
      names: all.map((x) => x.name).join(" + "),
    };
  }, [slugs, pids, services, products]);

  return {
    slugs, pids, setSlugs, setPids,
    toggleService: toggle(setSlugs),
    toggleProduct: toggle(setPids),
    reset: () => { setSlugs([]); setPids([]); },
    ...summary,
  };
}
