import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRiskColor(score: number): "success" | "warning" | "destructive" | "accent" {
  if (score < 25) return "success";
  if (score < 50) return "warning";
  if (score < 75) return "destructive";
  return "destructive"; // Extreme risk
}

export function getRiskColorClass(score: number, prefix: string = "text"): string {
  const color = getRiskColor(score);
  return `${prefix}-${color}`;
}
