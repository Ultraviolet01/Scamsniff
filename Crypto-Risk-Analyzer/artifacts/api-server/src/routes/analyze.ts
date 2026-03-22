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
        input,                          // broad handle search
        `${input} official website`,    // official presence
        `${input} crypto project`,      // project identity
        `${handle} scam review`,        // risk signals
        `${handle} github team`,        // code + team footprint
        `${input} verified legit`,      // legitimacy signals
      ];
    }

    case "website_url": {
      let domain = input;
      try {
        domain = new URL(input).hostname.replace(/^www\./, "");
      } catch { /* keep original */ }
      return [
        input,
        `"${domain}" review legit`,
        `"${domain}" team github`,
        `"${domain}" scam`,
        `"${domain}" docs whitepaper`,
        `"${domain}" audit`,
      ];
    }

    case "token_name":
      return [
        input,                           // broad token search
        `${input} token official site`,  // site + presence
        `${input} token github audit`,   // code + security
        `${input} token whitepaper`,     // docs / legitimacy
        `${input} token review`,         // third-party coverage
        `${input} token scam exploit`,   // risk signals
      ];

    case "project_name":
    default:
      // First 3 queries run as the initial batch — chosen to maximise coverage
      // for well-known projects and trigger early-stop before running the rest.
      return [
        input,                       // broad name search (highest signal)
        `${input} official website`, // site + official presence
        `${input} github`,           // code trustworthiness
        `${input} docs whitepaper`,  // documentation / legitimacy
        `${input} review`,           // credible third-party coverage
        `${input} scam exploit`,     // risk signals
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
    verdict_explanation: scoreData.verdict_explanation,
    positive_signals: scoreData.positive_signals,
    risk_signals: scoreData.risk_signals,
    missing_signals: scoreData.missing_signals,
    evidence: scoreData.evidence,
  });

  res.json(response);
});

export default router;
