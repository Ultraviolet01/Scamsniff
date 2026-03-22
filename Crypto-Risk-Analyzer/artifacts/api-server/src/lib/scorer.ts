/**
 * Risk scoring engine for ScamSniff — v4.
 *
 * Key design principles:
 * - Evidence must come from credible / official sources to carry significant weight.
 * - Query words ("scam", "rug pull") appearing in results do NOT by themselves raise score.
 * - Multiple independent corroborating sources are required before escalating verdict.
 * - Missing legitimacy signals contribute modestly, adjusted per input type.
 * - Community-only risk signals are dampened and cannot overpower strong official trust signals.
 * - Confidence is derived from source diversity, not just result count.
 */
import { SearchResult } from "./firecrawl";
import { InputType } from "./classifier";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SourceType =
  | "official"
  | "credible_third_party"
  | "user_generated"
  | "suspicious_or_low_quality"
  | "unknown";

export type EvidenceImpact = "positive" | "negative" | "neutral";

export interface EvidenceItem {
  title: string;
  url: string;
  source_type: SourceType;
  impact: EvidenceImpact;
  reason: string;
}

export interface ScoreResult {
  score: number;
  verdict: "Low Risk" | "Caution" | "High Risk" | "Extreme Risk";
  confidence: "Low" | "Medium" | "High";
  positive_signals: string[];
  risk_signals: string[];
  missing_signals: string[];
  summary: string;
  verdict_explanation: string;
  evidence: EvidenceItem[];
}

// ---------------------------------------------------------------------------
// Domain classification helpers
// ---------------------------------------------------------------------------

const OFFICIAL_DOMAIN_PATTERNS: RegExp[] = [
  /github\.com/i,
  /\bdocs\./i,
  /\/docs\//i,
  /\/documentation\//i,
  /whitepaper/i,
];

const CREDIBLE_THIRD_PARTY_DOMAINS: string[] = [
  "coindesk.com",
  "cointelegraph.com",
  "decrypt.co",
  "theblock.co",
  "bloomberg.com",
  "reuters.com",
  "forbes.com",
  "techcrunch.com",
  "wired.com",
  "coinmarketcap.com",
  "coingecko.com",
  "messari.io",
  "defillama.com",
  "etherscan.io",
  "bscscan.com",
  "solscan.io",
  "certik.com",
  "halborn.com",
  "trailofbits.com",
  "sec.gov",
  "ftc.gov",
  "justice.gov",
  "irs.gov",
  "cftc.gov",
  "fbi.gov",
  "treasury.gov",
  "wikipedia.org",
  "investopedia.com",
  "metamask.io",
  "binance.com",
  "kraken.com",
  "coinbase.com",
];

const USER_GENERATED_DOMAINS: string[] = [
  "reddit.com",
  "twitter.com",
  "x.com",
  "medium.com",
  "substack.com",
  "quora.com",
  "4chan.org",
  "bitcointalk.org",
  "telegram.me",
  "t.me",
  "discord.gg",
  "discord.com",
];

const SUSPICIOUS_DOMAIN_PATTERNS: RegExp[] = [
  /cryptopump/i,
  /moonpump/i,
  /100x/i,
  /getrich/i,
  /freecrypto/i,
  /airdrop.*tool/i,
];

