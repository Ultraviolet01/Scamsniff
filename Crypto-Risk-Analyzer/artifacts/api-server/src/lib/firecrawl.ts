/**
 * Firecrawl integration for ScamSniff.
 * Wraps the Firecrawl SDK with search and scrape helpers.
 */
import FirecrawlApp from "@mendable/firecrawl-js";
import { logger } from "./logger";

// Initialize the Firecrawl client using the API key from the environment
function getClient(): FirecrawlApp {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY environment variable is not set");
  }
  return new FirecrawlApp({ apiKey });
}

export interface SearchResult {
  title: string;
  url: string;
  description?: string;
  markdown?: string;
}

/**
 * Run a single Firecrawl search query and return normalized results.
 * The Firecrawl SDK returns { web: [...] } for search results.
 */
export async function firecrawlSearch(
  query: string,
  limit = 5
): Promise<SearchResult[]> {
  try {
    const client = getClient();
    const response: any = await client.search(query, { limit });

    // Handle both response shapes: { web: [...] } and { success, data: [...] }
    const items: any[] =
      Array.isArray(response?.web) ? response.web :
      Array.isArray(response?.data) ? response.data :
      [];

    if (items.length === 0) {
      logger.warn({ query }, "Firecrawl search returned no data");
      return [];
    }

    return items.map((item: any) => ({
      title: item.title ?? "",
      url: item.url ?? "",
      description: item.description ?? "",
      markdown: item.markdown ?? item.content ?? "",
    }));
  } catch (err) {
    logger.error({ query, err }, "Firecrawl search failed");
    return [];
  }
}

/**
 * Run multiple search queries in parallel and deduplicate results by URL.
 */
export async function firecrawlMultiSearch(
  queries: string[],
  limitPerQuery = 4
): Promise<SearchResult[]> {
  const results = await Promise.allSettled(
    queries.map((q) => firecrawlSearch(q, limitPerQuery))
  );

  const seen = new Set<string>();
  const combined: SearchResult[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const item of result.value) {
        if (item.url && !seen.has(item.url)) {
          seen.add(item.url);
          combined.push(item);
        }
      }
    }
  }

  return combined;
}
