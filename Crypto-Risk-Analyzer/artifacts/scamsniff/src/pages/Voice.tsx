/**
 * Voice.tsx — ScamSniff Voice Investigation
 *
 * ROOT CAUSE (found via logs 2026-03-22):
 *   `useConversation` was receiving new callback references on every render
 *   (because onConnect/onDisconnect/onError/onMessage were inline functions).
 *   When voiceState changed → re-render → new callbacks → useConversation
 *   detected config change → tore down and reset the session → onDisconnect
 *   fired ~550 ms after onConnect, resetting UI back to idle.
 *
 * FIXES:
 *   1. All callbacks wrapped in stable useRef-based thunks — useConversation
 *      always receives the SAME function references across renders.
 *   2. Prompt overrides removed from startSession — the agent already has the
 *      correct system prompt set via ElevenLabs API; sending overrides caused
 *      the server to reject the initialization message and drop the connection.
 */

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type MutableRefObject,
} from "react";
import { useConversation } from "@11labs/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Activity,
  ArrowLeft,
  ShieldAlert,
  Volume2,
  AlertTriangle,
} from "lucide-react";
import { Link } from "wouter";
import { analyzeProject } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

type VS =
  | "idle"
  | "requesting_permission"
  | "connecting"
  | "listening"
  | "processing"
  | "speaking"
  | "error";

interface AgentMessage {
  role: "agent" | "user";
  text: string;
}

// ---------------------------------------------------------------------------
// Stable callback hook
// ---------------------------------------------------------------------------

/**
 * Returns a stable function reference that always delegates to the latest
 * version of `fn`. This ensures useConversation never sees new callback refs.
 */
function useStableCallback<T extends (...args: never[]) => unknown>(
  fn: T,
): T {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((...args: Parameters<T>) => ref.current(...args), []) as T;
}

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

function makeLog(prefix: string) {
  return (msg: string, data?: unknown) => {
    if (data !== undefined) {
      console.log(`[${prefix}] ${msg}`, data);
    } else {
      console.log(`[${prefix}] ${msg}`);
    }
  };
}

