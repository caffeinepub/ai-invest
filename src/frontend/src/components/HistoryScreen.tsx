import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useActor } from "@caffeineai/core-infrastructure";
import { ChevronDown, Clock, IndianRupee, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createActor } from "../backend";
import type { Query } from "../backend.d";

const formatCurrencyINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const formatDateTime = (timestamp: bigint): string => {
  const ms = Number(timestamp) / 1_000_000;
  const date = new Date(ms);
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getRiskColor = (riskLevel: string): string => {
  switch (riskLevel) {
    case "Low":
      return "text-blue-400";
    case "Medium":
      return "text-yellow-400";
    case "High":
      return "text-primary";
    default:
      return "text-muted-foreground";
  }
};

const getRiskDotColor = (riskLevel: string): string => {
  switch (riskLevel) {
    case "Low":
      return "bg-blue-400";
    case "Medium":
      return "bg-yellow-400";
    case "High":
      return "bg-primary";
    default:
      return "bg-muted-foreground";
  }
};

function HistoryItemCard({
  query,
  index,
  onDelete,
}: {
  query: Query;
  index: number;
  onDelete: (timestamp: bigint) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(query.timestamp);
  };

  return (
    <motion.div
      data-ocid={`history.item.${index + 1}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="rounded-2xl border border-border bg-card shadow-card-dark overflow-hidden"
    >
      {/* Card header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        data-ocid={`history.item.${index + 1}.toggle`}
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-3 hover:bg-secondary/40 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground truncate">
              {formatDateTime(query.timestamp)}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              <IndianRupee className="w-4 h-4 text-foreground" />
              <span className="text-foreground font-bold text-base leading-none">
                {formatCurrencyINR(query.budget)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${getRiskDotColor(query.riskLevel)}`}
              />
              <span
                className={`text-sm font-semibold ${getRiskColor(query.riskLevel)}`}
              >
                {query.riskLevel} Risk
              </span>
            </div>
            <Badge
              variant="outline"
              className="text-xs border-border text-muted-foreground"
            >
              {query.suggestions.length} suggestions
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Delete button */}
          <button
            type="button"
            data-ocid={`history.item.${index + 1}.delete_button`}
            onClick={handleDelete}
            aria-label="Delete this entry"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Expand chevron */}
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="p-1.5"
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        </div>
      </button>

      {/* Expandable suggestions */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="suggestions"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-5 pb-5 pt-1 border-t border-border/60">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">
                Suggestions
              </p>
              <div className="flex flex-col gap-2.5">
                {query.suggestions.map((asset, si) => (
                  <div
                    key={`${asset.ticker}-${si}`}
                    data-ocid={`history.item.${index + 1}.suggestion.${si + 1}`}
                    className="rounded-xl border border-border/70 bg-secondary/40 p-3.5"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge
                          variant="outline"
                          className={`text-xs font-bold border-border shrink-0 ${getRiskColor(query.riskLevel)}`}
                        >
                          {asset.ticker}
                        </Badge>
                        <span className="text-sm font-semibold text-foreground truncate">
                          {asset.name}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-primary font-bold">
                          {asset.allocation}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrencyINR(asset.rupeeAmount)}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                      {asset.reason}
                    </p>
                    <div className="flex justify-end">
                      <span className="text-xs text-muted-foreground font-medium bg-secondary px-2 py-0.5 rounded-full border border-border/60">
                        Risk Score: {Number(asset.riskScore)}/10
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function HistorySkeletonCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <Skeleton className="h-3 w-32 rounded" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-24 rounded" />
        <Skeleton className="h-4 w-20 rounded" />
      </div>
    </div>
  );
}

export function HistoryScreen() {
  const { actor } = useActor(createActor);
  const [queries, setQueries] = useState<Query[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!actor) return;

    let cancelled = false;
    void (async () => {
      try {
        const history = await actor.getQueryHistory();
        if (cancelled) return;
        // Sort newest first
        const sorted = [...history].sort(
          (a, b) => Number(b.timestamp) - Number(a.timestamp),
        );
        setQueries(sorted);
      } catch {
        toast.error("Failed to load history.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [actor]);

  const handleDeleteOne = (timestamp: bigint) => {
    setQueries((prev) => prev.filter((q) => q.timestamp !== timestamp));
    toast.success("Entry removed.");
  };

  const handleClearAll = () => {
    setQueries([]);
    toast.success("History cleared.");
  };

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 pb-28">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h2 className="text-2xl font-bold text-foreground">Query History</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Your past investment queries
          </p>
        </div>

        {!isLoading && queries.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                data-ocid="history.clear_all.open_modal_button"
                variant="outline"
                size="sm"
                className="rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive/70 hover:text-destructive transition-colors"
              >
                Clear All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent
              data-ocid="history.clear_all.dialog"
              className="bg-card border-border text-foreground"
            >
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">
                  Clear all history?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  This will remove all past investment queries from view. This
                  action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  data-ocid="history.clear_all.cancel_button"
                  className="bg-secondary border-border text-foreground hover:bg-secondary/80"
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  data-ocid="history.clear_all.confirm_button"
                  onClick={handleClearAll}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Clear All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </motion.div>

      {/* Loading skeletons */}
      {isLoading && (
        <motion.div
          data-ocid="history.loading_state"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col gap-4"
        >
          <HistorySkeletonCard />
          <HistorySkeletonCard />
          <HistorySkeletonCard />
        </motion.div>
      )}

      {/* Empty state */}
      {!isLoading && queries.length === 0 && (
        <motion.div
          data-ocid="history.empty_state"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-card border border-border flex items-center justify-center mb-5">
            <Clock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-foreground font-semibold text-lg mb-2">
            No history yet
          </h3>
          <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
            Your investment queries will appear here. Head to Home to get your
            first AI-powered suggestions.
          </p>
        </motion.div>
      )}

      {/* History list */}
      {!isLoading && queries.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex flex-col gap-4"
          data-ocid="history.list"
        >
          <AnimatePresence mode="popLayout">
            {queries.map((query, i) => (
              <HistoryItemCard
                key={String(query.timestamp)}
                query={query}
                index={i}
                onDelete={handleDeleteOne}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </main>
  );
}
