import { useState } from "react";
import { useAnalyzeProject } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Activity,
  AlertOctagon,
  Terminal,
  ExternalLink,
  Globe,
  Users,
  FileText,
  HelpCircle,
  AlertCircle,
  Mic,
  ChevronDown,
  ChevronUp,
  ShieldOff,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Zap,
  BookOpen,
  GitBranch,
  Twitter,
  Link2,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Layers,
  Eye,
  Lock,
} from "lucide-react";
import { Link } from "wouter";
import { ScoreGauge } from "@/components/ScoreGauge";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AnalysisMode = "fast" | "deep" | "token" | "website" | "xaccount";

interface ModeConfig {
  id: AnalysisMode;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  prefix?: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODES: ModeConfig[] = [
  {
    id: "fast",
    label: "Fast Check",
    icon: <Zap className="w-3.5 h-3.5" />,
    placeholder: "Project name, URL, token, or @handle",
    description: "Quick scan across all sources",
  },
  {
    id: "deep",
    label: "Deep Dive",
    icon: <Layers className="w-3.5 h-3.5" />,
    placeholder: "Project name for deep investigation",
    description: "Full multi-source investigation",
  },
  {
    id: "token",
    label: "Token Check",
    icon: <BookOpen className="w-3.5 h-3.5" />,
    placeholder: "Token name or symbol (e.g. PEPE)",
    description: "Optimised for ERC-20 / meme coins",
  },
  {
    id: "website",
    label: "Website Check",
    icon: <Globe className="w-3.5 h-3.5" />,
    placeholder: "https://projectsite.xyz",
    description: "Domain + team + docs analysis",
  },
  {
    id: "xaccount",
    label: "X Account",
    icon: <Twitter className="w-3.5 h-3.5" />,
    placeholder: "@handle (e.g. @SafeMoon)",
    prefix: "@",
    description: "X/Twitter account risk scan",
  },
];

const DEMO_PRESETS = [
  {
    label: "SafeMoon",
    input: "SafeMoon",
    tag: "High Risk",
    color: "text-orange-400 border-orange-400/30 bg-orange-400/5 hover:bg-orange-400/10",
  },
  {
    label: "Uniswap",
    input: "Uniswap",
    tag: "Low Risk",
    color: "text-emerald-400 border-emerald-400/30 bg-emerald-400/5 hover:bg-emerald-400/10",
  },
  {
    label: "MoonPumpXYZ",
    input: "MoonPumpXYZ",
    tag: "Extreme Risk",
    color: "text-red-500 border-red-500/30 bg-red-500/5 hover:bg-red-500/10",
  },
];

const SOURCE_TYPE_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  official: {
    label: "Official",
    color: "bg-primary/15 text-primary border-primary/30",
    icon: <Globe className="w-3 h-3" />,
  },
  credible_third_party: {
    label: "Credible",
    color: "bg-emerald-500/15 text-emerald-400 border-emerald-400/30",
    icon: <FileText className="w-3 h-3" />,
  },
  user_generated: {
    label: "Community",
    color: "bg-yellow-400/15 text-yellow-400 border-yellow-400/30",
    icon: <Users className="w-3 h-3" />,
  },
  suspicious_or_low_quality: {
    label: "Suspicious",
    color: "bg-red-500/15 text-red-400 border-red-500/30",
    icon: <AlertCircle className="w-3 h-3" />,
  },
  unknown: {
    label: "Unknown",
    color: "bg-muted/30 text-muted-foreground border-border",
    icon: <HelpCircle className="w-3 h-3" />,
  },
};

const IMPACT_META: Record<string, { dot: string; label: string }> = {
  positive: { dot: "bg-emerald-400", label: "Trust ↑" },
  negative: { dot: "bg-red-500", label: "Risk ↑" },
  neutral: { dot: "bg-muted-foreground", label: "Neutral" },
};

