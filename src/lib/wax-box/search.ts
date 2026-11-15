// Finding a wax by what somebody remembers of it: "swix blue", "klister",
// "rode multigrade". Every word typed must appear somewhere in the brand,
// the name or the type, in any order, ignoring case and accents.

import { CATEGORY_LABELS } from "@/lib/catalogue/labels";
import type { ProductCategory } from "@/lib/catalogue/vocab";

export type Searchable = {
  id: string;
  name: string;
  category: ProductCategory;
  brand: { name: string };
};

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function searchWaxes<T extends Searchable>(
  products: T[],
  query: string,
  exclude: Set<string>,
  limit = 20,
): T[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return products
    .filter((p) => !exclude.has(p.id))
    .filter((p) => {
      const haystack = fold(`${p.brand.name} ${p.name} ${CATEGORY_LABELS[p.category]} ${p.category}`);
      return words.every((w) => haystack.includes(w));
    })
    .sort((a, b) => `${a.brand.name} ${a.name}`.localeCompare(`${b.brand.name} ${b.name}`))
    .slice(0, limit);
}
