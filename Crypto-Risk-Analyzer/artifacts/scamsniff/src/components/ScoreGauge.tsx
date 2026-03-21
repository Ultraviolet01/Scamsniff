import { motion } from "framer-motion";
import { getRiskColor } from "@/lib/utils";

interface ScoreGaugeProps {
  score: number;
}

export function ScoreGauge({ score }: ScoreGaugeProps) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  const colorKey = getRiskColor(score);
  
  const colorMap = {
    success: "stroke-success",
    warning: "stroke-warning",
    destructive: "stroke-destructive",
    accent: "stroke-accent"
  };

  return (
    <div className="relative flex items-center justify-center w-40 h-40">
      {/* Background Track */}
      <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 140 140">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted/30"
        />
        {/* Animated Progress */}
        <motion.circle
          cx="70"
          cy="70"
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          className={colorMap[colorKey]}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      
      {/* Center Text */}
      <div className="flex flex-col items-center justify-center text-center">
        <motion.span 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className={`text-4xl font-display font-bold text-${colorKey} drop-shadow-[0_0_8px_currentColor]`}
        >
          {score}
        </motion.span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mt-1">
          Risk Score
        </span>
      </div>
    </div>
  );
}
