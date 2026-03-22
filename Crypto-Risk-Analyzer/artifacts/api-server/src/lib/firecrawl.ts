/**
 * Firecrawl integration for ScamSniff.
 * Wraps the Firecrawl SDK with search and scrape helpers.
 */
import FirecrawlApp from "@mendable/firecrawl-js";
import { logger } from "./logger";

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
 * Handles both response shapes: { web: [...] } and { success, data: [...] }
 */
export async function firecrawlSearch(
  query: string,
  limit = 5
): Promise<SearchResult[]> {
  try {
    const client = getClient();
    const response: any = await client.search(query, { limit });

    const items: any[] =
      Array.isArray(response?.web) ? response.web :
      Array.isArray(response?.data) ? response.data :
      [];

    if (items.length === 0) {
      logger.warn({ query }, "Firecrawl search returned no items");
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
 * Run multiple search queries in sequential batches to avoid hitting
 * Firecrawl rate limits. Stops early once a sufficient result set is
 * accumulated, saving credits on well-known projects.
 *
 * Batching strategy:
 *  - Run the first BATCH_SIZE queries in parallel (highest-signal queries first)
 *  - If we already have EARLY_STOP_THRESHOLD unique results, stop
 *  - Otherwise run the remaining queries in another parallel batch
 *  - Small delay between batches to avoid rate-limit bursts
 */
const BATCH_SIZE = 3;
const EARLY_STOP_THRESHOLD = 12;
const BATCH_DELAY_MS = 400;

export async function firecrawlMultiSearch(
  queries: string[],
  limitPerQuery = 4
): Promise<SearchResult[]> {
  const seen = new Set<string>();
  const combined: SearchResult[] = [];

  function addResults(items: SearchResult[]) {
    for (const item of items) {
      if (item.url && !seen.has(item.url)) {
        seen.add(item.url);
        combined.push(item);
      }
    }
  }

  for (let i = 0; i < queries.length; i += BATCH_SIZE) {
    const batch = queries.slice(i, i + BATCH_SIZE);

    const settled = await Promise.allSettled(
      batch.map((q) => firecrawlSearch(q, limitPerQuery))
    );

    for (const result of settled) {
      if (result.status === "fulfilled") {
        addResults(result.value);
      }
    }

    logger.info(
      { batchIndex: i / BATCH_SIZE, batchSize: batch.length, totalSoFar: combined.length },
      "Firecrawl batch complete"
    );

    // Early-stop: well-known projects will have enough signal from the first batch
    if (combined.length >= EARLY_STOP_THRESHOLD && i + BATCH_SIZE < queries.length) {
      logger.info({ totalResults: combined.length }, "Firecrawl early-stop threshold reached");
      break;
    }

    // Delay between batches to stay within rate limits
    if (i + BATCH_SIZE < queries.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  logger.info({ totalResults: combined.length }, "Firecrawl multi-search complete");
  return combined;
}
