import { motion } from "motion/react";

export interface Suggestion {
  name: string;
  ticker: string;
  allocation: number;
  rupeeAmount: number;
  reason: string;
  riskLevel: "Low" | "Medium" | "High";
  riskScore: number;
}

interface SuggestionCardProps {
  suggestion: Suggestion;
  index: number;
}

const riskConfig: Record<
  Suggestion["riskLevel"],
  { color: string; dot: string; label: string }
> = {
  Low: {
    color: "text-blue-400",
    dot: "bg-blue-400",
    label: "Low",
  },
  Medium: {
    color: "text-yellow-400",
    dot: "bg-yellow-400",
    label: "Medium",
  },
  High: {
    color: "text-primary glow-green-text",
    dot: "bg-primary",
    label: "High",
  },
};

function formatRupees(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function SuggestionCard({ suggestion, index }: SuggestionCardProps) {
  const risk = riskConfig[suggestion.riskLevel];

  return (
    <motion.div
      data-ocid={`suggestions.item.${index + 1}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay: index * 0.1,
        ease: [0.4, 0, 0.2, 1],
      }}
      className="group relative flex flex-col gap-4 rounded-xl p-6 bg-card border border-border hover:border-primary/40 transition-all duration-300 hover:shadow-glow-green"
    >
      {/* Header: Ticker badge + Allocation */}
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-widest uppercase border bg-primary/10 text-primary border-primary/20">
          {suggestion.ticker}
        </span>
        <span className="text-xs font-semibold text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full border border-border">
          {suggestion.allocation}% of portfolio
        </span>
      </div>

      {/* Asset Name */}
      <h3 className="text-foreground font-bold text-base leading-snug">
        {suggestion.name}
      </h3>

      {/* Rupee amount */}
      <div className="flex items-center gap-2">
        <span className="text-2xl font-extrabold text-foreground tracking-tight">
          {formatRupees(suggestion.rupeeAmount)}
        </span>
      </div>

      {/* Reason */}
      <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3 flex-1">
        {suggestion.reason}
      </p>

      {/* Risk Level */}
      <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
          Risk Level
        </p>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${risk.dot}`} />
          <span className={`text-sm font-bold ${risk.color}`}>
            {risk.label}
          </span>
          <span className="text-muted-foreground text-xs">·</span>
          <span className="text-muted-foreground text-xs font-medium">
            {suggestion.riskScore}/10
          </span>
        </div>
      </div>
    </motion.div>
  );
}