// ---------------------------------------------------------------------------
// Warning chip detection (derived from API response)
// ---------------------------------------------------------------------------

interface WarningChip {
  id: string;
  label: string;
  icon: React.ReactNode;
  severity: "high" | "medium" | "low";
}

function deriveWarningChips(
  riskSignals: string[],
  missingSignals: string[],
  evidence: Array<{ source_type: string; impact: string }>,
): WarningChip[] {
  const chips: WarningChip[] = [];
  const missing = missingSignals.join(" ").toLowerCase();
  const risks = riskSignals.join(" ").toLowerCase();

  if (missing.includes("official site") || missing.includes("official web"))
    chips.push({ id: "no-site", label: "No Official Site", icon: <Globe className="w-3 h-3" />, severity: "high" });

  if (missing.includes("doc") || missing.includes("whitepaper"))
    chips.push({ id: "no-docs", label: "No Docs", icon: <BookOpen className="w-3 h-3" />, severity: "medium" });

  if (missing.includes("github"))
    chips.push({ id: "no-github", label: "No GitHub", icon: <GitBranch className="w-3 h-3" />, severity: "medium" });

  if (/scam|fraud|rug|ponzi|exit scam|phish|impersonat/.test(risks)) {
    const hasCredibleNegative = evidence.some(
      (e) =>
        e.impact === "negative" &&
        (e.source_type === "official" || e.source_type === "credible_third_party")
    );
    if (hasCredibleNegative) {
      chips.push({ id: "scam", label: "Verified Risk Reports", icon: <AlertTriangle className="w-3 h-3" />, severity: "high" });
    } else {
      chips.push({ id: "scam", label: "Community Scam Claims", icon: <AlertTriangle className="w-3 h-3" />, severity: "low" });
    }
  }

  if (missingSignals.length >= 3)
    chips.push({ id: "weak", label: "Weak Footprint", icon: <ShieldOff className="w-3 h-3" />, severity: "medium" });

  const positiveEvidence = evidence.filter((e) => e.impact === "positive");
  const allCommunityOnly =
    positiveEvidence.length > 0 &&
    positiveEvidence.every((e) => e.source_type === "user_generated" || e.source_type === "unknown");
  if (allCommunityOnly)
    chips.push({ id: "community", label: "Community-Only Evidence", icon: <Users className="w-3 h-3" />, severity: "low" });

  return chips;
}

// ---------------------------------------------------------------------------
// Safety actions (contextual)
// ---------------------------------------------------------------------------

function getSafetyActions(verdict: string): Array<{ label: string; icon: React.ReactNode; critical: boolean }> {
  const base = [
    { label: "Always verify official links manually before connecting a wallet", icon: <Link2 className="w-4 h-4" />, critical: false },
    { label: "Never share your seed phrase with anyone", icon: <Lock className="w-4 h-4" />, critical: false },
  ];
  if (verdict === "Extreme Risk" || verdict === "High Risk") {
    return [
      { label: "Do not connect your wallet to this project", icon: <XCircle className="w-4 h-4" />, critical: true },
      { label: "Do not send funds — treat as unverified", icon: <ShieldOff className="w-4 h-4" />, critical: true },
      { label: "Cross-check team and official site independently", icon: <Eye className="w-4 h-4" />, critical: false },
      ...base,
    ];
  }
  if (verdict === "Caution") {
    return [
      { label: "Verify the official site and GitHub before acting", icon: <Eye className="w-4 h-4" />, critical: false },
      { label: "Look for an independent security audit", icon: <ShieldCheck className="w-4 h-4" />, critical: false },
      { label: "Confirm team credentials before investing", icon: <Users className="w-4 h-4" />, critical: false },
      ...base,
    ];
  }
  return [
    { label: "Looks clean — still verify links before connecting a wallet", icon: <CheckCircle2 className="w-4 h-4" />, critical: false },
    { label: "Review wallet permissions before approving transactions", icon: <Eye className="w-4 h-4" />, critical: false },
    ...base,
  ];
}

