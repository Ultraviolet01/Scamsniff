import { useState, useCallback, useRef } from "react";
import { useConversation } from "@11labs/react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Activity, ArrowLeft, ShieldAlert, Volume2 } from "lucide-react";
import { Link } from "wouter";
import { analyzeProject } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Verdict = "Low Risk" | "Caution" | "High Risk" | "Extreme Risk";

const VERDICT_COLOR: Record<Verdict, string> = {
  "Low Risk":    "text-emerald-400",
  "Caution":     "text-yellow-400",
  "High Risk":   "text-orange-400",
  "Extreme Risk":"text-red-500",
};

/**
 * Format the /api/analyze response into a structured data packet for the agent LLM.
 *
 * Design: this is NOT a finished spoken sentence — it is a priority-ordered
 * data block that tells the LLM exactly what to say and in what order.
 * The LLM uses this to generate a natural 2-4 sentence spoken response.
 */
function formatForAgent(data: {
  verdict: string;
  score: number;
  confidence: string;
  risk_signals: string[];
  positive_signals: string[];
  missing_signals: string[];
  input_type: string;
  summary: string;
}): string {
  const lines: string[] = [];

  // --- Priority 1: verdict + confidence (must be spoken first) ---
  lines.push(`VERDICT: ${data.verdict}`);
  lines.push(`CONFIDENCE: ${data.confidence}`);
  lines.push(`INPUT_TYPE: ${data.input_type}`);

  // --- Priority 2: strongest signals (pick top 2 only to avoid listing) ---
  if (data.risk_signals.length > 0) {
    lines.push(`TOP_RISKS: ${data.risk_signals.slice(0, 2).join(" | ")}`);
  }
  if (data.positive_signals.length > 0) {
    lines.push(`TOP_TRUST: ${data.positive_signals.slice(0, 2).join(" | ")}`);
  }

  // --- Priority 3: missing signals (max 2, for cautionary next step) ---
  if (data.missing_signals.length > 0) {
    lines.push(`MISSING: ${data.missing_signals.slice(0, 2).join(" | ")}`);
  }

  // --- Priority 4: confidence context for follow-up questions ---
  if (data.confidence === "Low") {
    lines.push("EVIDENCE_NOTE: Limited public data found — treat as preliminary.");
  } else if (data.confidence === "High") {
    lines.push("EVIDENCE_NOTE: Multiple credible independent sources confirm this.");
  } else {
    lines.push("EVIDENCE_NOTE: Mixed evidence — some credible sources, some community-only.");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type SessionStatus = "idle" | "connecting" | "active" | "error";

interface AgentMessage {
  role: "agent" | "user";
  text: string;
}

export default function Voice() {
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const lastAgentRef = useRef<string>("");

  const addMessage = useCallback((role: AgentMessage["role"], text: string) => {
    setMessages((prev) => {
      const next = [...prev, { role, text }];
      return next.slice(-10);
    });
    if (role === "agent") lastAgentRef.current = text;
  }, []);

  const conversation = useConversation({
    clientTools: {
      /**
       * ElevenLabs calls this whenever the agent decides to run a risk analysis.
       * The agent passes { input: "<project/token/url/handle>" }.
       * We call /api/analyze and return a formatted spoken summary.
       */
      analyze_project_risk: async ({ input }: { input: string }): Promise<string> => {
        try {
          const result = await analyzeProject({ input });
          return formatForAgent({
            verdict: result.verdict,
            score: result.score,
            confidence: result.confidence,
            risk_signals: result.risk_signals,
            positive_signals: result.positive_signals,
            missing_signals: result.missing_signals,
            input_type: result.input_type,
            summary: result.summary,
          });
        } catch {
          return "VERDICT: Unknown\nEVIDENCE_NOTE: Analysis failed — no results returned. Tell the user the service could not complete the lookup and suggest they try again.";
        }
      },
    },
    onConnect: () => {
      setStatus("active");
      setErrorMsg(null);
    },
    onDisconnect: () => {
      setStatus("idle");
    },
    onError: (err) => {
      setStatus("error");
      setErrorMsg(typeof err === "string" ? err : "Connection error. Check your API keys.");
    },
    onMessage: ({ message, source }) => {
      if (source === "ai") addMessage("agent", message);
      if (source === "user") addMessage("user", message);
    },
  });

  const isListening = conversation.isSpeaking === false && status === "active";
  const isSpeaking = conversation.isSpeaking && status === "active";

  const startSession = useCallback(async () => {
    setStatus("connecting");
    setMessages([]);
    setErrorMsg(null);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const res = await fetch(`${import.meta.env.BASE_URL}api/agent/signed-url`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(body.error ?? "Failed to get voice session.");
      }
      const { signed_url } = await res.json();
      await conversation.startSession({ signedUrl: signed_url });
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Could not start voice session.");
    }
  }, [conversation]);

  const stopSession = useCallback(async () => {
    await conversation.endSession();
    setStatus("idle");
  }, [conversation]);

  return (
    <div className="min-h-screen w-full relative bg-background flex flex-col">
      {/* Background tint */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border/40">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-mono text-sm">
          <ArrowLeft className="w-4 h-4" />
          Text Mode
        </Link>
        <div className="flex items-center gap-2 font-mono text-xs text-primary/70 tracking-widest">
          <ShieldAlert className="w-4 h-4" />
          SCAMSNIFF VOICE
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
          <span className={cn(
            "w-1.5 h-1.5 rounded-full",
            status === "active" ? "bg-emerald-400 animate-pulse" :
            status === "connecting" ? "bg-yellow-400 animate-pulse" :
            status === "error" ? "bg-red-500" : "bg-border"
          )} />
          {status === "active" ? "LIVE" : status === "connecting" ? "CONNECTING" : status === "error" ? "ERROR" : "STANDBY"}
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12 gap-10">

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-white to-accent uppercase mb-2">
            Voice Investigation
          </h1>
          <p className="font-mono text-sm text-muted-foreground max-w-sm">
            {status === "idle"
              ? 'Say something like "Check SafeMoon for me" or "Is this site legit?"'
              : status === "connecting"
              ? "Establishing secure voice channel..."
              : isSpeaking
              ? "Agent is speaking..."
              : "Listening — speak naturally"}
          </p>
        </motion.div>

        {/* Mic orb */}
        <div className="relative flex items-center justify-center">
          {/* Pulse rings when active */}
          {status === "active" && (
            <>
              <span className="absolute w-40 h-40 rounded-full border border-primary/20 animate-ping" style={{ animationDuration: "2s" }} />
              <span className="absolute w-52 h-52 rounded-full border border-primary/10 animate-ping" style={{ animationDuration: "3s" }} />
            </>
          )}

          <motion.button
            whileHover={{ scale: status === "idle" ? 1.05 : 1 }}
            whileTap={{ scale: 0.96 }}
            onClick={status === "idle" ? startSession : stopSession}
            disabled={status === "connecting"}
            className={cn(
              "relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl border-2 focus:outline-none",
              status === "idle"
                ? "bg-primary/20 border-primary/50 hover:bg-primary/30 hover:border-primary"
                : status === "connecting"
                ? "bg-yellow-500/20 border-yellow-500/50 cursor-wait"
                : status === "active"
                ? "bg-primary/30 border-primary cursor-pointer"
                : "bg-destructive/20 border-destructive/50"
            )}
          >
            {status === "connecting" ? (
              <Activity className="w-10 h-10 text-yellow-400 animate-spin" />
            ) : status === "active" ? (
              isSpeaking ? (
                <Volume2 className="w-10 h-10 text-primary animate-pulse" />
              ) : (
                <Mic className={cn("w-10 h-10 text-primary", isListening && "animate-pulse")} />
              )
            ) : (
              <Mic className="w-10 h-10 text-primary/70" />
            )}

            {/* Listening waveform bars */}
            {isListening && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-0.5 items-end h-4">
                {[...Array(5)].map((_, i) => (
                  <motion.span
                    key={i}
                    className="w-1 bg-primary rounded-full"
                    animate={{ height: ["4px", "16px", "4px"] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                  />
                ))}
              </div>
            )}
          </motion.button>
        </div>

        {/* Action hint */}
        <p className="font-mono text-xs text-muted-foreground/60 text-center">
          {status === "idle"
            ? "Tap to start voice session"
            : status === "active"
            ? "Tap to end session"
            : null}
        </p>

        {/* Error */}
        <AnimatePresence>
          {status === "error" && errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-destructive/10 border border-destructive/40 rounded-xl px-5 py-4 text-sm font-mono text-destructive max-w-sm text-center"
            >
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transcript */}
        <AnimatePresence>
          {messages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-xl space-y-2"
            >
              <p className="font-mono text-xs text-muted-foreground/50 tracking-widest uppercase mb-3">
                Transcript
              </p>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: m.role === "agent" ? -10 : 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-sm font-mono leading-relaxed",
                    m.role === "agent"
                      ? "bg-primary/10 border border-primary/20 text-foreground/90 mr-8"
                      : "bg-muted/30 border border-border/40 text-muted-foreground ml-8 text-right"
                  )}
                >
                  <span className="text-[10px] uppercase tracking-widest opacity-50 block mb-0.5">
                    {m.role === "agent" ? "ScamSniff" : "You"}
                  </span>
                  {m.text}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Footer note */}
      <footer className="relative z-10 text-center pb-6 font-mono text-[10px] text-muted-foreground/40">
        Assessment based on available public web evidence · Not financial advice
      </footer>
    </div>
  );
}
