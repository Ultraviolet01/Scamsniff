import { useState } from "react";
import { Search, Zap, Layers, BookOpen, Globe, Twitter, Mic, Info } from "lucide-react";

const MODES = [
  { id: "fast", label: "Fast Check", icon: <Zap className="w-4 h-4" />, desc: "Quick scan across all sources — best starting point" },
  { id: "deep", label: "Deep Dive", icon: <Layers className="w-4 h-4" />, desc: "Full multi-source investigation — slower but thorough" },
  { id: "token", label: "Token Check", icon: <BookOpen className="w-4 h-4" />, desc: "Optimised for ERC-20 tokens and meme coins" },
  { id: "website", label: "Website Check", icon: <Globe className="w-4 h-4" />, desc: "Scans a project website domain and team" },
  { id: "xaccount", label: "X Account", icon: <Twitter className="w-4 h-4" />, desc: "Analyses an X (Twitter) account for red flags" },
];

const EXAMPLES = [
  { label: "SafeMoon", input: "SafeMoon", verdict: "High Risk", bg: "bg-orange-950/60", border: "border-orange-500/40", text: "text-orange-300", badge: "bg-orange-500/20 text-orange-300" },
  { label: "Uniswap", input: "Uniswap", verdict: "Low Risk", bg: "bg-emerald-950/60", border: "border-emerald-500/40", text: "text-emerald-300", badge: "bg-emerald-500/20 text-emerald-300" },
  { label: "MoonPumpXYZ", input: "MoonPumpXYZ", verdict: "Extreme Risk", bg: "bg-red-950/60", border: "border-red-500/40", text: "text-red-300", badge: "bg-red-500/20 text-red-300" },
];

export function AccessibilityFirst() {
  const [mode, setMode] = useState("fast");
  const [query, setQuery] = useState("");

  const selectedMode = MODES.find((m) => m.id === mode)!;

  return (
    <div className="min-h-screen bg-[#050a0a] flex flex-col font-mono text-white">

      {/* Skip nav for screen readers */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-white text-black px-3 py-1 rounded text-sm z-50">
        Skip to main content
      </a>

      {/* Header */}
      <header role="banner" className="flex items-center justify-between px-6 py-3.5 border-b border-white/10">
        <div>
          <span className="text-[13px] font-bold tracking-widest text-[#00e5cc] uppercase">ScamSniff</span>
          <span className="ml-2 text-[11px] text-white/40">Crypto Risk Analyzer</span>
        </div>
        <button
          aria-label="Switch to voice input mode"
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 text-[12px] text-white/70 hover:text-white hover:border-white/40 transition-colors focus:outline-none focus:ring-2 focus:ring-[#00e5cc] focus:ring-offset-2 focus:ring-offset-[#050a0a]"
        >
          <Mic className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Voice Mode</span>
        </button>
      </header>

      <main id="main-content" role="main" className="flex-1 flex flex-col items-center px-6 py-10 gap-8 max-w-2xl mx-auto w-full">

        {/* Page heading — larger and clear */}
        <div className="text-center w-full">
          <h1 className="text-[32px] font-black leading-tight text-transparent bg-clip-text bg-gradient-to-r from-[#00e5cc] to-[#cc44ff] uppercase mb-2">
            Crypto Risk Analyzer
          </h1>
          <p className="text-[15px] text-white/60 leading-relaxed">
            Enter any crypto project, token, URL, or X handle to get an instant risk assessment.
          </p>
        </div>

        {/* Step 1 — Check type (explicitly labeled fieldset) */}
        <fieldset className="w-full border border-white/10 rounded-xl p-5">
          <legend className="px-2 text-[12px] font-bold text-white/60 uppercase tracking-widest">
            Step 1 — Choose check type
          </legend>
          <div className="grid grid-cols-1 gap-2 mt-2">
            {MODES.map((m) => (
              <label
                key={m.id}
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-all focus-within:ring-2 focus-within:ring-[#00e5cc] focus-within:ring-offset-1 focus-within:ring-offset-[#050a0a] ${
                  mode === m.id
                    ? "bg-[#00e5cc]/10 border-[#00e5cc]/50"
                    : "border-white/8 hover:border-white/20 hover:bg-white/3"
                }`}
              >
                <input
                  type="radio"
                  name="check-mode"
                  value={m.id}
                  checked={mode === m.id}
                  onChange={() => setMode(m.id)}
                  className="mt-0.5 accent-[#00e5cc] w-3.5 h-3.5 shrink-0"
                  aria-describedby={`mode-desc-${m.id}`}
                />
                <span className={`shrink-0 mt-0.5 ${mode === m.id ? "text-[#00e5cc]" : "text-white/40"}`} aria-hidden="true">
                  {m.icon}
                </span>
                <span className="flex flex-col">
                  <span className={`text-[13px] font-bold ${mode === m.id ? "text-[#00e5cc]" : "text-white/80"}`}>
                    {m.label}
                  </span>
                  <span id={`mode-desc-${m.id}`} className="text-[11px] text-white/40 mt-0.5 leading-relaxed">
                    {m.desc}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Step 2 — Input (explicitly labeled) */}
        <div className="w-full flex flex-col gap-3">
          <label htmlFor="query-input" className="text-[12px] font-bold text-white/60 uppercase tracking-widest">
            Step 2 — Enter target
          </label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" aria-hidden="true" />
            <input
              id="query-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Enter ${selectedMode.label.toLowerCase()} target…`}
              aria-label={`Enter ${selectedMode.label.toLowerCase()} target`}
              aria-describedby="query-hint"
              className="w-full bg-[#0c1a1a] border-2 border-white/15 rounded-xl pl-11 pr-4 py-4 text-[15px] text-white placeholder:text-white/25 outline-none focus:border-[#00e5cc]/70 transition-colors"
            />
          </div>
          <p id="query-hint" className="flex items-center gap-1.5 text-[11px] text-white/35">
            <Info className="w-3 h-3 shrink-0" aria-hidden="true" />
            {selectedMode.desc}
          </p>

          <button
            type="button"
            disabled={!query.trim()}
            aria-label="Run analysis on entered target"
            className="w-full py-4 rounded-xl bg-[#00e5cc] text-[#050a0a] font-black text-[14px] tracking-[0.1em] uppercase transition-all hover:bg-[#00e5cc]/90 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#050a0a] disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.99]"
          >
            Run Analysis
          </button>
        </div>

        {/* Step 3 — Examples (clearly labelled) */}
        <div className="w-full" aria-labelledby="examples-heading">
          <p id="examples-heading" className="text-[12px] font-bold text-white/50 uppercase tracking-widest mb-3">
            Or try an example
          </p>
          <ul role="list" className="grid grid-cols-3 gap-3">
            {EXAMPLES.map((e) => (
              <li key={e.label}>
                <button
                  onClick={() => setQuery(e.input)}
                  aria-label={`Load example: ${e.label} — expected result: ${e.verdict}`}
                  className={`w-full flex flex-col gap-2 p-3.5 rounded-xl border text-left transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#00e5cc] focus:ring-offset-2 focus:ring-offset-[#050a0a] active:scale-95 ${e.bg} ${e.border}`}
                >
                  <span className={`text-[14px] font-bold ${e.text}`}>{e.label}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full self-start ${e.badge}`}>
                    {e.verdict}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </main>

      {/* Footer with accessibility note */}
      <footer role="contentinfo" className="text-center pb-5 px-6">
        <p className="text-[11px] text-white/30 leading-relaxed">
          Results are based on publicly available web evidence and are not financial advice.
          <br />
          Always do your own research (DYOR) before investing.
        </p>
      </footer>
    </div>
  );
}
