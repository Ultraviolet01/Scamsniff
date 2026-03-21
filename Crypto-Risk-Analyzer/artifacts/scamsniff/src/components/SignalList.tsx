import { CheckCircle2, AlertTriangle, MinusCircle } from "lucide-react";
import { motion } from "framer-motion";

interface SignalListProps {
  type: "positive" | "risk" | "missing";
  signals: string[];
}

export function SignalList({ type, signals }: SignalListProps) {
  if (!signals || signals.length === 0) {
    return (
      <div className="p-4 rounded-lg border border-border border-dashed bg-muted/10 text-center">
        <span className="text-sm font-mono text-muted-foreground">
          {type === "missing" ? "No missing signals — good sign" : "No data found"}
        </span>
      </div>
    );
  }

  const styleMap = {
    positive: {
      row: "bg-success/5 border-success/20 text-foreground/90",
      icon: <CheckCircle2 className="w-4 h-4 text-success" />,
      xDir: 20,
    },
    risk: {
      row: "bg-destructive/5 border-destructive/20 text-destructive-foreground/90",
      icon: <AlertTriangle className="w-4 h-4 text-destructive" />,
      xDir: -20,
    },
    missing: {
      row: "bg-warning/5 border-warning/20 text-foreground/70",
      icon: <MinusCircle className="w-4 h-4 text-warning" />,
      xDir: 0,
    },
  };

  const style = styleMap[type];

  return (
    <ul className="space-y-3">
      {signals.map((signal, idx) => (
        <motion.li
          key={idx}
          initial={{ opacity: 0, x: style.xDir }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 + idx * 0.08 }}
          className={`flex items-start gap-3 p-3 rounded-md border ${style.row}`}
        >
          <div className="mt-0.5 shrink-0">{style.icon}</div>
          <span className="text-sm leading-relaxed font-mono">{signal}</span>
        </motion.li>
      ))}
    </ul>
  );
}
