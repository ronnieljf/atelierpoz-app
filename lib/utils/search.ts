import { type Product } from '@/types/product';

export interface ProductFilters {
  searchTerm?: string;
  category?: string | null;
}

/**
 * Busca y filtra productos
 * Busca en: nombre, descripción, categoría y tags
 * Filtra por: categoría
 */
export function searchProducts(
  products: Product[],
  filters: ProductFilters = {}
): Product[] {
  const { searchTerm = '', category = null } = filters;

  return products.filter((product) => {
    // Filtro por búsqueda de texto
    if (searchTerm.trim()) {
      const normalizedSearch = searchTerm.toLowerCase().trim();
      const searchWords = normalizedSearch.split(/\s+/);
      const searchableText = [
        product.name,
        product.description,
        product.category,
        ...(product.tags || []),
      ]
        .join(' ')
        .toLowerCase();

      const matchesSearch = searchWords.every((word) => searchableText.includes(word));
      if (!matchesSearch) return false;
    }

    // Filtro por categoría
    if (category && product.category !== category) {
      return false;
    }

    return true;
  });
}
