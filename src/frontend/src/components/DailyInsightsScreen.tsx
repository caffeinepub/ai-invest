import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CalendarDays, RefreshCw, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import {
  useGetDailyInsight,
  useRefreshDailyInsight,
} from "../hooks/useQueries";

const getRiskBadgeClass = (riskLevel: string): string => {
  switch (riskLevel.toLowerCase()) {
    case "low":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "medium":
      return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
    case "high":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

const formatFetchedAt = (fetchedAt: bigint): string => {
  const date = new Date(Number(fetchedAt / 1_000_000n));
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

function InsightSkeleton() {
  return (
    <div
      data-ocid="daily-insight.loading_state"
      className="rounded-2xl border border-border bg-card p-6 space-y-5"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <Skeleton className="h-5 w-28" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-10 w-full rounded-xl" />
    </div>
  );
}

export function DailyInsightsScreen() {
  const { data: insight, isLoading, isError, refetch } = useGetDailyInsight();
  const refresh = useRefreshDailyInsight();

  const handleRefresh = () => {
    refresh.mutate(undefined, {
      onError: () => {
        void refetch();
      },
    });
  };

  const isRefreshing = refresh.isPending;

  return (
    <main className="flex-1 max-w-lg mx-auto w-full px-4 sm:px-6 py-8 pb-24">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="mb-7"
      >
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Daily Insights
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
          One AI-powered investment pick, refreshed every day for the Indian
          market.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {/* Loading skeleton */}
        {isLoading && <InsightSkeleton />}

        {/* Error state */}
        {isError && !isLoading && (
          <div
            data-ocid="daily-insight.error_state"
            className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-6 flex flex-col items-center gap-4 text-center"
          >
            <AlertTriangle className="w-10 h-10 text-yellow-400" />
            <div>
              <p className="text-foreground font-semibold mb-1">
                Couldn't load today's insight
              </p>
              <p className="text-muted-foreground text-sm">
                There was a problem fetching the AI suggestion. Try again in a
                moment.
              </p>
            </div>
            <Button
              data-ocid="daily-insight.retry_button"
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              className="rounded-xl border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              Retry
            </Button>
          </div>
        )}

        {/* Insight card */}
        {insight && !isLoading && (
          <div
            data-ocid="daily-insight.card"
            className="rounded-2xl border border-border bg-card shadow-card-dark overflow-hidden"
          >
            {/* Card header strip */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                <CalendarDays className="w-3.5 h-3.5" />
                Today's Pick
              </div>
              <span className="text-muted-foreground text-xs">
                {insight.cachedDate}
              </span>
            </div>

            {/* Main content */}
            <div className="p-6 space-y-5">
              {/* Name + ticker */}
              <div>
                <h2 className="text-2xl font-bold text-foreground leading-tight mb-2">
                  {insight.name}
                </h2>
                <span
                  data-ocid="daily-insight.ticker_badge"
                  className="inline-block font-mono text-xs px-2.5 py-1 rounded-md bg-muted/60 text-muted-foreground border border-border tracking-widest"
                >
                  {insight.ticker}
                </span>
              </div>

              {/* Reason */}
              <p
                data-ocid="daily-insight.reason"
                className="text-muted-foreground text-sm leading-relaxed line-clamp-4"
              >
                {insight.reason}
              </p>

              {/* Risk + timestamp row */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <Badge
                    data-ocid="daily-insight.risk_badge"
                    className={`text-xs font-semibold px-2.5 py-0.5 border rounded-full ${getRiskBadgeClass(insight.riskLevel)}`}
                  >
                    {insight.riskLevel} Risk
                  </Badge>
                </div>
                <span className="text-muted-foreground text-xs">
                  Last fetched:{" "}
                  <span className="text-foreground font-medium">
                    {formatFetchedAt(insight.fetchedAt)}
                  </span>
                </span>
              </div>

              {/* Refresh button */}
              <Button
                data-ocid="daily-insight.refresh_button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all duration-200 disabled:opacity-60"
              >
                {isRefreshing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Insight
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Disclaimer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        data-ocid="daily-insight.disclaimer"
        className="mt-6 text-center text-muted-foreground/60 text-xs leading-relaxed px-2"
      >
        AI suggestions are for educational purposes only. Not financial advice.
        Always consult a SEBI-registered advisor before investing.
      </motion.p>
    </main>
  );
}