const log = makeLog("ScamSniff Voice");

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Voice() {
  // ── UI State ──────────────────────────────────────────────────────────────
  const [voiceState, setVoiceStateRaw] = useState<VS>("idle");
  const [messages, setMessages]        = useState<AgentMessage[]>([]);
  const [errorMsg, setErrorMsg]        = useState<string | null>(null);

  // ── Refs (survive renders, readable inside stable callbacks) ──────────────
  const voiceStateRef:  MutableRefObject<VS>                 = useRef("idle");
  const micStreamRef:   MutableRefObject<MediaStream | null> = useRef(null);
  const sessionLiveRef: MutableRefObject<boolean>            = useRef(false);

  // Wrapped setter so the ref stays in sync too
  const setVoiceState = useCallback((s: VS) => {
    log(`State: ${voiceStateRef.current} → ${s}`);
    voiceStateRef.current = s;
    setVoiceStateRaw(s);
  }, []);

  // ── Environment diagnostics (computed once on mount) ──────────────────────
  const isSecureContext = window.isSecureContext;
  const hasMediaDevices = !!navigator.mediaDevices?.getUserMedia;

  // ── Mic stream helpers ────────────────────────────────────────────────────
  const stopMicStream = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
      log("Mic stream tracks stopped and released");
    }
  }, []);

  // ── addMessage ────────────────────────────────────────────────────────────
  const addMessage = useCallback((role: AgentMessage["role"], text: string) => {
    setMessages((prev) => [...prev, { role, text }].slice(-10));
  }, []);

  // ── Stable ElevenLabs callbacks (refs under the hood) ─────────────────────

  const onConnect = useStableCallback(() => {
    log("onConnect fired — session established");
    sessionLiveRef.current = true;
    setErrorMsg(null);
    setVoiceState("listening");
  });

  const onDisconnect = useStableCallback((event?: unknown) => {
    const ev = event as { code?: number; reason?: string; wasClean?: boolean } | undefined;
    const reason = ev?.reason || "";
    const code   = ev?.code;
    log("onDisconnect fired", {
      sessionLive: sessionLiveRef.current,
      voiceState: voiceStateRef.current,
      closeCode: code,
      closeReason: reason || "(no reason)",
      wasClean: ev?.wasClean,
    });

    if (sessionLiveRef.current) {
      sessionLiveRef.current = false;
      stopMicStream();

      // If the session was live and terminated unexpectedly, show a useful error
      // rather than silently returning to idle. ElevenLabs sends reason "error"
      // for quota exceeded (code 1002) and other server-side failures.
      if (
        voiceStateRef.current !== "idle" &&
        voiceStateRef.current !== "error"
      ) {
        const isQuota =
          reason.toLowerCase().includes("quota") ||
          reason.toLowerCase().includes("limit") ||
          code === 1002;

        if (isQuota) {
          setVoiceState("error");
          setErrorMsg(
            "ElevenLabs character quota exhausted. Your free tier limit has been reached — upgrade or wait for the monthly reset at elevenlabs.io."
          );
        } else if (reason === "error" || reason === "") {
          // Generic server-side termination — most commonly quota exhaustion
          setVoiceState("error");
          setErrorMsg(
            "Voice session cut short by ElevenLabs. This usually means your monthly character quota is exhausted — check your usage at elevenlabs.io."
          );
        } else {
          setVoiceState("idle");
        }
      }
    } else {
      log("onDisconnect ignored — session was never live (handshake artifact)");
    }
  });

  const onDebug = useStableCallback((info: unknown) => {
    log("onDebug (ElevenLabs internal)", info);
  });

  const onError = useStableCallback((err: unknown) => {
    const msg =
      typeof err === "string"
        ? err
        : err instanceof Error
        ? err.message
        : "Connection error from voice agent.";
    log("onError fired", msg);
    sessionLiveRef.current = false;
    stopMicStream();
    setVoiceState("error");
    setErrorMsg(msg || "Could not connect to voice agent. Check your API keys and agent ID.");
  });

  const onMessage = useStableCallback(
    ({ message, source }: { message: string; source: string }) => {
      log("onMessage", { source, preview: message.slice(0, 60) });
      if (source === "ai" || source === "agent") {
        addMessage("agent", message);
        setVoiceState("speaking");
      }
      if (source === "user") {
        addMessage("user", message);
        setVoiceState("listening");
      }
    }
  );

  // ── useConversation with stable callbacks ─────────────────────────────────
  const conversation = useConversation({
    clientTools: {
      analyze_project_risk: async ({ input }: { input: string }): Promise<string> => {
        log("Tool: analyze_project_risk called", { input });
        setVoiceState("processing");
        try {
          const result = await analyzeProject({ input });
          log("Tool: result received", { verdict: result.verdict });
          setVoiceState("listening");
          const lines = [
            `VERDICT: ${result.verdict}`,
            `SCORE: ${result.score}/100`,
            `CONFIDENCE: ${result.confidence}`,
          ];
          if (result.risk_signals.length)
            lines.push(`MAIN_RISKS: ${result.risk_signals.slice(0, 2).join("; ")}`);
          if (result.positive_signals.length)
            lines.push(`MAIN_TRUST: ${result.positive_signals.slice(0, 2).join("; ")}`);
          if (result.missing_signals.length)
            lines.push(`KEY_GAPS: ${result.missing_signals.slice(0, 1).join("; ")}`);
          lines.push(
            result.confidence === "High"
              ? "EVIDENCE_QUALITY: Multiple credible independent sources confirmed this."
              : result.confidence === "Low"
              ? "EVIDENCE_QUALITY: Limited public data available — be explicit that the assessment is preliminary."
              : "EVIDENCE_QUALITY: Some credible sources found, some community-only."
          );
          lines.push(
            "RESPONSE_INSTRUCTIONS: Respond in 2 to 4 calm, natural sentences. " +
            "State the verdict first. Then give the top 1-2 reasons. " +
            "End with one practical next step for the user. " +
            "Never be overconfident. If confidence is Low, acknowledge the evidence is limited. " +
            "Do not list every signal — just the most important ones."
          );
          return lines.join("\n");
        } catch (err) {
          log("Tool: analysis failed", err);
          setVoiceState("listening");
          return "VERDICT: Unknown\nEVIDENCE_NOTE: Analysis failed — tell the user to try again.";
        }
      },
    },
    onConnect,
    onDisconnect,
    onError,
    onMessage,
    onDebug,
  });

  // Keep listening/speaking in sync with isSpeaking flag
  useEffect(() => {
    if (sessionLiveRef.current && voiceStateRef.current !== "processing") {
      setVoiceState(conversation.isSpeaking ? "speaking" : "listening");
    }
  }, [conversation.isSpeaking, setVoiceState]);

  // Cleanup mic on unmount
  useEffect(() => {
    log("Component mounted");
    return () => {
      log("Component cleanup called (unmount)");
      stopMicStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleStartSession = useCallback(async () => {
    const cur = voiceStateRef.current;
    if (cur !== "idle" && cur !== "error") {
      log("startSession blocked — already running", cur);
      return;
    }

    log("START SESSION button clicked");
    setErrorMsg(null);
    setMessages([]);
    sessionLiveRef.current = false;

    // Step 1: request mic permission
    setVoiceState("requesting_permission");
    log("Checking secure context...", { isSecureContext, hasMediaDevices });

    if (!isSecureContext) {
      setVoiceState("error");
      setErrorMsg("Microphone requires a secure context (HTTPS or localhost).");
      return;
    }
    if (!hasMediaDevices) {
      setVoiceState("error");
      setErrorMsg("navigator.mediaDevices is not available in this browser.");
      return;
    }

    log("Calling getUserMedia...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;
      log("getUserMedia granted", { tracks: stream.getAudioTracks().map((t) => t.label) });
    } catch (err) {
      const errObj = err as DOMException;
      const isDenied = errObj.name === "NotAllowedError" || errObj.name === "PermissionDeniedError";
      const msg = isDenied
        ? "Microphone access was denied. Allow microphone in your browser settings and try again."
        : `Could not access microphone: ${errObj.name} — ${errObj.message}`;
      log("getUserMedia FAILED", err);
      console.error("[ScamSniff Voice] Full getUserMedia error:", err);
      setVoiceState("error");
      setErrorMsg(msg);
      return;
    }

    // Step 2: get signed URL
    setVoiceState("connecting");
    log("Fetching signed URL from /api/agent/signed-url ...");

    let signedUrl: string;
    try {
      const res = await fetch("/api/agent/signed-url");
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(body.error ?? `Server returned ${res.status}`);
      }
      const data = await res.json();
      signedUrl = data.signed_url;
      log("Signed URL received", signedUrl.slice(0, 60) + "...");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to get voice session token.";
      log("Signed URL FAILED", msg);
      stopMicStream();
      setVoiceState("error");
      setErrorMsg(msg);
      return;
    }

    // Step 3: start ElevenLabs session (no overrides — agent prompt is set via API)
    log("Calling conversation.startSession...");
    try {
      await conversation.startSession({ signedUrl });
      log("conversation.startSession resolved (onConnect will set listening state)");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not start voice session.";
      log("conversation.startSession THREW", msg);
      stopMicStream();
      sessionLiveRef.current = false;
      setVoiceState("error");
      setErrorMsg(msg);
    }
  }, [isSecureContext, hasMediaDevices, setVoiceState, stopMicStream, conversation]);

  const handleStop = useCallback(async () => {
    log("STOP button clicked");
    sessionLiveRef.current = false;
    try {
      await conversation.endSession();
    } catch (e) {
      log("endSession threw (non-fatal)", e);
    }
    stopMicStream();
    setVoiceState("idle");
    setMessages([]);
  }, [conversation, setVoiceState, stopMicStream]);

  // ---------------------------------------------------------------------------
  // Derived UI helpers
  // ---------------------------------------------------------------------------

  const isActive     = voiceState === "listening" || voiceState === "speaking" || voiceState === "processing";
  const isConnecting = voiceState === "connecting" || voiceState === "requesting_permission";
  const isError      = voiceState === "error";

  const STATE_LABEL: Record<VS, string> = {
    idle:                 "STANDBY",
    requesting_permission:"MIC CHECK",
    connecting:           "CONNECTING",
    listening:            "LISTENING",
    processing:           "PROCESSING",
    speaking:             "SPEAKING",
    error:                "ERROR",
  };

  const SUBTITLE: Record<VS, string> = {
    idle:                 'Tap "Start Voice" to begin.',
    requesting_permission:"Requesting microphone permission...",
    connecting:           "Establishing secure voice channel...",
    listening:            "Listening — speak naturally.",
    processing:           "Analysing...",
    speaking:             "Agent is speaking...",
    error:                "Something went wrong — see details below.",
  };

  const dotColor =
    isActive     ? "bg-emerald-400 animate-pulse" :
    isConnecting ? "bg-yellow-400 animate-pulse" :
    isError      ? "bg-red-500" :
    "bg-border";

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen w-full relative bg-background flex flex-col select-none">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
      </div>

      {/* ── Header ── */}
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
        <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
          <span className={cn("w-1.5 h-1.5 rounded-full", dotColor)} />
          {STATE_LABEL[voiceState]}
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 gap-7">

        {/* Title */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-white to-accent uppercase mb-2">
            Voice Investigation
          </h1>
          <p className="font-mono text-sm text-muted-foreground max-w-sm">
            {SUBTITLE[voiceState]}
          </p>
        </motion.div>

        {/* ── Mic Orb ── */}
        <div className="relative flex items-center justify-center">
          {isActive && (
            <>
              <span className="absolute w-40 h-40 rounded-full border border-primary/20 animate-ping" style={{ animationDuration: "2s" }} />
              <span className="absolute w-52 h-52 rounded-full border border-primary/10 animate-ping" style={{ animationDuration: "3s" }} />
            </>
          )}
          {isConnecting && (
            <span className="absolute w-44 h-44 rounded-full border border-yellow-400/20 animate-ping" style={{ animationDuration: "1.4s" }} />
          )}

          <div
            className={cn(
              "w-28 h-28 rounded-full flex items-center justify-center border-2 shadow-2xl transition-all duration-500",
              isActive     ? "bg-primary/30 border-primary" :
              isConnecting ? "bg-yellow-500/20 border-yellow-500/50" :
              isError      ? "bg-red-500/20 border-red-500/40" :
              "bg-primary/15 border-primary/40"
            )}
          >
            {isConnecting ? (
              <Activity className="w-9 h-9 text-yellow-400 animate-spin" />
            ) : voiceState === "speaking" ? (
              <Volume2 className="w-9 h-9 text-primary animate-pulse" />
            ) : voiceState === "processing" ? (
              <Activity className="w-9 h-9 text-primary animate-spin" />
            ) : isError ? (
              <AlertTriangle className="w-9 h-9 text-red-400" />
            ) : voiceState === "listening" ? (
              <Mic className="w-9 h-9 text-primary animate-pulse" />
            ) : (
              <Mic className="w-9 h-9 text-primary/60" />
            )}

            {voiceState === "listening" && (
              <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 flex gap-0.5 items-end h-3">
                {[...Array(5)].map((_, i) => (
                  <motion.span
                    key={i}
                    className="w-0.5 bg-primary rounded-full"
                    animate={{ height: ["3px", "12px", "3px"] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Control Buttons ── */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {isActive ? (
            <button
              type="button"
              onClick={handleStop}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-red-500/50 bg-red-500/10 font-mono text-sm text-red-400 hover:bg-red-500/20 transition-all"
            >
              <Mic className="w-4 h-4" />
              End Session
            </button>
          ) : !isConnecting ? (
            <button
              type="button"
              onClick={handleStartSession}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-mono text-sm font-bold shadow-[0_0_20px_rgba(0,255,255,0.2)] hover:shadow-[0_0_28px_rgba(0,255,255,0.35)] transition-all"
            >
              <Mic className="w-4 h-4" />
              Start Voice
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStop}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border/50 bg-card/40 font-mono text-xs text-muted-foreground hover:text-foreground transition-all"
            >
              Cancel
            </button>
          )}
        </div>

        {/* ── Error Card ── */}
        <AnimatePresence>
          {isError && errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="w-full max-w-sm bg-red-500/10 border border-red-500/40 rounded-xl px-5 py-4 font-mono text-sm text-red-400 text-center leading-relaxed"
            >
              <AlertTriangle className="w-4 h-4 mx-auto mb-2 opacity-70" />
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Transcript ── */}
        <AnimatePresence>
          {messages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-xl space-y-2"
            >
              <p className="font-mono text-[10px] text-muted-foreground/40 tracking-widest uppercase mb-2">
                Transcript
              </p>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: m.role === "agent" ? -8 : 8 }}
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

      <footer className="relative z-10 text-center pb-6 font-mono text-[10px] text-muted-foreground/25">
        Assessment based on available public web evidence · Not financial advice
      </footer>
    </div>
  );
}

