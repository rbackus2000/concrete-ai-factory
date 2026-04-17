/**
 * Price Scraper Engine
 *
 * Pure business logic for scraping Shopify product prices.
 * No database access — accepts a product URL, returns structured pricing data.
 *
 * Uses the Shopify .json endpoint: any Shopify product page at
 * https://store.com/products/some-product has a JSON endpoint at
 * https://store.com/products/some-product.json
 */

export type PriceTier = {
  variantId: number;
  variantTitle: string;
  price: number;
  compareAtPrice: number | null;
  available: boolean;
  sku: string;
};

export type ScrapeResult = {
  productTitle: string;
  productHandle: string;
  priceTiers: PriceTier[];
  scrapedAt: string;
};

/**
 * Scrapes pricing from a Shopify product page using the .json endpoint.
 * Works with any Shopify store (Kodiak Pro, etc.)
 */
export async function scrapeShopifyProductPrice(productUrl: string): Promise<ScrapeResult> {
  // Normalize URL: strip trailing slashes and query params
  const cleanUrl = productUrl.split("?")[0].replace(/\/+$/, "");

  // Append .json to get Shopify's product JSON endpoint
  const jsonUrl = `${cleanUrl}.json`;

  const response = await fetch(jsonUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; RBStudio-PriceSync/1.0)",
      "Accept": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${jsonUrl}: HTTP ${response.status}`);
  }

  const data = await response.json();
  const product = data?.product;

  if (!product) {
    throw new Error(`No product data found at ${jsonUrl}`);
  }

  const variants = product.variants ?? [];
  if (variants.length === 0) {
    throw new Error(`Product "${product.title}" has no variants`);
  }

  const priceTiers: PriceTier[] = variants.map((v: Record<string, unknown>) => ({
    variantId: Number(v.id),
    variantTitle: String(v.title ?? "Default"),
    price: parseFloat(String(v.price ?? "0")),
    compareAtPrice: v.compare_at_price ? parseFloat(String(v.compare_at_price)) : null,
    available: Boolean(v.available),
    sku: String(v.sku ?? ""),
  }));

  return {
    productTitle: String(product.title),
    productHandle: String(product.handle),
    priceTiers,
    scrapedAt: new Date().toISOString(),
  };
}
