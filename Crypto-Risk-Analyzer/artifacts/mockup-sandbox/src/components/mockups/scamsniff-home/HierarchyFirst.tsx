import { useState } from "react";
import { Search, Zap, Layers, BookOpen, Globe, Twitter, Mic, ShieldCheck, ShieldAlert, ShieldOff } from "lucide-react";

const MODES = [
  { id: "fast", label: "Fast Check", icon: <Zap className="w-3.5 h-3.5" />, desc: "Quick scan across all sources" },
  { id: "deep", label: "Deep Dive", icon: <Layers className="w-3.5 h-3.5" />, desc: "Full multi-source investigation" },
  { id: "token", label: "Token Check", icon: <BookOpen className="w-3.5 h-3.5" />, desc: "ERC-20 & meme coins" },
  { id: "website", label: "Website", icon: <Globe className="w-3.5 h-3.5" />, desc: "Domain & team analysis" },
  { id: "xaccount", label: "X Account", icon: <Twitter className="w-3.5 h-3.5" />, desc: "X/Twitter risk scan" },
];

const EXAMPLES = [
  { label: "SafeMoon", verdict: "High Risk", color: "text-orange-400 border-orange-500/30 bg-orange-500/5" },
  { label: "Uniswap", verdict: "Low Risk", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5" },
  { label: "MoonPumpXYZ", verdict: "Extreme Risk", color: "text-red-400 border-red-500/30 bg-red-500/5" },
];

export function HierarchyFirst() {
  const [mode, setMode] = useState("fast");
  const [query, setQuery] = useState("");

  return (
    <div className="min-h-screen bg-[#050a0a] flex flex-col font-mono">

      {/* Tier 0 — Navigation (smallest, purely functional) */}
      <nav className="flex items-center justify-between px-6 py-3 border-b border-white/5">
        <span className="text-[11px] tracking-[0.2em] text-[#00e5cc]/50 uppercase">ScamSniff</span>
        <button className="flex items-center gap-1.5 text-[11px] text-[#00e5cc]/40 hover:text-[#00e5cc]/70 transition-colors">
          <Mic className="w-3 h-3" />
          Voice Mode
        </button>
      </nav>

      <main className="flex-1 flex flex-col items-center px-6 py-14 gap-12">

        {/* Tier 1 — Primary Question (largest, most prominent) */}
        <div className="text-center max-w-xl">
          <h1 className="text-5xl font-black tracking-tight leading-tight mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00e5cc] to-[#cc44ff]">
              Is it a scam?
            </span>
          </h1>
          <p className="text-[15px] text-white/35 leading-relaxed">
            On-chain threat intelligence for crypto projects, tokens, URLs, and X accounts.
          </p>
        </div>

        {/* Tier 2 — Primary Action (most interactive, second-largest) */}
        <div className="w-full max-w-2xl flex flex-col gap-3">

          {/* Mode selector — compact row, secondary weight */}
          <div className="flex gap-1.5 flex-wrap">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide transition-all ${
                  mode === m.id
                    ? "bg-[#00e5cc]/15 text-[#00e5cc] border border-[#00e5cc]/40"
                    : "text-white/30 border border-white/8 hover:border-white/20 hover:text-white/55"
                }`}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>

          {/* Active mode description — tertiary hint */}
          <p className="text-[11px] text-white/25 pl-1">
            {MODES.find((m) => m.id === mode)?.desc}
          </p>

          {/* Input — dominant element in this tier */}
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#00e5cc]/20 to-[#cc44ff]/20 blur-md opacity-60" />
            <div className="relative flex items-center bg-[#0c1a1a] border border-[#00e5cc]/30 rounded-xl overflow-hidden focus-within:border-[#00e5cc]/70 transition-colors">
              <Search className="w-4.5 h-4.5 text-[#00e5cc]/50 ml-4 shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={MODES.find((m) => m.id === mode)?.desc}
                className="flex-1 bg-transparent px-3 py-4 text-[15px] text-white/90 placeholder:text-white/20 outline-none"
              />
              <button className="m-1.5 px-6 py-2.5 rounded-lg bg-[#00e5cc] text-[#050a0a] font-black text-[13px] tracking-widest uppercase hover:bg-[#00e5cc]/90 transition-all active:scale-95 shrink-0">
                Analyze
              </button>
            </div>
          </div>
        </div>

        {/* Tier 3 — Examples (smallest, tertiary weight) */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-[10px] tracking-[0.18em] text-white/20 uppercase">Try an example</p>
          <div className="flex gap-2 flex-wrap justify-center">
            {EXAMPLES.map((e) => (
              <button
                key={e.label}
                onClick={() => setQuery(e.label)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-all hover:opacity-90 ${e.color}`}
              >
                {e.label}
                <span className="text-[10px] opacity-60">{e.verdict}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Divider — result zone preview */}
        <div className="w-full max-w-2xl border-t border-white/5 pt-10">
          <div className="text-center">
            {/* Mock result card — shows what results look like */}
            <div className="bg-[#0c1a1a] border border-emerald-500/20 rounded-2xl p-6 text-left shadow-[0_0_60px_rgba(52,211,153,0.08)]">
              {/* Tier A — Verdict (most important result) */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[11px] text-white/30 tracking-widest uppercase mb-0.5">Verdict</p>
                  <p className="text-2xl font-black text-emerald-400">Low Risk</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-[11px] text-white/30 tracking-widest uppercase mb-0.5">Risk Score</p>
                  <p className="text-2xl font-black text-white">12<span className="text-sm text-white/30">/100</span></p>
                </div>
              </div>

              {/* Tier B — Summary (secondary result) */}
              <p className="text-[13px] text-white/55 leading-relaxed border-l-2 border-emerald-500/30 pl-3 mb-5">
                Strong official footprint with active GitHub and credible third-party coverage. No risk signals detected from authoritative sources.
              </p>

              {/* Tier C — Signals (tertiary, collapsible) */}
              <div className="flex gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">Active GitHub</span>
                <span className="px-2.5 py-1 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">Official Docs</span>
                <span className="px-2.5 py-1 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">Credible Coverage</span>
                <span className="px-2.5 py-1 rounded-full text-[10px] bg-white/5 text-white/30 border border-white/10">8 sources examined</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="text-center pb-5 text-[10px] text-white/15 tracking-wider">
        Assessment based on public web evidence · Not financial advice · Always DYOR
      </footer>
    </div>
  );
}
