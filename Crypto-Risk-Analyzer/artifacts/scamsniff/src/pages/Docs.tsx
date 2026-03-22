import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  ArrowLeft,
  Activity,
  Zap,
  Layers,
  BookOpen,
  Globe,
  Twitter,
  Search,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  AlertTriangle,
  Mic,
  Terminal,
  Eye,
  Lock,
  GitBranch,
  FileText,
  Users,
  HelpCircle,
} from "lucide-react";

const section = "w-full max-w-3xl";
const card = "rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-6 space-y-4";
const h2 = "text-lg font-black font-mono tracking-tight text-foreground uppercase";
const h3 = "text-sm font-bold font-mono text-primary uppercase tracking-wider";
const body = "font-mono text-sm text-muted-foreground leading-relaxed";
const tag = "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-mono text-xs font-semibold";

function Divider() {
  return <div className="w-full h-px bg-border/30" />;
}

export default function Docs() {
  return (
    <div className="min-h-screen w-full relative bg-background">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[700px] h-[500px] bg-primary/4 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[400px] bg-accent/4 rounded-full blur-[120px]" />
      </div>

      <main className="relative z-10 max-w-3xl mx-auto px-4 py-10 md:py-14 flex flex-col items-center gap-6">

        {/* Back */}
        <div className="w-full">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground hover:text-primary transition-colors tracking-wider"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Scanner
          </Link>
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center w-full"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-primary/10 border border-primary/30 text-primary font-mono text-xs tracking-widest">
            <Activity className="w-3 h-3 animate-pulse" />
            SCAMSNIFF DOCS // V3.0.0
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-white to-accent uppercase mb-2">
            How It Works
          </h1>
          <p className={body + " max-w-xl mx-auto"}>
            Everything you need to know to get the most out of ScamSniff — from what it analyses to how it reaches a verdict.
          </p>
        </motion.div>

        <Divider />

        {/* ── What is ScamSniff ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className={section}
        >
          <div className={card}>
            <p className={h2}>What is ScamSniff?</p>
            <p className={body}>
              ScamSniff is an on-chain threat intelligence tool. You give it a crypto project name, token symbol,
              website URL, or X/Twitter handle and it scours the public web for signals — news coverage, GitHub
              activity, security audits, scam reports, and more — then distils everything into a single risk score
              and a plain-English verdict.
            </p>
            <p className={body}>
              It does <span className="text-foreground font-semibold">not</span> require a wallet connection, does not store
              your searches, and does not give financial advice. Think of it as a fast background check before you
              commit real money.
            </p>
          </div>
        </motion.section>

        {/* ── Analysis Modes ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className={section}
        >
          <div className={card}>
            <p className={h2}>Analysis Modes</p>
            <p className={body}>
              Choose the mode that matches your input for the sharpest results. All modes share the same scoring
              engine — they differ only in which search queries are prioritised.
            </p>

            <div className="space-y-4 pt-1">
              {[
                {
                  icon: <Zap className="w-4 h-4 text-primary" />,
                  label: "Fast Check",
                  desc: "The all-purpose mode. Accepts any input — project name, URL, token ticker, or @handle. Good when you're not sure which category applies.",
                  tip: "Best for: quick gut-check before clicking a link or joining a Telegram.",
                },
                {
                  icon: <Layers className="w-4 h-4 text-primary" />,
                  label: "Deep Dive",
                  desc: "Runs a broader set of queries focused on in-depth investigation: team background, court records, security audits, and credible news coverage.",
                  tip: "Best for: projects you're seriously considering investing in.",
                },
                {
                  icon: <BookOpen className="w-4 h-4 text-primary" />,
                  label: "Token Check",
                  desc: "Optimised for ERC-20 tokens and meme coins. Prioritises token-specific searches: contract audits, liquidity lock status, rug-pull reports.",
                  tip: "Best for: new meme coins, micro-cap launches, airdrop tokens.",
                },
                {
                  icon: <Globe className="w-4 h-4 text-primary" />,
                  label: "Website Check",
                  desc: "Enter a full URL (e.g. https://projectsite.xyz). ScamSniff extracts the domain, checks for domain-specific scam reports, phishing blacklists, and cross-references the team/docs.",
                  tip: "Best for: clicking a link you received and want to verify.",
                },
                {
                  icon: <Twitter className="w-4 h-4 text-primary" />,
                  label: "X Account",
                  desc: "Enter an @handle (with or without the @). Searches for impersonation reports, account age warnings, and whether the account is linked to a verified project.",
                  tip: "Best for: DMs from crypto projects, new accounts promoting tokens.",
                },
              ].map((m) => (
                <div key={m.label} className="flex gap-3 pt-3 border-t border-border/30 first:border-t-0 first:pt-0">
                  <div className="shrink-0 mt-0.5 w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    {m.icon}
                  </div>
                  <div>
                    <p className="font-mono text-sm font-bold text-foreground mb-0.5">{m.label}</p>
                    <p className={body + " mb-1"}>{m.desc}</p>
                    <p className="font-mono text-[11px] text-primary/60 italic">{m.tip}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── Verdicts ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={section}
        >
          <div className={card}>
            <p className={h2}>Risk Verdicts</p>
            <p className={body}>
              Every analysis ends with one of four verdicts. Scores run from 0 (clean) to 100+ (severe risk).
            </p>

            <div className="space-y-3 pt-1">
              {[
                {
                  icon: <ShieldCheck className="w-4 h-4" />,
                  verdict: "Low Risk",
                  range: "0 – 15",
                  color: "border-emerald-400/40 bg-emerald-400/10 text-emerald-400",
                  desc: "Strong positive signals across multiple credible sources — official site, active GitHub, security audits, credible media coverage. Still do your own research before committing funds.",
                },
                {
                  icon: <ShieldAlert className="w-4 h-4" />,
                  verdict: "Caution",
                  range: "16 – 40",
                  color: "border-yellow-400/40 bg-yellow-400/10 text-yellow-400",
                  desc: "Some positive signals but missing key legitimacy markers (GitHub, docs, audits) or has minor community-level concerns. Investigate further before acting.",
                },
                {
                  icon: <ShieldAlert className="w-4 h-4" />,
                  verdict: "High Risk",
                  range: "41 – 65",
                  color: "border-orange-400/40 bg-orange-400/10 text-orange-400",
                  desc: "Credible negative coverage, multiple missing signals, or patterns consistent with known scams. Treat with significant caution.",
                },
                {
                  icon: <ShieldOff className="w-4 h-4" />,
                  verdict: "Extreme Risk",
                  range: "66+",
                  color: "border-red-500/40 bg-red-500/10 text-red-400",
                  desc: "Criminal conviction, SEC enforcement, or multiple verified scam reports from credible sources. Avoid entirely.",
                },
              ].map((v) => (
                <div key={v.verdict} className="flex items-start gap-3">
                  <span className={tag + " " + v.color + " shrink-0 mt-0.5"}>
                    {v.icon}
                    {v.verdict}
                  </span>
                  <div className="flex-1">
                    <p className="font-mono text-[10px] text-muted-foreground/50 mb-0.5">Score: {v.range}</p>
                    <p className={body}>{v.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── How Scoring Works ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className={section}
        >
          <div className={card}>
            <p className={h2}>How Scoring Works</p>
            <p className={body}>
              ScamSniff fetches up to 12 public web sources per query, then runs each result through a two-layer analysis.
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <p className={h3}>1 · Starting baseline</p>
                <p className={body}>
                  Every analysis starts with a small positive risk baseline (10–16 points depending on input type) to
                  prevent unknown projects with zero web presence from scoring deceptively clean.
                </p>
              </div>
              <Divider />
              <div>
                <p className={h3}>2 · Per-source evidence</p>
                <p className={body}>
                  Each source is classified by type and cross-referenced for signals in its title, description, and the
                  first paragraph of its content:
                </p>
                <ul className="mt-2 space-y-1.5">
                  {[
                    { icon: <Globe className="w-3 h-3" />, label: "Official", color: "border-primary/30 bg-primary/10 text-primary", desc: "Project's own domain — official site, GitHub, docs." },
                    { icon: <FileText className="w-3 h-3" />, label: "Credible", color: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400", desc: "CoinDesk, Reuters, Chainalysis, SEC.gov, CertiK, etc." },
                    { icon: <Users className="w-3 h-3" />, label: "Community", color: "border-yellow-400/30 bg-yellow-400/10 text-yellow-400", desc: "Reddit, Twitter threads, Telegram — useful but weighted lower." },
                    { icon: <HelpCircle className="w-3 h-3" />, label: "Unknown", color: "border-border bg-muted/20 text-muted-foreground", desc: "Unclassified sources. Still counted but with reduced weight." },
                  ].map((s) => (
                    <li key={s.label} className="flex items-start gap-2">
                      <span className={tag + " " + s.color + " shrink-0 mt-0.5"}>{s.icon}{s.label}</span>
                      <p className={body}>{s.desc}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <Divider />
              <div>
                <p className={h3}>3 · Structural bonuses</p>
                <p className={body}>
                  Finding an active GitHub repo, published documentation, a security audit, or coverage from credible
                  media reduces the score. Missing these markers increases it.
                </p>
              </div>
              <Divider />
              <div>
                <p className={h3}>4 · Score floors</p>
                <p className={body}>
                  Certain findings set a hard minimum score that legitimacy bonuses cannot cancel. A credible report of
                  criminal conviction sets a minimum of 66 (Extreme Risk), regardless of how many positive signals exist.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── Evidence Panel ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className={section}
        >
          <div className={card}>
            <p className={h2}>Reading the Evidence Panel</p>
            <p className={body}>
              After every analysis, a collapsible evidence panel shows every source that contributed to the score.
            </p>

            <div className="space-y-3 pt-1">
              {[
                {
                  icon: <Eye className="w-4 h-4 text-primary" />,
                  label: "Impact column",
                  desc: 'Each source is labelled Trust ↑ (reduces risk), Risk ↑ (increases risk), or Neutral. The colour-coded dot matches: green = positive, red = negative, grey = neutral.',
                },
                {
                  icon: <AlertTriangle className="w-4 h-4 text-primary" />,
                  label: "Risk signals",
                  desc: "Specific phrases that triggered risk scoring — e.g. 'rug pull confirmed', 'exit scam', 'SEC indictment'. These appear in the Signals panel below the verdict.",
                },
                {
                  icon: <ShieldCheck className="w-4 h-4 text-primary" />,
                  label: "Positive signals",
                  desc: "Signals that reduced the score — e.g. 'security audit by CertiK', 'open-source codebase', 'regulated exchange'. Listed under Legitimacy Indicators.",
                },
                {
                  icon: <ShieldOff className="w-4 h-4 text-primary" />,
                  label: "Missing signals",
                  desc: "Legitimacy markers ScamSniff couldn't find — no official website, no GitHub, no documentation. These increase the score by default.",
                },
              ].map((item) => (
                <div key={item.label} className="flex gap-3 pt-3 border-t border-border/30 first:border-t-0 first:pt-0">
                  <div className="shrink-0 mt-0.5 w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-mono text-sm font-bold text-foreground mb-0.5">{item.label}</p>
                    <p className={body}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── Voice Mode ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          className={section}
        >
          <div className={card}>
            <p className={h2}>Voice Mode</p>
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5 w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                <Mic className="w-4 h-4 text-accent" />
              </div>
              <div className="space-y-2">
                <p className={body}>
                  Voice Mode lets you speak your query and receive a spoken risk verdict — powered by an AI voice agent.
                  Say something like: <span className="text-foreground italic">"Check SafeMoon for me"</span> or{" "}
                  <span className="text-foreground italic">"Is Uniswap legit?"</span>
                </p>
                <p className={body}>
                  <span className="text-yellow-400 font-semibold">Important:</span> The microphone requires your browser's
                  microphone permission. If you're viewing the app inside Replit's preview panel, open it in a new browser tab
                  instead — the embedded iframe blocks mic access.
                </p>
                <Link
                  href="/voice"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent font-mono text-xs tracking-wider hover:bg-accent/20 transition-colors"
                >
                  <Mic className="w-3.5 h-3.5" />
                  Open Voice Mode
                </Link>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── Tips ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36 }}
          className={section}
        >
          <div className={card}>
            <p className={h2}>Tips for Best Results</p>
            <ul className="space-y-2.5">
              {[
                { icon: <Terminal className="w-3.5 h-3.5" />, tip: 'Use the project\'s common name, not the token ticker alone. "SafeMoon" gives richer results than "SFM".' },
                { icon: <Globe className="w-3.5 h-3.5" />, tip: "For website checks, include the full URL (https://...) so the scorer can also cross-reference domain-specific scam reports." },
                { icon: <Twitter className="w-3.5 h-3.5" />, tip: 'For X accounts, the @ prefix is optional — ScamSniff adds it automatically in X Account mode.' },
                { icon: <Search className="w-3.5 h-3.5" />, tip: "If a result looks wrong, try the Deep Dive mode — it runs broader queries and may surface coverage Fast Check missed." },
                { icon: <Lock className="w-3.5 h-3.5" />, tip: "ScamSniff analyses public web signals only. It cannot inspect smart contract code directly — always review audits from CertiK, Halborn, or Trail of Bits for on-chain safety." },
                { icon: <GitBranch className="w-3.5 h-3.5" />, tip: "A Low Risk verdict is not an endorsement. Always verify the official site, GitHub, and team credentials independently before sending funds." },
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="shrink-0 mt-0.5 w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    {t.icon}
                  </span>
                  <p className={body}>{t.tip}</p>
                </li>
              ))}
            </ul>
          </div>
        </motion.section>

        {/* ── Limitations ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={section}
        >
          <div className={card + " border-yellow-400/20 bg-yellow-400/5"}>
            <p className={h2 + " text-yellow-400"}>Known Limitations</p>
            <ul className="space-y-2">
              {[
                "Very new projects (< 1 week old) have little web footprint and may score higher than deserved — use Caution as the baseline for anything brand-new.",
                "Well-disguised scams that have not yet been publicly reported will score low until coverage appears.",
                "SafeMoon and similar convicted projects score Caution (not Extreme Risk) when searched by domain URL alone — search by project name for full conviction evidence to surface.",
                "Analysis typically takes 5–15 seconds depending on server load. If it times out, try again.",
              ].map((l, i) => (
                <li key={i} className="flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                  <p className={body}>{l}</p>
                </li>
              ))}
            </ul>
          </div>
        </motion.section>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.44 }}
          className="text-center pb-6"
        >
          <p className="font-mono text-[10px] text-muted-foreground/30 tracking-widest uppercase">
            ScamSniff is for informational purposes only. Not financial advice.
          </p>
        </motion.div>

      </main>
    </div>
  );
}
