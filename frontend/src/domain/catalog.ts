export function filterProducts<T extends { title: string }>(
  products: T[],
  query: string,
): T[] {
  const term = query.trim().toLowerCase();
  return products.filter((product) => product.title.toLowerCase().includes(term));
}

export function productSizes(product: { size?: string; sizes?: string[] }): string[] {
  if (product.sizes?.length) {
    return product.sizes;
  }
  return product.size ? [product.size] : [];
}
