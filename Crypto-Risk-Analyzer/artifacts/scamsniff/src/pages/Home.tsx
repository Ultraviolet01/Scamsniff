import { useState } from "react";
import { useAnalyzeProject } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ShieldAlert,
  ShieldCheck,
  Activity,
  AlertOctagon,
  Terminal,
  MinusCircle,
  ExternalLink,
  Globe,
  Users,
  FileText,
  HelpCircle,
  AlertCircle,
  Mic,
} from "lucide-react";
import { Link } from "wouter";
import { ScoreGauge } from "@/components/ScoreGauge";
import { SignalList } from "@/components/SignalList";
import { cn, getRiskColor } from "@/lib/utils";

/* Map source_type values to human labels and badge styles */
const SOURCE_TYPE_META: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  official: {
    label: "Official",
    color: "bg-primary/15 text-primary border-primary/30",
    icon: <Globe className="w-3 h-3" />,
  },
  credible_third_party: {
    label: "Credible",
    color: "bg-success/15 text-success border-success/30",
    icon: <FileText className="w-3 h-3" />,
  },
  user_generated: {
    label: "Community",
    color: "bg-warning/15 text-warning border-warning/30",
    icon: <Users className="w-3 h-3" />,
  },
  suspicious_or_low_quality: {
    label: "Suspicious",
    color: "bg-destructive/15 text-destructive border-destructive/30",
    icon: <AlertCircle className="w-3 h-3" />,
  },
  unknown: {
    label: "Unknown",
    color: "bg-muted/30 text-muted-foreground border-border",
    icon: <HelpCircle className="w-3 h-3" />,
  },
};

const IMPACT_DOT: Record<string, string> = {
  positive: "bg-success shadow-[0_0_6px_currentColor] text-success",
  negative: "bg-destructive shadow-[0_0_6px_currentColor] text-destructive",
  neutral: "bg-muted-foreground",
};

