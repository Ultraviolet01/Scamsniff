import { useState } from "react";
import { Search, Zap, Layers, BookOpen, Globe, Twitter, Mic, ArrowRight, ChevronRight } from "lucide-react";

const MODES = [
  { id: "fast", label: "Fast Check", icon: <Zap className="w-4 h-4" />, desc: "Quick scan" },
  { id: "deep", label: "Deep Dive", icon: <Layers className="w-4 h-4" />, desc: "Full investigation" },
  { id: "token", label: "Token", icon: <BookOpen className="w-4 h-4" />, desc: "ERC-20 coins" },
  { id: "website", label: "Website", icon: <Globe className="w-4 h-4" />, desc: "Domain analysis" },
  { id: "xaccount", label: "X Account", icon: <Twitter className="w-4 h-4" />, desc: "Twitter scan" },
];

const EXAMPLES = [
  { label: "SafeMoon", input: "SafeMoon", verdict: "High Risk", dot: "bg-orange-400" },
  { label: "Uniswap", input: "Uniswap", verdict: "Low Risk", dot: "bg-emerald-400" },
  { label: "MoonPumpXYZ", input: "MoonPumpXYZ", verdict: "Extreme Risk", dot: "bg-red-500" },
];

export function AffordanceFirst() {
  const [mode, setMode] = useState("fast");
  const [query, setQuery] = useState("");

  return (
    <div className="min-h-screen bg-[#050a0a] flex flex-col font-mono">

      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00e5cc] to-[#cc44ff] flex items-center justify-center">
            <span className="text-[10px] font-black text-black">SS</span>
          </div>
          <span className="text-[13px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#00e5cc] to-[#cc44ff] tracking-widest uppercase">ScamSniff</span>
        </div>

        {/* Voice Mode — clearly a button with icon + label + arrow */}
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#cc44ff]/10 border border-[#cc44ff]/30 text-[#cc44ff] text-[12px] font-semibold hover:bg-[#cc44ff]/20 transition-all active:scale-95 group">
          <Mic className="w-3.5 h-3.5" />
          Try Voice Mode
          <ArrowRight className="w-3 h-3 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center px-8 py-12 gap-10">

        {/* Title */}
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#00e5cc] via-white to-[#cc44ff] uppercase mb-2">
            Voice Investigation
          </h1>
          <p className="text-[14px] text-white/40">
            Detect scams before you connect your wallet.
          </p>
        </div>

        {/* Mode Selector — large, clearly clickable tab buttons */}
        <div className="w-full max-w-2xl">
          <p className="text-[11px] text-white/30 uppercase tracking-widest mb-2">Select check type</p>
          <div className="grid grid-cols-5 gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border text-center transition-all active:scale-95 ${
                  mode === m.id
                    ? "bg-[#00e5cc]/15 border-[#00e5cc]/60 text-[#00e5cc] shadow-[0_0_16px_rgba(0,229,204,0.15)]"
                    : "bg-white/3 border-white/10 text-white/40 hover:bg-white/6 hover:border-white/20 hover:text-white/70"
                }`}
              >
                {m.icon}
                <span className="text-[10px] font-bold tracking-wide">{m.label}</span>
                <span className="text-[9px] opacity-50 leading-tight">{m.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search — large, unmissable input + button */}
        <div className="w-full max-w-2xl flex flex-col gap-3">
          <p className="text-[11px] text-white/30 uppercase tracking-widest">Enter target</p>
          <div className="relative">
            {/* Glow ring */}
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-[#00e5cc]/40 to-[#cc44ff]/40 blur opacity-40" />
            <div className="relative flex gap-0 bg-[#0c1a1a] rounded-2xl border border-[#00e5cc]/25 overflow-hidden focus-within:border-[#00e5cc]/60 transition-colors">
              <div className="flex items-center pl-5">
                <Search className="w-5 h-5 text-[#00e5cc]/40" />
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Project name, URL, token, or @handle"
                className="flex-1 bg-transparent px-4 py-5 text-[15px] text-white/90 placeholder:text-white/20 outline-none"
              />
            </div>
          </div>

          {/* CTA button — the biggest, most tactile element on the page */}
          <button className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#00e5cc] to-[#00b8a5] text-[#050a0a] font-black text-[15px] tracking-[0.12em] uppercase flex items-center justify-center gap-3 shadow-[0_4px_24px_rgba(0,229,204,0.35)] hover:shadow-[0_4px_36px_rgba(0,229,204,0.5)] hover:scale-[1.01] active:scale-[0.99] transition-all">
            <Search className="w-5 h-5" />
            Analyze Now
            <ChevronRight className="w-5 h-5 opacity-70" />
          </button>
        </div>

        {/* Demo presets — clearly labelled, large enough to tap */}
        <div className="w-full max-w-2xl">
          <p className="text-[11px] text-white/30 uppercase tracking-widest mb-3">
            Try a demo — tap any to load
          </p>
          <div className="grid grid-cols-3 gap-3">
            {EXAMPLES.map((e) => (
              <button
                key={e.label}
                onClick={() => setQuery(e.input)}
                className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-white/3 border border-white/10 text-left hover:bg-white/6 hover:border-white/20 active:scale-95 transition-all group"
              >
                <div>
                  <p className="text-[13px] font-bold text-white/80 group-hover:text-white transition-colors">{e.label}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${e.dot}`} />
                    <span className="text-[10px] text-white/35">{e.verdict}</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        </div>
      </main>

      <footer className="text-center pb-5 text-[10px] text-white/15 tracking-wider">
        Assessment based on public web evidence · Not financial advice · Always DYOR
      </footer>
    </div>
  );
}