function classifySource(result: SearchResult): SourceType {
  const url = result.url.toLowerCase();
  const hostname = (() => {
    try {
      return new URL(result.url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  })();

  if (SUSPICIOUS_DOMAIN_PATTERNS.some((p) => p.test(url))) return "suspicious_or_low_quality";
  if (OFFICIAL_DOMAIN_PATTERNS.some((p) => p.test(url))) return "official";
  if (CREDIBLE_THIRD_PARTY_DOMAINS.some((d) => hostname.endsWith(d))) return "credible_third_party";
  if (USER_GENERATED_DOMAINS.some((d) => hostname.endsWith(d))) return "user_generated";
  return "unknown";
}

// ---------------------------------------------------------------------------
// Signal patterns
// ---------------------------------------------------------------------------

interface SignalPattern {
  pattern: RegExp;
  label: string;
  baseWeight: number;
}

const RISK_SIGNAL_PATTERNS: SignalPattern[] = [
  { pattern: /\brug\s*pull\b/i,          label: "Rug pull reports found",                  baseWeight: 30 },
  { pattern: /\bexit\s*scam\b/i,          label: "Exit scam reports found",                 baseWeight: 30 },
  { pattern: /\bponzi\b/i,                label: "Ponzi scheme allegations",                baseWeight: 25 },
  { pattern: /\bfraud\b/i,                label: "Fraud allegations found",                 baseWeight: 20 },
  { pattern: /\bcharged?\b.*\bcrypto\b/i, label: "Legal or regulatory charges found",       baseWeight: 25 },
  { pattern: /\bscam\b/i,                 label: "Scam reports found",                      baseWeight: 18 },
  { pattern: /\bexploit\b/i,              label: "Exploit or hack reports found",            baseWeight: 18 },
  { pattern: /\bhack(ed)?\b/i,            label: "Hack reports found",                      baseWeight: 15 },
  { pattern: /\bphish(ing)?\b/i,          label: "Phishing activity reported",              baseWeight: 20 },
  { pattern: /\bimpersonat/i,             label: "Impersonation warnings found",             baseWeight: 18 },
  { pattern: /\bguaranteed\s+(return|profit|gain)/i, label: "Guaranteed returns language",  baseWeight: 22 },
  { pattern: /\b100%\s+(profit|return|gain)\b/i,     label: "Unrealistic return promises",  baseWeight: 22 },
  { pattern: /\bget\s+rich\s+quick\b/i,   label: "Get-rich-quick language",                 baseWeight: 18 },
  { pattern: /\bdo\s+not\s+(invest|buy)\b/i, label: "Community warns against investing",    baseWeight: 14 },
  { pattern: /\bstay\s+away\b/i,           label: "Community tells users to avoid this",    baseWeight: 12 },
  { pattern: /\bsentenced?\b/i,            label: "Criminal conviction or sentencing found", baseWeight: 45 },
  { pattern: /\bconvicted?\b/i,            label: "Criminal conviction or sentencing found", baseWeight: 45 },
  { pattern: /\bfound\s+guilty\b/i,        label: "Criminal conviction or sentencing found", baseWeight: 45 },
  { pattern: /\bindicted?\b/i,             label: "Criminal indictment found",                baseWeight: 35 },
  { pattern: /\barrest(?:ed)?\b/i,         label: "Arrest reported",                          baseWeight: 25 },
];

const POSITIVE_SIGNAL_PATTERNS: SignalPattern[] = [
  { pattern: /\baudit(ed)?\b/i,            label: "Security audit mentioned",               baseWeight: -18 },
  { pattern: /\bopen[\s-]?source\b/i,      label: "Open source codebase",                  baseWeight: -14 },
  { pattern: /\bwhitepaper\b/i,            label: "Whitepaper available",                   baseWeight: -10 },
  { pattern: /\bregulated\b/i,             label: "Regulated entity",                       baseWeight: -14 },
  { pattern: /\bpartnered?\s+with\b/i,     label: "Established partnerships",               baseWeight: -8  },
  { pattern: /\bcertik\b|\bhalborn\b|\btrail\s*of\s*bits\b/i, label: "Security firm audit found", baseWeight: -18 },
];

// ---------------------------------------------------------------------------
// Source-type multipliers
// ---------------------------------------------------------------------------

const RISK_MULTIPLIER: Record<SourceType, number> = {
  official:                   1.5,
  credible_third_party:       1.4,
  user_generated:             0.35,
  suspicious_or_low_quality:  0.1,
  unknown:                    0.4,
};

const POSITIVE_MULTIPLIER: Record<SourceType, number> = {
  official:                   1.4,
  credible_third_party:       1.2,
  user_generated:             0.5,
  suspicious_or_low_quality:  0.0,
  unknown:                    0.6,
};

// ---------------------------------------------------------------------------
// Legitimacy footprint
// ---------------------------------------------------------------------------

interface LegitimacyFootprint {
  hasGitHub: boolean;
  hasOfficialSite: boolean;
  hasOfficialDocs: boolean;
  hasCredibleMedia: boolean;
  hasBlockExplorer: boolean;
  hasSecurityAudit: boolean;
  hasTwitterXPresence: boolean;
  hasContactInfo: boolean;
}

function detectLegitimacyFootprint(results: SearchResult[], input: string): LegitimacyFootprint {
  const urls = results.map((r) => r.url.toLowerCase());
  const allText = results.map((r) => `${r.title} ${r.description ?? ""}`).join(" ").toLowerCase();

  // Normalize input for domain-matching: "SafeMoon" → "safemoon"
  const querySlug = input.toLowerCase().replace(/[^a-z0-9]/g, "");

  /**
   * hasOfficialSite: true when ANY result looks like the project's own website.
   * Three ways to qualify:
   *  (a) URL pattern matches our official patterns (github, /docs/, whitepaper)
   *  (b) URL domain's first label contains the project query slug
   *      e.g. "safemoon.com" contains "safemoon" → official for query "SafeMoon"
   *  (c) URL domain slug IS a prefix/suffix match of the query slug (≥4 chars)
   */
  const hasOfficialSite = results.some((r) => {
    if (classifySource(r) === "official") return true;
    if (querySlug.length < 4) return false;
    try {
      const hostname = new URL(r.url).hostname.toLowerCase().replace(/^www\./, "");
      const domainLabel = hostname.split(".")[0]; // e.g. "safemoon" from "safemoon.com"
      return domainLabel.includes(querySlug) || querySlug.includes(domainLabel);
    } catch {
      return false;
    }
  });

  /**
   * hasOfficialDocs: URL has /docs or docs. prefix, OR text explicitly mentions
   * docs/whitepaper/documentation so readers know it exists.
   */
  const hasOfficialDocs =
    urls.some((u) => u.includes("/docs") || u.includes("docs.") || u.includes("/documentation") || u.includes("whitepaper")) ||
    /\bwhitepaper\b|\bdocumentation\b|\bofficial\s+docs?\b/i.test(allText);

  return {
    hasGitHub:           urls.some((u) => u.includes("github.com")),
    hasOfficialSite,
    hasOfficialDocs,
    hasCredibleMedia:    results.some((r) => classifySource(r) === "credible_third_party"),
    hasBlockExplorer:    urls.some((u) => ["etherscan.io","bscscan.com","solscan.io","polygonscan.com"].some((e) => u.includes(e))),
    hasSecurityAudit:    results.some((r) => /\baudit(ed)?\b/i.test(r.title + " " + (r.description ?? ""))),
    hasTwitterXPresence: urls.some((u) => u.includes("twitter.com") || u.includes("x.com")),
    hasContactInfo:      /\bcontact\b|\bteam\b|\babout\s+us\b/.test(allText),
  };
}

// ---------------------------------------------------------------------------
// Context-aware missing signals
// ---------------------------------------------------------------------------

interface MissingSignalRule {
  condition: boolean;
  label: string;
  riskDelta: number;
}

function buildMissingSignalRules(
  footprint: LegitimacyFootprint,
  inputType: InputType
): MissingSignalRule[] {
  switch (inputType) {
    case "x_handle":
      return [
        { condition: footprint.hasOfficialSite,  label: "No verified link to official project website",  riskDelta: 6 },
        { condition: footprint.hasGitHub,         label: "No GitHub connection found",                    riskDelta: 5 },
        { condition: footprint.hasCredibleMedia,  label: "No credible media coverage found",              riskDelta: 3 },
        { condition: footprint.hasContactInfo,    label: "No team or company footprint found",            riskDelta: 3 },
      ];

    case "website_url":
      return [
        { condition: footprint.hasContactInfo,    label: "No contact or team information found",          riskDelta: 6 },
        { condition: footprint.hasGitHub,         label: "No GitHub or source code link found",           riskDelta: 5 },
        { condition: footprint.hasOfficialDocs,   label: "No official documentation found",               riskDelta: 5 },
        { condition: footprint.hasCredibleMedia,  label: "No broader third-party validation found",       riskDelta: 4 },
      ];

    case "token_name":
    case "project_name":
    default:
      return [
        { condition: footprint.hasGitHub,         label: "No GitHub repository found",                    riskDelta: 6 },
        { condition: footprint.hasOfficialDocs,   label: "No official docs or whitepaper found",          riskDelta: 5 },
        { condition: footprint.hasOfficialSite,   label: "No identifiable official website",              riskDelta: 5 },
        { condition: footprint.hasCredibleMedia,  label: "No broader third-party validation found",       riskDelta: 4 },
      ];
  }
}

// ---------------------------------------------------------------------------
// Per-source evidence analysis
// ---------------------------------------------------------------------------

function analyzeSource(
  result: SearchResult,
  input: string,
  seenRiskLabels: Set<string>,
  seenPositiveLabels: Set<string>
): { evidence: EvidenceItem; scoreDelta: number } {
  const sourceType = classifySource(result);
  const text = `${result.title} ${result.description ?? ""} ${(result.markdown ?? "").slice(0, 2000)}`;
  const riskMultiplier = RISK_MULTIPLIER[sourceType];
  const positiveMultiplier = POSITIVE_MULTIPLIER[sourceType];
  let scoreDelta = 0;
  const hitLabels: string[] = [];
  let impact: EvidenceImpact = "neutral";

  for (const { pattern, label, baseWeight } of RISK_SIGNAL_PATTERNS) {
    if (pattern.test(text)) {
      scoreDelta += baseWeight * riskMultiplier;
      // Always record what this specific source found (for the reason label)
      hitLabels.push(label.toLowerCase());
      // Global deduplication only for the risk_signals list
      seenRiskLabels.add(label);
      impact = "negative";
    }
  }

  for (const { pattern, label, baseWeight } of POSITIVE_SIGNAL_PATTERNS) {
    if (pattern.test(text)) {
      scoreDelta += baseWeight * positiveMultiplier;
      hitLabels.push(label.toLowerCase());
      seenPositiveLabels.add(label);
      if (impact !== "negative") impact = "positive";
    }
  }

  // Apply legitimacy baseline ONLY when the source is not flagging risk.
  // A CoinDesk article reporting SafeMoon's fraud conviction should not get
  // a -3 legitimacy discount just because it's from a credible domain.
  if (impact !== "negative") {
    const nonNegativeBaseline: Record<SourceType, number> = {
      official:                  -4,
      credible_third_party:      -3,
      user_generated:             0,
      suspicious_or_low_quality:  0,
      unknown:                    0,
    };
    scoreDelta += nonNegativeBaseline[sourceType];
  }
  // Suspicious/low-quality sources always add a small risk premium
  if (sourceType === "suspicious_or_low_quality") scoreDelta += 3;
  if (scoreDelta < -2 && impact === "neutral") impact = "positive";

  // Build an explicit, human-readable reason label
  let reason: string;
  if (hitLabels.length > 0) {
    const labelList = hitLabels.slice(0, 2).join("; ");
    if (sourceType === "user_generated") {
      reason = `Community discussion mentions ${labelList}. Source credibility is limited — treat as a caution signal only.`;
    } else if (sourceType === "official") {
      reason = `Official source confirms: ${labelList}.`;
    } else if (sourceType === "credible_third_party") {
      reason = `Credible reporting confirms: ${labelList}.`;
    } else {
      reason = `Signals detected: ${labelList}.`;
    }
  } else {
    const typeDescriptions: Record<SourceType, string> = {
      official:                  "Official documentation confirms project presence.",
      credible_third_party:      "Credible third-party coverage found — no risk signals detected.",
      user_generated:            "Community discussion found — no notable risk signals detected.",
      suspicious_or_low_quality: "Low-quality or promotional source — minimal weight applied.",
      unknown:                   "Unclassified source — no strong signals detected.",
    };
    reason = typeDescriptions[sourceType];
  }

  return {
    evidence: { title: result.title, url: result.url, source_type: sourceType, impact, reason },
    scoreDelta,
  };
}

// ---------------------------------------------------------------------------
// Summary builder
// ---------------------------------------------------------------------------

function buildSummary(
  input: string,
  inputType: InputType,
  verdict: ScoreResult["verdict"],
  riskSignals: string[],
  positiveSignals: string[],
  missingSignals: string[],
  evidence: EvidenceItem[],
  resultCount: number,
  negativeCredibleCount: number
): string {
  if (resultCount === 0) {
    const subject = inputType === "x_handle" ? `the handle "${input}"` : `"${input}"`;
    return `No public evidence found for ${subject}. Without a verifiable web footprint, this assessment is inconclusive — treat with caution and verify directly before taking any action.`;
  }

  if (resultCount <= 3) {
    const subject = inputType === "x_handle" ? `the handle "${input}"` : `"${input}"`;
    return `Only limited public evidence was found for ${subject} (${resultCount} source${resultCount === 1 ? "" : "s"}). This assessment is low-confidence — findings may be incomplete. Verify through direct sources before drawing conclusions.`;
  }

  const credibleCount = evidence.filter(
    (e) => e.source_type === "credible_third_party" || e.source_type === "official"
  ).length;

  const communityNegativeCount = evidence.filter(
    (e) => e.impact === "negative" && (e.source_type === "user_generated" || e.source_type === "unknown")
  ).length;

  const hasStrongFootprint =
    evidence.some((e) => e.source_type === "official") ||
    evidence.some((e) => e.source_type === "credible_third_party");

  const parts: string[] = [];

  if (verdict === "Low Risk") {
    parts.push(
      `"${input}" shows a strong legitimacy footprint across ${resultCount} sources (${credibleCount} credible).`
    );
    if (positiveSignals.length > 0) {
      parts.push(`Key trust indicators: ${positiveSignals.slice(0, 3).join(", ")}.`);
    }
  } else if (verdict === "Caution") {
    if (hasStrongFootprint && negativeCredibleCount === 0 && communityNegativeCount > 0) {
      parts.push(
        `"${input}" has solid trust signals, but community sources also mention some concerns.`
      );
      parts.push(`Community signals have limited weight — ${credibleCount} credible source(s) found no serious issues.`);
    } else if (missingSignals.length >= 2) {
      parts.push(`"${input}" has a partial legitimacy footprint — some positive signals exist, but key markers are missing.`);
      parts.push(`Missing: ${missingSignals.slice(0, 2).join(", ")}.`);
    } else {
      parts.push(`"${input}" has a partial legitimacy footprint — some positive signals exist, but gaps remain.`);
      if (riskSignals.length > 0) {
        parts.push(`Minor concerns: ${riskSignals.slice(0, 2).join(", ")}.`);
      }
    }
  } else if (verdict === "High Risk") {
    if (negativeCredibleCount > 0) {
      parts.push(
        `"${input}" has multiple risk indicators backed by ${negativeCredibleCount} credible source(s).`
      );
    } else {
      parts.push(
        `"${input}" has risk signals, primarily from community sources. No credible sources confirmed these concerns.`
      );
    }
    if (riskSignals.length > 0) {
      parts.push(`Concerns: ${riskSignals.slice(0, 3).join(", ")}.`);
    }
  } else {
    parts.push(
      `"${input}" has strong evidence of fraud or malicious activity from ${negativeCredibleCount} credible source(s).`
    );
    if (riskSignals.length > 0) {
      parts.push(`Critical signals: ${riskSignals.slice(0, 3).join(", ")}.`);
    }
  }

  parts.push("Always do your own research (DYOR) before investing.");
  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Verdict explanation builder
// ---------------------------------------------------------------------------

function buildVerdictExplanation(
  verdict: ScoreResult["verdict"],
  confidence: ScoreResult["confidence"],
  negativeCredibleCount: number,
  communityNegativeCount: number,
  positiveSignals: string[],
  missingSignals: string[],
  evidence: EvidenceItem[]
): string {
  const hasOfficialPositive = evidence.some(
    (e) => e.impact === "positive" && (e.source_type === "official" || e.source_type === "credible_third_party")
  );

  if (confidence === "Low") {
    return "Limited public data was found, so this assessment should be treated cautiously. Verify through direct sources before drawing conclusions.";
  }

  if (verdict === "Low Risk") {
    if (hasOfficialPositive) {
      return "Strong official footprint confirmed across credible sources — confidence in this verdict is high.";
    }
    return "Available evidence is positive, but coverage is limited. Treat this as a preliminary signal, not a guarantee.";
  }

  if (verdict === "Caution") {
    if (hasOfficialPositive && negativeCredibleCount === 0 && communityNegativeCount > 0) {
      return "Strong official trust signals were found, but some community caution reports also exist. Community sources carry limited weight — no credible outlet confirmed these concerns.";
    }
    if (missingSignals.length >= 2) {
      return "This project is missing several standard legitimacy markers. That alone does not confirm a scam, but it increases uncertainty.";
    }
    return "Evidence is mixed — some positive signals and some gaps exist. Assess each signal against its source quality before acting.";
  }

  if (verdict === "High Risk") {
    if (negativeCredibleCount > 0) {
      return `Risk indicators are backed by ${negativeCredibleCount} credible source(s). This warrants serious caution regardless of any positive signals.`;
    }
    return "Risk signals were detected, but primarily from community sources rather than official reporting. Treat this as a strong caution flag, not confirmed fraud.";
  }

  // Extreme Risk
  return "Multiple credible sources confirm serious fraud or malicious activity. Do not engage with this project without thorough independent verification.";
}

// ---------------------------------------------------------------------------
// Verdict + confidence
// ---------------------------------------------------------------------------

function toVerdict(score: number): ScoreResult["verdict"] {
  if (score <= 15) return "Low Risk";
  if (score <= 40) return "Caution";
  if (score <= 65) return "High Risk";
  return "Extreme Risk";
}

function toConfidence(
  resultCount: number,
  footprint: LegitimacyFootprint,
  evidence: EvidenceItem[],
  inputType: InputType
): ScoreResult["confidence"] {
  if (resultCount === 0) return "Low";

  const credibleCount = evidence.filter(
    (e) => e.source_type === "credible_third_party" || e.source_type === "official"
  ).length;

  const userGeneratedOnly = evidence.every(
    (e) => e.source_type === "user_generated" || e.source_type === "unknown"
  );

  if (inputType === "x_handle") {
    if (userGeneratedOnly) return "Low";
    if (credibleCount >= 2 && (footprint.hasOfficialSite || footprint.hasGitHub)) return "High";
    return "Medium";
  }

  if (inputType === "website_url") {
    const hasOfficialPresence = footprint.hasOfficialSite || footprint.hasGitHub;
    if (credibleCount >= 2 && hasOfficialPresence) return "High";
    if (credibleCount >= 1) return "Medium";
    return "Low";
  }

  const hasOfficialPresence = footprint.hasGitHub || footprint.hasOfficialDocs || footprint.hasOfficialSite;
  if (credibleCount >= 3 && hasOfficialPresence) return "High";
  if (credibleCount >= 1 || resultCount >= 8) return "Medium";
  return "Low";
}

// ---------------------------------------------------------------------------
// Context-aware zero-result fallback
// ---------------------------------------------------------------------------

function zeroResultResponse(input: string, inputType: InputType): ScoreResult {
  const missingByType: Record<InputType, string[]> = {
    x_handle:     ["No verified link to official project website", "No GitHub connection found", "No credible media coverage found"],
    website_url:  ["No contact or team information found", "No GitHub or source code link found", "No broader third-party validation found"],
    token_name:   ["No official website or landing page", "No GitHub repository", "No documentation or whitepaper", "No broader third-party validation found"],
    project_name: ["No official website or landing page", "No GitHub repository", "No documentation or whitepaper", "No broader third-party validation found"],
    unknown:      ["No official website or landing page", "No GitHub repository", "No documentation or whitepaper"],
  };

  return {
    score: 40,
    verdict: "Caution",
    confidence: "Low",
    positive_signals: [],
    risk_signals: ["No public evidence found"],
    missing_signals: missingByType[inputType],
    summary: `No public evidence found for "${input}". Without a verifiable web footprint, this assessment is inconclusive — treat with caution and verify directly before taking any action.`,
    verdict_explanation: "No public data was found for this input. The assessment defaults to Caution because the absence of any verifiable web presence is itself a risk signal for a crypto project.",
    evidence: [],
  };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function scoreResults(
  input: string,
  results: SearchResult[],
  inputType: InputType = "unknown"
): ScoreResult {
  if (results.length === 0) return zeroResultResponse(input, inputType);

  const seenRiskLabels = new Set<string>();
  const seenPositiveLabels = new Set<string>();
  const allEvidence: EvidenceItem[] = [];
  let rawScore = 0;
  const credibleRiskLabels = new Set<string>();

  for (const result of results) {
    const { evidence, scoreDelta } = analyzeSource(result, input, seenRiskLabels, seenPositiveLabels);
    allEvidence.push(evidence);
    rawScore += scoreDelta;
    // Track which risk labels came specifically from credible/official sources
    if (
      evidence.impact === "negative" &&
      (evidence.source_type === "official" || evidence.source_type === "credible_third_party")
    ) {
      const text = `${result.title} ${result.description ?? ""}`;
      for (const { pattern, label } of RISK_SIGNAL_PATTERNS) {
        if (pattern.test(text)) credibleRiskLabels.add(label);
      }
    }
  }

  const footprint = detectLegitimacyFootprint(results, input);

  // Credible media structural bonus only applies when at least some credible
  // sources are not raising red flags (e.g. CoinDesk reporting SafeMoon fraud
  // should not grant a legitimacy bonus).
  const hasCredibleNonNegativeCoverage = allEvidence.some(
    (e) => e.source_type === "credible_third_party" && e.impact !== "negative"
  );

  // Structural bonuses
  const structuralAdjustments: { condition: boolean; delta: number; positive: string }[] = [
    { condition: footprint.hasGitHub,              delta: -10, positive: "Active GitHub repository found" },
    { condition: footprint.hasOfficialDocs,        delta: -8,  positive: "Official documentation found" },
    { condition: hasCredibleNonNegativeCoverage,   delta: -8,  positive: "Coverage by credible media" },
    { condition: footprint.hasBlockExplorer,       delta: -5,  positive: "Verified on block explorer" },
    { condition: footprint.hasSecurityAudit,       delta: -10, positive: "Security audit evidence found" },
  ];

  if (inputType === "x_handle" && footprint.hasTwitterXPresence) {
    structuralAdjustments.push({ condition: true, delta: -5, positive: "Active social media presence found" });
  }

  const positiveSignals: string[] = [...seenPositiveLabels];

  for (const { condition, delta, positive } of structuralAdjustments) {
    if (condition) {
      rawScore += delta;
      if (!positiveSignals.includes(positive)) positiveSignals.push(positive);
    }
  }

  // Missing signals — context-aware
  const missingRules = buildMissingSignalRules(footprint, inputType);
  const missingSignals: string[] = [];

  for (const { condition, label, riskDelta } of missingRules) {
    if (!condition) {
      missingSignals.push(label);
      rawScore += riskDelta;
    }
  }

  // Dampen community-only negative accumulation
  const ugNegativeCount = allEvidence.filter(
    (e) => e.source_type === "user_generated" && e.impact === "negative"
  ).length;
  if (ugNegativeCount > 2) {
    // Each community negative post beyond the first 2 contributes at most 3 points
    rawScore -= (ugNegativeCount - 2) * 5;
  }

  // When a strong official footprint exists and NO credible sources are negative,
  // community-only risk signals cannot push the verdict past "Caution" (score cap 38).
  const negativeCredibleCount = allEvidence.filter(
    (e) =>
      e.impact === "negative" &&
      (e.source_type === "official" || e.source_type === "credible_third_party")
  ).length;

  const strongOfficialFootprint =
    (footprint.hasGitHub || footprint.hasOfficialDocs) && footprint.hasCredibleMedia;

  if (strongOfficialFootprint && negativeCredibleCount === 0) {
    rawScore = Math.min(rawScore, 38);
  }

  // Score floors: government/law-enforcement findings cannot be cancelled by legitimacy bonuses.
  const CONVICTION_LABELS = new Set([
    "Criminal conviction or sentencing found",
    "Criminal indictment found",
  ]);
  const hasCredibleConviction = [...credibleRiskLabels].some((l) => CONVICTION_LABELS.has(l));
  const hasCredibleArrest =
    credibleRiskLabels.has("Arrest reported") && negativeCredibleCount >= 1;

  if (hasCredibleConviction) {
    // Confirmed conviction from a credible/official source → always at least Extreme Risk (66+)
    rawScore = Math.max(rawScore, 66);
  } else if (hasCredibleArrest || negativeCredibleCount >= 3) {
    // Multiple credible negatives or credible arrest → floor at High Risk (50+)
    rawScore = Math.max(rawScore, 50);
  } else if (negativeCredibleCount >= 2) {
    // Two credible sources raising red flags → floor at upper Caution (41+)
    rawScore = Math.max(rawScore, 41);
  }

  const communityNegativeCount = allEvidence.filter(
    (e) => e.impact === "negative" && (e.source_type === "user_generated" || e.source_type === "unknown")
  ).length;

  const score = Math.round(Math.max(0, Math.min(100, rawScore)));
  const verdict = toVerdict(score);
  const confidence = toConfidence(results.length, footprint, allEvidence, inputType);
  const riskSignals = [...seenRiskLabels];

  const sortedEvidence = [...allEvidence].sort((a, b) => {
    const order: Record<EvidenceImpact, number> = { negative: 0, positive: 1, neutral: 2 };
    if (order[a.impact] !== order[b.impact]) return order[a.impact] - order[b.impact];
    const typeOrder: Record<SourceType, number> = {
      official: 0, credible_third_party: 1, user_generated: 2, unknown: 3, suspicious_or_low_quality: 4,
    };
    return typeOrder[a.source_type] - typeOrder[b.source_type];
  }).slice(0, 10);

  const summary = buildSummary(
    input, inputType, verdict, riskSignals, positiveSignals, missingSignals,
    allEvidence, results.length, negativeCredibleCount
  );

  const verdict_explanation = buildVerdictExplanation(
    verdict, confidence, negativeCredibleCount, communityNegativeCount,
    positiveSignals, missingSignals, allEvidence
  );

  return {
    score, verdict, confidence,
    positive_signals: positiveSignals,
    risk_signals: riskSignals,
    missing_signals: missingSignals,
    summary,
    verdict_explanation,
    evidence: sortedEvidence,
  };
}