export default function Home() {
  const [input, setInput] = useState("");
  const mutation = useAnalyzeProject();

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    mutation.mutate({ data: { input: input.trim() } });
  };

  const results = mutation.data;
  const isError = mutation.isError;
  const isLoading = mutation.isPending;

  return (
    <div className="min-h-screen w-full relative">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img
          src={`${import.meta.env.BASE_URL}images/cyber-bg.png`}
          alt=""
          className="w-full h-full object-cover opacity-20 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
      </div>

      <main className="relative z-10 max-w-6xl mx-auto px-4 py-12 md:py-24 flex flex-col items-center">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12 w-full max-w-3xl"
        >
          <div className="inline-flex items-center justify-center gap-2 px-3 py-1 mb-6 rounded-full bg-primary/10 border border-primary/30 text-primary font-mono text-xs tracking-wider">
            <Activity className="w-3 h-3 animate-pulse" />
            SYSTEM ONLINE // V3.0.0
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-white to-accent drop-shadow-lg uppercase">
            ScamSniff
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl font-mono max-w-2xl mx-auto leading-relaxed">
            Enter a crypto project name, URL, token, or X handle.
            Our engine scans the web for risk signals, rug pulls, and exploits.
          </p>
          <div className="mt-6">
            <Link href="/voice" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary font-mono text-xs tracking-wider hover:bg-primary/20 transition-colors">
              <Mic className="w-3.5 h-3.5" />
              Try Voice Mode
            </Link>
          </div>
        </motion.div>

        {/* Input Form */}
        <motion.form
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleAnalyze}
          className="w-full max-w-3xl mb-16 relative group"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-accent rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-500" />
          <div className="relative flex flex-col md:flex-row gap-3 bg-card/90 backdrop-blur-xl p-2 rounded-xl border border-border/50 shadow-2xl">
            <div className="relative flex-1 flex items-center">
              <Terminal className="absolute left-4 w-5 h-5 text-primary/50" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Target identifier (e.g., https://..., @handle, $TOKEN)"
                className="w-full bg-transparent border-none text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-0 pl-12 pr-4 py-4 text-base md:text-lg"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest px-8 py-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Activity className="w-5 h-5 animate-spin" />
                  <span>Scanning</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span>Analyze</span>
                </>
              )}
            </button>
          </div>
        </motion.form>

        {/* Error */}
        <AnimatePresence>
          {isError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full max-w-3xl mb-8"
            >
              <div className="bg-destructive/10 border border-destructive/50 text-destructive p-6 rounded-xl flex items-start gap-4">
                <AlertOctagon className="w-6 h-6 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-lg">System Error</h3>
                  <p className="font-mono text-sm opacity-80 mt-1">
                    Failed to complete analysis. Try again or check your input.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-3xl flex flex-col items-center justify-center py-12"
            >
              <div className="w-64 h-1 bg-border rounded-full relative overflow-hidden mb-4">
                <div className="absolute top-0 bottom-0 w-1/3 bg-primary animate-[scan_1.5s_ease-in-out_infinite_alternate]" style={{ left: "-33%" }} />
              </div>
              <p className="font-mono text-primary animate-pulse tracking-widest uppercase text-sm">
                Aggregating Threat Data...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {results && !isLoading && !isError && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="w-full max-w-5xl space-y-6"
            >

              {/* Verdict + Score row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Verdict card */}
                <div className="md:col-span-2 bg-card/50 backdrop-blur-md border border-border rounded-2xl p-8 shadow-xl flex flex-col justify-center relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-${getRiskColor(results.score)}/10 blur-3xl rounded-full`} />
                  <div className="flex items-center gap-2 text-muted-foreground font-mono text-sm mb-4">
                    <Terminal className="w-4 h-4" />
                    Target: <span className="text-foreground ml-1">{results.input}</span>
                  </div>
                  <h2 className={cn(
                    "text-5xl md:text-6xl font-black uppercase tracking-tight mb-6",
                    `text-${getRiskColor(results.score)} drop-shadow-[0_0_12px_currentColor]`
                  )}>
                    {results.verdict}
                  </h2>
                  <p className="text-foreground/80 font-mono text-sm leading-relaxed border-l-2 border-primary/50 pl-4 py-1">
                    {results.summary}
                  </p>
                  <p className="mt-3 text-[11px] font-mono text-muted-foreground/60 italic">
                    Assessment based on available public web evidence
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 bg-background/50 border border-border px-3 py-1.5 rounded text-xs font-mono">
                    <span className="text-muted-foreground">Confidence:</span>
                    <span className={cn(
                      "font-bold uppercase",
                      results.confidence === "High" ? "text-success" :
                      results.confidence === "Medium" ? "text-warning" : "text-destructive"
                    )}>
                      {results.confidence}
                    </span>
                  </div>
                </div>

                {/* Score gauge */}
                <div className="bg-card/50 backdrop-blur-md border border-border rounded-2xl p-8 shadow-xl flex flex-col items-center justify-center">
                  <ScoreGauge score={results.score} />
                </div>
              </div>

              {/* Three signal columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Threat signals */}
                <div className="bg-card/30 backdrop-blur-md border border-border rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border/50">
                    <div className="p-2 bg-destructive/10 rounded-lg">
                      <ShieldAlert className="w-4 h-4 text-destructive" />
                    </div>
                    <h3 className="font-bold text-sm text-destructive uppercase tracking-widest">
                      Threat Signals
                    </h3>
                  </div>
                  <SignalList type="risk" signals={results.risk_signals} />
                </div>

                {/* Safe signals */}
                <div className="bg-card/30 backdrop-blur-md border border-border rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border/50">
                    <div className="p-2 bg-success/10 rounded-lg">
                      <ShieldCheck className="w-4 h-4 text-success" />
                    </div>
                    <h3 className="font-bold text-sm text-success uppercase tracking-widest">
                      Trust Signals
                    </h3>
                  </div>
                  <SignalList type="positive" signals={results.positive_signals} />
                </div>

                {/* Missing signals */}
                <div className="bg-card/30 backdrop-blur-md border border-border rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border/50">
                    <div className="p-2 bg-warning/10 rounded-lg">
                      <MinusCircle className="w-4 h-4 text-warning" />
                    </div>
                    <h3 className="font-bold text-sm text-warning uppercase tracking-widest">
                      {results.input_type === "x_handle"
                        ? "Unverified Links"
                        : results.input_type === "website_url"
                        ? "Missing Trust Elements"
                        : "Missing Signals"}
                    </h3>
                  </div>
                  <SignalList type="missing" signals={results.missing_signals} />
                </div>
              </div>

              {/* Evidence panel */}
              {results.evidence && results.evidence.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="bg-card/30 backdrop-blur-md border border-border rounded-2xl p-6 shadow-lg"
                >
                  <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-widest mb-5 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Evidence Sources
                  </h3>
                  <div className="space-y-3">
                    {results.evidence.map((item, idx) => {
                      const meta = SOURCE_TYPE_META[item.source_type] ?? SOURCE_TYPE_META.unknown;
                      const dot = IMPACT_DOT[item.impact] ?? IMPACT_DOT.neutral;
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.9 + idx * 0.05 }}
                          className="flex items-start gap-3 p-3 rounded-lg border border-border/40 bg-background/40 hover:bg-background/70 transition-colors"
                        >
                          {/* Impact dot */}
                          <div className="mt-1.5 shrink-0">
                            <span className={`block w-2 h-2 rounded-full ${dot}`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              {/* Source type badge */}
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-mono font-semibold tracking-wider ${meta.color}`}>
                                {meta.icon}
                                {meta.label}
                              </span>
                              {/* Title link */}
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-xs text-foreground/80 hover:text-primary truncate flex items-center gap-1 transition-colors"
                              >
                                {item.title || item.url}
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                            </div>
                            {/* Reason */}
                            <p className="text-[11px] font-mono text-muted-foreground leading-snug">
                              {item.reason}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}