// ---------------------------------------------------------------------------
// Verdict styling
// ---------------------------------------------------------------------------

const VERDICT_COLOR: Record<string, string> = {
  "Low Risk": "text-emerald-400",
  "Caution": "text-yellow-400",
  "High Risk": "text-orange-400",
  "Extreme Risk": "text-red-500",
};

const VERDICT_BORDER: Record<string, string> = {
  "Low Risk": "border-emerald-500/25",
  "Caution": "border-yellow-400/25",
  "High Risk": "border-orange-400/25",
  "Extreme Risk": "border-red-500/30",
};

const VERDICT_GLOW: Record<string, string> = {
  "Low Risk": "shadow-[0_0_60px_rgba(52,211,153,0.1)]",
  "Caution": "shadow-[0_0_60px_rgba(251,191,36,0.1)]",
  "High Risk": "shadow-[0_0_60px_rgba(251,146,60,0.12)]",
  "Extreme Risk": "shadow-[0_0_60px_rgba(239,68,68,0.15)]",
};

const VERDICT_ICON: Record<string, React.ReactNode> = {
  "Low Risk": <ShieldCheck className="w-7 h-7 text-emerald-400" />,
  "Caution": <ShieldAlert className="w-7 h-7 text-yellow-400" />,
  "High Risk": <ShieldAlert className="w-7 h-7 text-orange-400" />,
  "Extreme Risk": <ShieldOff className="w-7 h-7 text-red-500" />,
};

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 40);
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Home() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<AnalysisMode>("fast");
  const [showVerdictDetails, setShowVerdictDetails] = useState(false);
  const mutation = useAnalyzeProject();

  const activeMode = MODES.find((m) => m.id === mode)!;

  const resolveInput = (raw: string) => {
    const trimmed = raw.trim();
    if (mode === "xaccount" && !trimmed.startsWith("@")) return `@${trimmed}`;
    return trimmed;
  };

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    const resolved = resolveInput(input);
    if (!resolved) return;
    setShowVerdictDetails(false);
    mutation.mutate({ data: { input: resolved } });
  };

  const handlePreset = (presetInput: string) => {
    setInput(presetInput);
    setMode("fast");
    setShowVerdictDetails(false);
    mutation.mutate({ data: { input: presetInput } });
  };

  const results = mutation.data;
  const isError = mutation.isError;
  const isLoading = mutation.isPending;

  const warningChips = results
    ? deriveWarningChips(results.risk_signals, results.missing_signals, results.evidence)
    : [];

  const safetyActions = results ? getSafetyActions(results.verdict) : [];

  return (
    <div className="min-h-screen w-full relative bg-background">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[700px] h-[500px] bg-primary/4 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[400px] bg-accent/4 rounded-full blur-[120px]" />
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-4 py-10 md:py-16 flex flex-col items-center gap-7">

        {/* ── Hero ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center w-full"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-5 rounded-full bg-primary/10 border border-primary/30 text-primary font-mono text-xs tracking-widest">
            <Activity className="w-3 h-3 animate-pulse" />
            SYSTEM ONLINE // V3.0.0
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-white to-accent uppercase">
            ScamSniff
          </h1>
          <p className="text-muted-foreground text-base md:text-lg font-mono max-w-xl mx-auto leading-relaxed">
            On-chain threat intelligence for crypto projects, tokens, URLs, and X accounts.
          </p>
          <div className="mt-4">
            <Link
              href="/voice"
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent font-mono text-xs tracking-wider hover:bg-accent/20 transition-colors"
            >
              <Mic className="w-3.5 h-3.5" />
              Try Voice Mode
            </Link>
          </div>
        </motion.div>

        {/* ── Demo Presets ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.12 }}
          className="flex flex-wrap items-center justify-center gap-2"
        >
          <span className="font-mono text-[10px] text-muted-foreground/40 tracking-widest uppercase">
            Try a demo:
          </span>
          {DEMO_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => handlePreset(p.input)}
              disabled={isLoading}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1 rounded-full border font-mono text-xs transition-all hover:scale-105 disabled:opacity-40",
                p.color
              )}
            >
              {p.label}
              <span className="opacity-50 text-[10px]">{p.tag}</span>
            </button>
          ))}
        </motion.div>

        {/* ── Mode Selector ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.18 }}
          className="w-full max-w-3xl"
        >
          <div className="flex flex-wrap gap-1.5 p-1.5 bg-card/40 border border-border/40 rounded-xl backdrop-blur-sm">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs tracking-wide transition-all duration-200 flex-1 justify-center md:flex-none",
                  mode === m.id
                    ? "bg-primary text-primary-foreground shadow-[0_0_14px_rgba(0,255,255,0.25)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                {m.icon}
                <span className="hidden sm:inline">{m.label}</span>
              </button>
            ))}
          </div>
          <p className="mt-1.5 pl-1 font-mono text-[10px] text-muted-foreground/40 tracking-wider">
            {activeMode.description}
          </p>
        </motion.div>

        {/* ── Search ── */}
        <motion.form
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          onSubmit={handleAnalyze}
          className="w-full max-w-3xl"
        >
          <div className="flex gap-3">
            <div className="flex-1 flex items-center bg-card/60 border border-border/50 rounded-xl backdrop-blur-md focus-within:border-primary/50 focus-within:shadow-[0_0_24px_rgba(0,255,255,0.1)] transition-all">
              <Terminal className="w-4 h-4 text-primary ml-4 shrink-0" />
              {activeMode.prefix && (
                <span className="font-mono text-primary text-base ml-2 select-none">{activeMode.prefix}</span>
              )}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={activeMode.placeholder}
                className="flex-1 bg-transparent border-none text-foreground font-mono placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0 px-3 py-4 text-sm md:text-base"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest px-7 py-4 rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_20px_rgba(0,255,255,0.2)] hover:shadow-[0_0_32px_rgba(0,255,255,0.35)]"
            >
              {isLoading ? (
                <><Activity className="w-4 h-4 animate-spin" /><span className="hidden sm:inline">Scanning</span></>
              ) : (
                <><Search className="w-4 h-4" /><span className="hidden sm:inline">Analyze</span></>
              )}
            </button>
          </div>
        </motion.form>

        {/* ── Error ── */}
        <AnimatePresence>
          {isError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full max-w-3xl"
            >
              <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-5 rounded-xl flex items-start gap-3">
                <AlertOctagon className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold font-mono">Analysis Failed</h3>
                  <p className="font-mono text-sm opacity-80 mt-0.5">
                    Check your input and try again, or the analysis service may be temporarily unavailable.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Loading ── */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-3xl flex flex-col items-center py-10 gap-4"
            >
              <div className="w-full h-px bg-border/40 rounded-full relative overflow-hidden">
                <motion.div
                  className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent"
                  animate={{ left: ["-33%", "100%"] }}
                  transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity }}
                />
              </div>
              <p className="font-mono text-primary animate-pulse tracking-widest uppercase text-xs">
                Aggregating Threat Intelligence...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Results ── */}
        <AnimatePresence>
          {results && !isLoading && !isError && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="w-full space-y-4"
            >

              {/* ─ Verdict Card ─ */}
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.08 }}
                className={cn(
                  "rounded-2xl border bg-card/50 backdrop-blur-md p-6 md:p-8",
                  VERDICT_BORDER[results.verdict],
                  VERDICT_GLOW[results.verdict]
                )}
              >
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                  <div className="shrink-0">
                    <ScoreGauge score={results.score} />
                  </div>
                  <div className="flex-1 min-w-0 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-1 font-mono text-[10px] text-muted-foreground/50 tracking-widest uppercase">
                      <Terminal className="w-3 h-3" />
                      Analysis Complete · {results.input_type?.replace(/_/g, " ")}
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                      {VERDICT_ICON[results.verdict]}
                      <h2 className={cn("text-3xl md:text-4xl font-black tracking-tight", VERDICT_COLOR[results.verdict])}>
                        {results.verdict}
                      </h2>
                    </div>
                    <p className="font-mono text-sm text-muted-foreground leading-relaxed mb-3 max-w-xl mx-auto md:mx-0">
                      {results.summary}
                    </p>
                    {results.verdict_explanation && (
                      <p className="font-mono text-xs text-muted-foreground/60 italic leading-relaxed mb-4 max-w-xl mx-auto md:mx-0 border-l-2 border-primary/25 pl-3">
                        {results.verdict_explanation}
                      </p>
                    )}
                    <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-2">
                      <span className="px-2.5 py-1 rounded-full bg-background/50 border border-border/40 text-muted-foreground font-mono text-[10px] tracking-widest">
                        CONFIDENCE: {results.confidence.toUpperCase()}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-background/50 border border-border/40 text-muted-foreground font-mono text-[10px] max-w-[200px] truncate">
                        INPUT: {results.input}
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-muted-foreground/30 text-center md:text-left">
                      Assessment based on public web evidence. Always verify independently.
                    </p>
                  </div>
                </div>

                {/* Warning Chips */}
                {warningChips.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-white/5">
                    {warningChips.map((chip) => (
                      <span
                        key={chip.id}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border font-mono text-xs font-semibold tracking-wide",
                          chip.severity === "high"
                            ? "border-red-500/40 bg-red-500/10 text-red-400"
                            : chip.severity === "medium"
                            ? "border-orange-400/40 bg-orange-400/10 text-orange-400"
                            : "border-yellow-400/40 bg-yellow-400/10 text-yellow-400"
                        )}
                      >
                        {chip.icon}
                        {chip.label}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* ─ Signals Row ─ */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SignalPanel
                  title="Risk Signals"
                  icon={<AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                  signals={results.risk_signals}
                  type="risk"
                  delay={0.18}
                />
                <SignalPanel
                  title="Trust Signals"
                  icon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                  signals={results.positive_signals}
                  type="positive"
                  delay={0.22}
                />
                <SignalPanel
                  title="Missing Signals"
                  icon={<MinusCircle className="w-3.5 h-3.5 text-yellow-400" />}
                  signals={results.missing_signals}
                  type="missing"
                  delay={0.26}
                />
              </div>

              {/* ─ Safety Actions ─ */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-md p-5"
              >
                <div className="flex items-center gap-2 mb-4 font-mono text-[10px] text-muted-foreground/50 tracking-widest uppercase">
                  <Lock className="w-3.5 h-3.5 text-primary" />
                  Safety Actions
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {safetyActions.map((action, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-start gap-3 px-3.5 py-2.5 rounded-xl border text-xs font-mono",
                        action.critical
                          ? "border-red-500/30 bg-red-500/8 text-red-400"
                          : "border-border/30 bg-background/20 text-muted-foreground"
                      )}
                    >
                      <span className={cn("mt-0.5 shrink-0", action.critical ? "text-red-400" : "text-primary")}>
                        {action.icon}
                      </span>
                      {action.label}
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* ─ Evidence Panel ─ */}
              {results.evidence && results.evidence.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-md p-5"
                >
                  <div className="flex items-center gap-2 mb-4 font-mono text-[10px] text-muted-foreground/50 tracking-widest uppercase">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    Evidence Sources ({results.evidence.length})
                  </div>
                  <div className="space-y-2">
                    {results.evidence.map((item, idx) => {
                      const meta = SOURCE_TYPE_META[item.source_type] ?? SOURCE_TYPE_META.unknown;
                      const impact = IMPACT_META[item.impact] ?? IMPACT_META.neutral;
                      const domain = extractDomain(item.url);
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.38 + idx * 0.035 }}
                          className="flex items-start gap-3 p-3.5 rounded-xl border border-border/25 bg-background/25 hover:bg-background/50 hover:border-border/50 transition-all group"
                        >
                          {/* Impact dot */}
                          <div className="shrink-0 mt-2">
                            <span className={cn("block w-2 h-2 rounded-full", impact.dot)} />
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Badges row */}
                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-mono font-semibold tracking-wider", meta.color)}>
                                {meta.icon}
                                {meta.label}
                              </span>
                              <span className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-mono tracking-wider",
                                item.impact === "positive"
                                  ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-400"
                                  : item.impact === "negative"
                                  ? "border-red-500/25 bg-red-500/8 text-red-400"
                                  : "border-border/25 bg-muted/8 text-muted-foreground"
                              )}>
                                {impact.label}
                              </span>
                              <span className="font-mono text-[10px] text-muted-foreground/40">{domain}</span>
                            </div>

                            {/* Title */}
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-xs text-foreground/75 hover:text-primary transition-colors flex items-center gap-1.5 mb-1.5 group/link"
                            >
                              <span className="line-clamp-1">{item.title || domain}</span>
                              <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                            </a>

                            {/* Reason */}
                            <p className="text-[11px] font-mono text-muted-foreground/60 leading-snug">
                              {item.reason}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ─ How ScamSniff Reached This Verdict ─ */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-md overflow-hidden"
              >
                <button
                  onClick={() => setShowVerdictDetails((v) => !v)}
                  className="w-full flex items-center justify-between px-5 py-4 font-mono text-[10px] text-muted-foreground/50 tracking-widest uppercase hover:text-muted-foreground transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                    How ScamSniff Reached This Verdict
                  </div>
                  {showVerdictDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                <AnimatePresence>
                  {showVerdictDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28 }}
                      className="overflow-hidden"
                    >
                      <VerdictExplainer results={results} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="relative z-10 text-center pb-8 font-mono text-[10px] text-muted-foreground/25 tracking-wider">
        Assessment based on public web evidence · Not financial advice · Always DYOR
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SignalPanel
// ---------------------------------------------------------------------------

interface SignalPanelProps {
  title: string;
  icon: React.ReactNode;
  signals: string[];
  type: "risk" | "positive" | "missing";
  delay: number;
}

function SignalPanel({ title, icon, signals, type, delay }: SignalPanelProps) {
  const rowStyle = {
    risk: "border-red-500/15 bg-red-500/5 text-red-300/90",
    positive: "border-emerald-500/15 bg-emerald-500/5 text-emerald-300/90",
    missing: "border-yellow-400/15 bg-yellow-400/5 text-yellow-300/90",
  }[type];

  const dot = {
    risk: "bg-red-500",
    positive: "bg-emerald-400",
    missing: "bg-yellow-400",
  }[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-md p-4"
    >
      <div className="flex items-center gap-2 mb-3 font-mono text-[10px] text-muted-foreground/50 tracking-widest uppercase">
        {icon}
        {title}
        <span className="ml-auto text-muted-foreground/30">{signals.length}</span>
      </div>
      {signals.length === 0 ? (
        <div className="p-3 rounded-lg border border-dashed border-border/30 text-center">
          <span className="text-[11px] font-mono text-muted-foreground/40">
            {type === "missing" ? "None — good sign" : "None found"}
          </span>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {signals.map((signal, i) => (
            <li
              key={i}
              className={cn(
                "flex items-start gap-2 px-2.5 py-2 rounded-lg border text-[11px] font-mono leading-snug",
                rowStyle
              )}
            >
              <span className={cn("shrink-0 w-1.5 h-1.5 rounded-full mt-1.5", dot)} />
              {signal}
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// VerdictExplainer
// ---------------------------------------------------------------------------

interface ExplainerResults {
  verdict: string;
  score: number;
  confidence: string;
  risk_signals: string[];
  positive_signals: string[];
  missing_signals: string[];
  evidence: Array<{ source_type: string; impact: string }>;
}

function VerdictExplainer({ results }: { results: ExplainerResults }) {
  const credibleCount = results.evidence.filter(
    (e) => e.source_type === "official" || e.source_type === "credible_third_party"
  ).length;
  const negativeCredibleCount = results.evidence.filter(
    (e) =>
      e.impact === "negative" &&
      (e.source_type === "official" || e.source_type === "credible_third_party")
  ).length;
  const communityCount = results.evidence.filter((e) => e.source_type === "user_generated").length;

  const thresholds = [
    { range: "0–15", label: "Low Risk", color: "text-emerald-400" },
    { range: "16–40", label: "Caution", color: "text-yellow-400" },
    { range: "41–65", label: "High Risk", color: "text-orange-400" },
    { range: "66–100", label: "Extreme Risk", color: "text-red-500" },
  ];

  return (
    <div className="px-5 pb-5 space-y-5 border-t border-border/20 pt-4">
      {/* Stats */}
      <div>
        <p className="font-mono text-[10px] text-muted-foreground/40 tracking-widest uppercase mb-3">
          Scoring Breakdown
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: "Sources found", value: results.evidence.length },
            { label: "Credible sources", value: credibleCount },
            { label: "Risk from credible", value: negativeCredibleCount },
            { label: "Community posts", value: communityCount },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl border border-border/30 bg-background/20 px-3 py-3 text-center"
            >
              <div className="font-mono text-2xl font-bold text-primary">{value}</div>
              <div className="font-mono text-[10px] text-muted-foreground/50 mt-0.5 leading-snug">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Verdict scale */}
      <div>
        <p className="font-mono text-[10px] text-muted-foreground/40 tracking-widest uppercase mb-3">
          Verdict Thresholds
        </p>
        <div className="flex flex-wrap gap-2">
          {thresholds.map((t) => (
            <div
              key={t.label}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/25 bg-background/20 font-mono text-xs",
                results.verdict === t.label ? "border-primary/30 bg-primary/5" : ""
              )}
            >
              <span className="text-muted-foreground/40">{t.range}</span>
              <span className={cn("font-semibold", t.color)}>{t.label}</span>
              {results.verdict === t.label && (
                <span className="text-[9px] text-primary tracking-widest uppercase">← your result</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Methodology */}
      <div className="rounded-xl border border-border/25 bg-background/15 p-4 space-y-2.5 font-mono text-[11px] text-muted-foreground/60 leading-relaxed">
        <p>
          <span className="text-foreground/50 font-semibold">Source weighting:</span>{" "}
          Evidence from official sources and credible crypto media (CoinDesk, CoinTelegraph, audit firms like CertiK and Halborn) is weighted 1.4–1.5×. Community posts from Reddit or X carry only 0.4× weight to limit noise.
        </p>
        <p>
          <span className="text-foreground/50 font-semibold">Signal detection:</span>{" "}
          The engine scans all {results.evidence.length} sources against {">"}30 risk patterns (rug pull, fraud allegations, criminal sentencing) and {">"}6 trust patterns (audits, whitepapers, open-source code).
        </p>
        <p>
          <span className="text-foreground/50 font-semibold">Footprint penalty:</span>{" "}
          Legitimate projects leave a verifiable web presence. The absence of an official site, GitHub, or third-party coverage adds modest risk points.
        </p>
        <p>
          <span className="text-foreground/50 font-semibold">Confidence ({results.confidence}):</span>{" "}
          {results.confidence === "High"
            ? "Multiple credible independent sources corroborate the verdict."
            : results.confidence === "Medium"
            ? "Some credible sources found, but the picture is incomplete."
            : "Limited public data was available — treat as preliminary."}
        </p>
      </div>
    </div>
  );
}
