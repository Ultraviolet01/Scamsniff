import { useState, useCallback, useRef, useEffect } from "react";
import { useConversation } from "@11labs/react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Activity, ArrowLeft, ShieldAlert, Volume2, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { analyzeProject } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Verdict = "Low Risk" | "Caution" | "High Risk" | "Extreme Risk";

const VERDICT_COLOR: Record<Verdict, string> = {
  "Low Risk":     "text-emerald-400",
  "Caution":      "text-yellow-400",
  "High Risk":    "text-orange-400",
  "Extreme Risk": "text-red-500",
};

/**
 * System prompt injected as a runtime override into every ElevenLabs session.
 * This keeps the authoritative prompt in code, not just the ElevenLabs dashboard.
 */
const AGENT_SYSTEM_PROMPT = `\
You are ScamSniff, a calm, sharp on-chain security analyst. Your job is to help users assess \
whether a crypto project, token, URL, or X handle is suspicious.

RESPONSE STRUCTURE — always follow this exact order:
1. State the risk level immediately in the first sentence.
2. Weave the top 1-2 strongest signals into the next 1-2 sentences naturally — do NOT list them.
3. End with one clear, practical next step.

RESPONSE LENGTH: 2 to 4 sentences maximum. Front-load the most critical information so users \
can interrupt early and still get full value.

PHRASING RULES:
- Never say "this is safe" or "this is definitely a scam".
- Use hedged language: "this looks low risk from the public evidence I found" / \
"this looks suspicious based on the evidence available" / \
"I couldn't verify enough trustworthy signals to feel confident either way".
- Don't repeat the project or token name more than once per response.
- Never verbally list more than 2 sources or signals — summarize them naturally.
- Sound like a trusted security friend, not a compliance report.

FOLLOW-UP HANDLING:
- If the user asks "why?" → Explain the top 1-2 risk signals in plain, natural language. One or two sentences max.
- If the user asks "sources?" or "where did you get that?" → Describe the source types first. Offer more detail only if they ask again.
- If the user asks "how confident are you?" → Base your answer on evidence quality. One sentence is enough.
- For any other follow-up about the same target, answer directly without re-running the tool.

TOOL USAGE:
When the user mentions any project name, token, URL, or X handle — immediately call \
analyze_project_risk with that identifier. Base your entire initial response on the structured \
data returned. Do NOT call the tool again for follow-up questions about the same target.

DATA INTERPRETATION:
The tool returns a structured data block. Use it as follows:
- VERDICT + CONFIDENCE → craft your first sentence from these two together.
- TOP_RISKS or TOP_TRUST → pick whichever set is most significant and weave the top 1-2 into your evidence sentence(s).
- MISSING → use to inform your cautionary next step.
- EVIDENCE_NOTE mentions limited data → qualify your answer: "based on limited public evidence".
- EVIDENCE_NOTE mentions multiple credible sources → you can speak with more confidence, but still use hedged language.

NEXT STEP BY VERDICT (keep to one crisp sentence):
- Extreme Risk → "Don't connect your wallet or send funds — treat this as unverified."
- High Risk → "Cross-check the team, official site, and docs independently before doing anything."
- Caution → "Verify the official site and GitHub yourself before taking any action."
- Low Risk → "Looks clean from what I found, but verify links yourself before connecting a wallet."

TONE: Calm, focused, never panicked. Never hype. Acknowledge uncertainty when evidence is thin.`;

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
  lines.push(`VERDICT: ${data.verdict}`);
  lines.push(`CONFIDENCE: ${data.confidence}`);
  lines.push(`INPUT_TYPE: ${data.input_type}`);
  if (data.risk_signals.length > 0)
    lines.push(`TOP_RISKS: ${data.risk_signals.slice(0, 2).join(" | ")}`);
  if (data.positive_signals.length > 0)
    lines.push(`TOP_TRUST: ${data.positive_signals.slice(0, 2).join(" | ")}`);
  if (data.missing_signals.length > 0)
    lines.push(`MISSING: ${data.missing_signals.slice(0, 2).join(" | ")}`);
  if (data.confidence === "Low")
    lines.push("EVIDENCE_NOTE: Limited public data found — qualify your response accordingly.");
  else if (data.confidence === "High")
    lines.push("EVIDENCE_NOTE: Multiple credible independent sources confirm this.");
  else
    lines.push("EVIDENCE_NOTE: Mixed evidence — some credible sources, some community-only.");
  if (data.risk_signals.length > 2)
    lines.push(`ALL_RISKS: ${data.risk_signals.join(" | ")}`);
  if (data.positive_signals.length > 2)
    lines.push(`ALL_TRUST: ${data.positive_signals.join(" | ")}`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Fine-grained voice state used for both UI and debug display.
 *
 * Lifecycle:
 *   idle → requesting_permission → connecting → listening ↔ speaking → idle
 *                                                          ↘ error
 */
type VoiceState =
  | "idle"
  | "requesting_permission"
  | "connecting"
  | "listening"
  | "speaking"
  | "error";

interface AgentMessage {
  role: "agent" | "user";
  text: string;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Voice() {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /**
   * Refs that survive re-renders without causing extra renders themselves.
   *
   * micStreamRef   — keeps the getUserMedia stream alive for the duration of the session.
   * sessionLiveRef — true once onConnect fires; used to guard onDisconnect so it
   *                  does NOT reset state during the initial connection handshake,
   *                  only after a real established session ends.
   * stoppingRef    — true when the user manually triggers stopSession so we know
   *                  the disconnect is intentional.
   */
  const micStreamRef    = useRef<MediaStream | null>(null);
  const sessionLiveRef  = useRef(false);
  const stoppingRef     = useRef(false);

  const log = (msg: string, data?: unknown) => {
    if (data !== undefined) {
      console.log(`[ScamSniff Voice] ${msg}`, data);
    } else {
      console.log(`[ScamSniff Voice] ${msg}`);
    }
  };

  const stopMicStream = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
      log("Mic stream stopped and released");
    }
  };

  const addMessage = useCallback((role: AgentMessage["role"], text: string) => {
    setMessages((prev) => [...prev, { role, text }].slice(-10));
  }, []);

  const conversation = useConversation({
    clientTools: {
      analyze_project_risk: async ({ input }: { input: string }): Promise<string> => {
        log("Tool called: analyze_project_risk", { input });
        try {
          const result = await analyzeProject({ input });
          log("Tool result received", { verdict: result.verdict });
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
        } catch (err) {
          log("Tool error", err);
          return "VERDICT: Unknown\nEVIDENCE_NOTE: Analysis failed — tell the user the service could not complete the lookup and suggest they try again.";
        }
      },
    },

    onConnect: () => {
      log("onConnect fired — session is live");
      sessionLiveRef.current = true;
      stoppingRef.current = false;
      setVoiceState("listening");
      setErrorMsg(null);
    },

    onDisconnect: () => {
      log("onDisconnect fired", {
        sessionLive: sessionLiveRef.current,
        stopping: stoppingRef.current,
      });

      // Only reset to idle if the session was actually established.
      // Ignore spurious disconnects that fire during the initial handshake
      // before onConnect has ever been called.
      if (sessionLiveRef.current) {
        sessionLiveRef.current = false;
        stopMicStream();
        setVoiceState("idle");
      } else {
        log("onDisconnect ignored — session was not yet live (handshake disconnect)");
      }
    },

    onError: (err) => {
      const msg = typeof err === "string" ? err : (err as Error)?.message ?? "Connection error.";
      log("onError fired", msg);
      sessionLiveRef.current = false;
      stopMicStream();
      setVoiceState("error");
      setErrorMsg(msg || "Could not connect to voice agent. Check your API keys.");
    },

    onMessage: ({ message, source }: { message: string; source: string }) => {
      log("onMessage", { source, preview: message.slice(0, 60) });
      // source is "ai" for agent messages and "user" for transcribed user speech
      if (source === "ai" || source === "agent") addMessage("agent", message);
      if (source === "user") addMessage("user", message);

      // Update speaking/listening visual state
      if (source === "ai" || source === "agent") {
        setVoiceState("speaking");
      } else if (source === "user") {
        setVoiceState("listening");
      }
    },
  });

  // Keep speaking/listening in sync with the SDK's isSpeaking flag
  useEffect(() => {
    if (sessionLiveRef.current) {
      setVoiceState(conversation.isSpeaking ? "speaking" : "listening");
    }
  }, [conversation.isSpeaking]);

  // ---------------------------------------------------------------------------
  // Session control
  // ---------------------------------------------------------------------------

  const startSession = useCallback(async () => {
    // Guard: don't double-start
    if (voiceState !== "idle" && voiceState !== "error") {
      log("startSession blocked — already in progress", voiceState);
      return;
    }

    log("Mic button clicked — starting session");
    setErrorMsg(null);
    setMessages([]);
    sessionLiveRef.current = false;
    stoppingRef.current = false;

    // ── Step 1: microphone permission ────────────────────────────────────────
    setVoiceState("requesting_permission");
    log("Requesting microphone permission via getUserMedia...");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;
      log("Microphone permission granted", {
        tracks: stream.getAudioTracks().map((t) => t.label),
      });
    } catch (err) {
      const isDenied =
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
      const msg = isDenied
        ? "Microphone access was denied. Please allow microphone access in your browser and try again."
        : `Could not access microphone: ${err instanceof Error ? err.message : String(err)}`;
      log("Microphone permission error", { err, isDenied });
      setVoiceState("error");
      setErrorMsg(msg);
      return;
    }

    // ── Step 2: signed URL from backend ─────────────────────────────────────
    setVoiceState("connecting");
    log("Fetching signed URL from backend...");

    let signedUrl: string;
    try {
      const res = await fetch("/api/agent/signed-url");
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown server error" }));
        throw new Error(body.error ?? `Server returned ${res.status}`);
      }
      const data = await res.json();
      signedUrl = data.signed_url;
      log("Signed URL received (truncated)", signedUrl.slice(0, 60) + "...");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to get voice session token.";
      log("Signed URL fetch failed", msg);
      stopMicStream();
      setVoiceState("error");
      setErrorMsg(msg);
      return;
    }

    // ── Step 3: start ElevenLabs session ────────────────────────────────────
    log("Calling conversation.startSession...");
    try {
      await conversation.startSession({
        signedUrl,
        overrides: {
          agent: {
            prompt: { prompt: AGENT_SYSTEM_PROMPT },
          },
        },
      });
      log("conversation.startSession resolved — waiting for onConnect");
      // UI state is set to "listening" inside onConnect, not here,
      // so there is no race between startSession and the connection handshake.
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not start voice session.";
      log("conversation.startSession threw", msg);
      stopMicStream();
      sessionLiveRef.current = false;
      setVoiceState("error");
      setErrorMsg(msg);
    }
  }, [voiceState, conversation]);

  const stopSession = useCallback(async () => {
    log("Stop button clicked");
    stoppingRef.current = true;
    try {
      await conversation.endSession();
    } catch (err) {
      log("endSession error (non-fatal)", err);
    }
    sessionLiveRef.current = false;
    stopMicStream();
    setVoiceState("idle");
  }, [conversation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMicStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Derived UI helpers
  // ---------------------------------------------------------------------------

  const isActive     = voiceState === "listening" || voiceState === "speaking";
  const isConnecting = voiceState === "connecting" || voiceState === "requesting_permission";
  const isError      = voiceState === "error";

  const statusDot =
    isActive     ? "bg-emerald-400 animate-pulse" :
    isConnecting ? "bg-yellow-400 animate-pulse" :
    isError      ? "bg-red-500" : "bg-border";

  const statusLabel: Record<VoiceState, string> = {
    idle:                 "STANDBY",
    requesting_permission:"MIC CHECK",
    connecting:           "CONNECTING",
    listening:            "LISTENING",
    speaking:             "SPEAKING",
    error:                "ERROR",
  };

  const subtitleText: Record<VoiceState, string> = {
    idle:                 'Say something like "Check SafeMoon" or "Is this site legit?"',
    requesting_permission:"Requesting microphone access...",
    connecting:           "Establishing secure voice channel...",
    listening:            "Listening — speak naturally",
    speaking:             "Agent is speaking...",
    error:                "Voice session failed — see error below",
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen w-full relative bg-background flex flex-col">
      {/* Background gradient */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border/40">
        <Link
          href="/"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-mono text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Text Mode
        </Link>

        <div className="flex items-center gap-2 font-mono text-xs text-primary/70 tracking-widest">
          <ShieldAlert className="w-4 h-4" />
          SCAMSNIFF VOICE
        </div>

        <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
          <span className={cn("w-1.5 h-1.5 rounded-full", statusDot)} />
          {statusLabel[voiceState]}
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
            {subtitleText[voiceState]}
          </p>
        </motion.div>

        {/* ── Debug State Banner ── */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/30 bg-card/30 font-mono text-[10px] tracking-widest text-muted-foreground/60">
          <span className={cn("w-1.5 h-1.5 rounded-full", statusDot)} />
          STATE: {voiceState.toUpperCase()}
          {errorMsg && (
            <span className="text-red-400 ml-2 max-w-[200px] truncate">| {errorMsg}</span>
          )}
        </div>

        {/* Mic orb */}
        <div className="relative flex items-center justify-center">
          {/* Pulse rings */}
          {isActive && (
            <>
              <span className="absolute w-40 h-40 rounded-full border border-primary/20 animate-ping" style={{ animationDuration: "2s" }} />
              <span className="absolute w-52 h-52 rounded-full border border-primary/10 animate-ping" style={{ animationDuration: "3s" }} />
            </>
          )}
          {isConnecting && (
            <span className="absolute w-40 h-40 rounded-full border border-yellow-400/20 animate-ping" style={{ animationDuration: "1.5s" }} />
          )}

          <motion.button
            type="button"
            whileHover={{ scale: !isConnecting ? 1.05 : 1 }}
            whileTap={{ scale: 0.96 }}
            onClick={isActive ? stopSession : isConnecting ? undefined : startSession}
            disabled={isConnecting}
            aria-label={isActive ? "Stop voice session" : "Start voice session"}
            className={cn(
              "relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              voiceState === "idle"
                ? "bg-primary/20 border-primary/50 hover:bg-primary/30 hover:border-primary cursor-pointer"
                : isConnecting
                ? "bg-yellow-500/20 border-yellow-500/50 cursor-wait"
                : voiceState === "listening"
                ? "bg-primary/30 border-primary cursor-pointer"
                : voiceState === "speaking"
                ? "bg-accent/20 border-accent/60 cursor-pointer"
                : voiceState === "error"
                ? "bg-red-500/20 border-red-500/50 cursor-pointer"
                : "bg-primary/20 border-primary/50 cursor-pointer"
            )}
          >
            {/* Icon */}
            {isConnecting ? (
              <Activity className="w-10 h-10 text-yellow-400 animate-spin" />
            ) : voiceState === "speaking" ? (
              <Volume2 className="w-10 h-10 text-accent animate-pulse" />
            ) : voiceState === "listening" ? (
              <Mic className="w-10 h-10 text-primary animate-pulse" />
            ) : voiceState === "error" ? (
              <AlertTriangle className="w-10 h-10 text-red-400" />
            ) : (
              <Mic className="w-10 h-10 text-primary/70" />
            )}

            {/* Waveform bars (listening) */}
            {voiceState === "listening" && (
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

        {/* Tap hint */}
        <p className="font-mono text-xs text-muted-foreground/50 text-center">
          {voiceState === "idle"  && "Tap to start voice session"}
          {isActive              && "Tap to end session"}
          {isConnecting          && "Please wait..."}
          {voiceState === "error" && "Tap the mic to try again"}
        </p>

        {/* Error card */}
        <AnimatePresence>
          {isError && errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-red-500/10 border border-red-500/40 rounded-xl px-5 py-4 text-sm font-mono text-red-400 max-w-sm text-center leading-relaxed"
            >
              <AlertTriangle className="w-4 h-4 mx-auto mb-2 opacity-70" />
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
              <p className="font-mono text-xs text-muted-foreground/40 tracking-widest uppercase mb-3">
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

      <footer className="relative z-10 text-center pb-6 font-mono text-[10px] text-muted-foreground/30">
        Assessment based on available public web evidence · Not financial advice
      </footer>
    </div>
  );
}
