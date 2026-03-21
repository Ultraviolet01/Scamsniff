/**
 * POST /api/analyze
 * Accepts a project name, URL, token, or X handle and returns a risk analysis.
 */
import { Router, type IRouter } from "express";
import { AnalyzeProjectBody, AnalyzeProjectResponse } from "@workspace/api-zod";
import { firecrawlMultiSearch } from "../lib/firecrawl";
import { scoreResults } from "../lib/scorer";
import { classifyInput, InputType } from "../lib/classifier";

const router: IRouter = Router();

/**
 * Build search queries tailored to the detected input type.
 * Deliberately neutral — specific risk words are used to surface relevant content,
 * but their presence in results does NOT by itself raise the risk score.
 */
function buildQueries(input: string, inputType: InputType): string[] {
  switch (inputType) {
    case "x_handle": {
      const handle = input.replace(/^@/, "");
      return [
        input,
        `${input} official website`,
        `${input} crypto project`,
        `${input} github`,
        `${handle} scam`,
        `${handle} review`,
        `${input} team`,
        `${input} verified`,
      ];
    }

    case "website_url": {
      let domain = input;
      try {
        domain = new URL(input).hostname.replace(/^www\./, "");
      } catch { /* keep original */ }
      return [
        input,
        `site:${domain}`,
        `"${domain}" team`,
        `"${domain}" review`,
        `"${domain}" scam`,
        `"${domain}" github`,
        `"${domain}" docs`,
        `"${domain}" legit`,
      ];
    }

    case "token_name":
      return [
        input,
        `${input} token official site`,
        `${input} token whitepaper`,
        `${input} token github`,
        `${input} token audit`,
        `${input} token review`,
        `${input} token scam`,
        `${input} token exploit`,
      ];

    case "project_name":
    default:
      return [
        input,
        `${input} official website`,
        `${input} docs`,
        `${input} github`,
        `${input} team`,
        `${input} review`,
        `${input} exploit`,
        `${input} scam`,
      ];
  }
}

router.post("/analyze", async (req, res): Promise<void> => {
  const parsed = AnalyzeProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { input } = parsed.data;
  const inputType = classifyInput(input);
  req.log.info({ input, inputType }, "Starting analysis");

  const queries = buildQueries(input, inputType);
  let results;

  try {
    results = await firecrawlMultiSearch(queries, 4);
    req.log.info({ input, inputType, resultCount: results.length }, "Search complete");
  } catch (err) {
    req.log.error({ input, err }, "Firecrawl search failed entirely");
    results = [];
  }

  const scoreData = scoreResults(input, results, inputType);

  const response = AnalyzeProjectResponse.parse({
    input,
    input_type: inputType,
    score: scoreData.score,
    verdict: scoreData.verdict,
    confidence: scoreData.confidence,
    summary: scoreData.summary,
    positive_signals: scoreData.positive_signals,
    risk_signals: scoreData.risk_signals,
    missing_signals: scoreData.missing_signals,
    evidence: scoreData.evidence,
  });

  res.json(response);
});

export default router;
