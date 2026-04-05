import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle,
  Clock,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useAddInvestment,
  useClearManualPrice,
  useDeleteInvestment,
  useGetInvestments,
  useGetManualPrice,
  useGetStockPrice,
  useSaveManualPrice,
} from "../hooks/useQueries";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

function SummaryBar({
  totalInvested,
  totalCurrent,
  pricesLoading,
}: {
  totalInvested: number;
  totalCurrent: number;
  pricesLoading: boolean;
}) {
  const totalPL = totalCurrent - totalInvested;
  const totalPLPct = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
  const isPositive = totalPL >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-border bg-card p-5 mb-6 shadow-card-dark"
      data-ocid="portfolio.card"
    >
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-4">
        Portfolio Overview
      </p>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Total Invested</p>
          <p className="text-base font-bold text-foreground">
            {fmt(totalInvested)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Current Value</p>
          {pricesLoading ? (
            <Skeleton className="h-5 w-24 rounded bg-secondary" />
          ) : (
            <p className="text-base font-bold text-foreground">
              {fmt(totalCurrent)}
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Profit / Loss</p>
          {pricesLoading ? (
            <Skeleton className="h-5 w-20 rounded bg-secondary" />
          ) : (
            <div className="flex items-center gap-1.5">
              {isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
              <p
                className={`text-base font-bold ${
                  isPositive ? "text-green-400" : "text-red-400"
                }`}
              >
                {isPositive ? "+" : ""}
                {fmt(totalPL)}
                <span className="text-xs font-medium ml-1 opacity-80">
                  ({isPositive ? "+" : ""}
                  {totalPLPct.toFixed(1)}%)
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Returns live current value for a single card, plus loading/unavailable state.
function useCardPrice(stockName: string, quantity: number) {
  const {
    data: livePrice,
    isLoading,
    isError,
  } = useGetStockPrice(stockName, true);

  const priceUnavailable =
    !isLoading && (isError || livePrice === undefined || livePrice === 0);
  const currentValue =
    isLoading || livePrice === undefined || livePrice === 0
      ? null
      : livePrice * quantity;

  return {
    livePrice: livePrice ?? 0,
    currentValue,
    isLoading,
    priceUnavailable,
  };
}

function InvestmentCard({
  entry,
  index,
  onDelete,
  isDeleting,
}: {
  entry: {
    id: bigint;
    stockName: string;
    quantity: number;
    buyPrice: number;
  };
  index: number;
  onDelete: (id: bigint) => void;
  isDeleting: boolean;
}) {
  const totalInvested = entry.quantity * entry.buyPrice;
  const {
    livePrice,
    currentValue,
    isLoading: isPriceLoading,
    priceUnavailable,
  } = useCardPrice(entry.stockName, entry.quantity);

  const { data: manualPrice } = useGetManualPrice(entry.stockName, true);
  const { mutate: saveManualPrice, isPending: isSaving } = useSaveManualPrice();
  const { mutate: clearManualPrice, isPending: isClearing } =
    useClearManualPrice();

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const hasManualOverride = manualPrice !== null && manualPrice !== undefined;

  const pl = currentValue !== null ? currentValue - totalInvested : null;
  const plPct =
    pl !== null && totalInvested > 0 ? (pl / totalInvested) * 100 : null;
  const isPositive = pl !== null ? pl >= 0 : true;

  const handleStartEdit = () => {
    // Pre-fill with current live price or manual price
    const prefilledPrice = hasManualOverride
      ? manualPrice
      : livePrice > 0
        ? livePrice
        : entry.buyPrice;
    setEditValue(prefilledPrice.toFixed(2));
    setIsEditing(true);
  };

  const handleSave = () => {
    const parsed = Number.parseFloat(editValue);
    if (Number.isNaN(parsed) || parsed <= 0) {
      toast.error("Enter a valid price greater than 0.");
      return;
    }
    saveManualPrice(
      { ticker: entry.stockName, price: parsed },
      {
        onSuccess: () => {
          toast.success(`Manual price set for ${entry.stockName}`);
          setIsEditing(false);
        },
        onError: () => toast.error("Failed to save price. Try again."),
      },
    );
  };

  const handleClearOverride = () => {
    clearManualPrice(entry.stockName, {
      onSuccess: () => {
        toast.success(`Reverted to live price for ${entry.stockName}`);
      },
      onError: () => toast.error("Failed to clear override. Try again."),
    });
  };

  return (
    <motion.div
      data-ocid={`portfolio.item.${index + 1}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, scale: 0.96 }}
      transition={{
        duration: 0.4,
        delay: index * 0.06,
        ease: [0.4, 0, 0.2, 1],
      }}
      className="group relative rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-bold text-xs">
              {entry.stockName.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-foreground font-bold text-sm leading-tight">
                {entry.stockName}
              </h3>
              {hasManualOverride && (
                <span className="text-[10px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded font-semibold">
                  Manual
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-xs mt-0.5">
              {entry.quantity} shares @ {fmt(entry.buyPrice)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Edit price button */}
          <button
            type="button"
            onClick={handleStartEdit}
            disabled={isSaving || isClearing}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary"
            aria-label={`Edit price for ${entry.stockName}`}
            title="Set manual price"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {/* Clear override button — only if manual override is active */}
          {hasManualOverride && (
            <button
              type="button"
              onClick={handleClearOverride}
              disabled={isClearing}
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-lg hover:bg-blue-500/10 text-muted-foreground hover:text-blue-400"
              aria-label={`Reset to live price for ${entry.stockName}`}
              title="Restore live price"
            >
              {isClearing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          {/* Delete button */}
          <button
            type="button"
            data-ocid={`portfolio.delete_button.${index + 1}`}
            onClick={() => onDelete(entry.id)}
            disabled={isDeleting}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-red-400 disabled:opacity-30"
            aria-label={`Remove ${entry.stockName}`}
          >
            {isDeleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Inline price editor */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mb-3 p-3 rounded-lg bg-secondary border border-border">
              <p className="text-xs text-muted-foreground mb-2">
                Set current price for{" "}
                <span className="font-semibold text-foreground">
                  {entry.stockName}
                </span>{" "}
                (overrides live price)
              </p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                    ₹
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave();
                      if (e.key === "Escape") setIsEditing(false);
                    }}
                    className="pl-6 h-8 bg-card border-border text-foreground text-xs rounded-lg"
                    autoFocus
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="h-8 px-2.5 rounded-lg bg-primary text-primary-foreground"
                >
                  {isSaving ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="h-8 px-2.5 rounded-lg border-border"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Invested</p>
          <p className="text-xs font-semibold text-foreground">
            {fmt(totalInvested)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Current</p>
          {isPriceLoading ? (
            <Skeleton className="h-3.5 w-16 rounded bg-secondary mt-0.5" />
          ) : priceUnavailable ? (
            <p className="text-xs text-muted-foreground italic">Price N/A</p>
          ) : (
            <p className="text-xs font-semibold text-foreground">
              {fmt(currentValue!)}
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">P&amp;L</p>
          {isPriceLoading ? (
            <Skeleton className="h-3.5 w-14 rounded bg-secondary mt-0.5" />
          ) : priceUnavailable || pl === null ? (
            <p className="text-xs text-muted-foreground italic">--</p>
          ) : (
            <p
              className={`text-xs font-bold ${
                isPositive ? "text-green-400" : "text-red-400"
              }`}
            >
              {isPositive ? "+" : ""}
              {fmt(pl)}
              <span className="ml-1 opacity-80">
                ({isPositive ? "+" : ""}
                {plPct!.toFixed(1)}%)
              </span>
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Aggregates live prices for all investments to compute portfolio totals.
// Each ticker is fetched independently; unavailable ones are excluded from totals.
function usePortfolioTotals(
  investments: Array<{ stockName: string; quantity: number; buyPrice: number }>,
) {
  // We need a fixed set of hooks -- call for up to 20 tickers (enough for any real portfolio).
  // Unused slots are disabled via enabled=false.
  const slots = Array.from({ length: 20 }, (_, i) => investments[i]);

  const p0 = useGetStockPrice(slots[0]?.stockName ?? "", !!slots[0]);
  const p1 = useGetStockPrice(slots[1]?.stockName ?? "", !!slots[1]);
  const p2 = useGetStockPrice(slots[2]?.stockName ?? "", !!slots[2]);
  const p3 = useGetStockPrice(slots[3]?.stockName ?? "", !!slots[3]);
  const p4 = useGetStockPrice(slots[4]?.stockName ?? "", !!slots[4]);
  const p5 = useGetStockPrice(slots[5]?.stockName ?? "", !!slots[5]);
  const p6 = useGetStockPrice(slots[6]?.stockName ?? "", !!slots[6]);
  const p7 = useGetStockPrice(slots[7]?.stockName ?? "", !!slots[7]);
  const p8 = useGetStockPrice(slots[8]?.stockName ?? "", !!slots[8]);
  const p9 = useGetStockPrice(slots[9]?.stockName ?? "", !!slots[9]);
  const p10 = useGetStockPrice(slots[10]?.stockName ?? "", !!slots[10]);
  const p11 = useGetStockPrice(slots[11]?.stockName ?? "", !!slots[11]);
  const p12 = useGetStockPrice(slots[12]?.stockName ?? "", !!slots[12]);
  const p13 = useGetStockPrice(slots[13]?.stockName ?? "", !!slots[13]);
  const p14 = useGetStockPrice(slots[14]?.stockName ?? "", !!slots[14]);
  const p15 = useGetStockPrice(slots[15]?.stockName ?? "", !!slots[15]);
  const p16 = useGetStockPrice(slots[16]?.stockName ?? "", !!slots[16]);
  const p17 = useGetStockPrice(slots[17]?.stockName ?? "", !!slots[17]);
  const p18 = useGetStockPrice(slots[18]?.stockName ?? "", !!slots[18]);
  const p19 = useGetStockPrice(slots[19]?.stockName ?? "", !!slots[19]);

  const priceQueries = [
    p0,
    p1,
    p2,
    p3,
    p4,
    p5,
    p6,
    p7,
    p8,
    p9,
    p10,
    p11,
    p12,
    p13,
    p14,
    p15,
    p16,
    p17,
    p18,
    p19,
  ].slice(0, investments.length);

  const pricesLoading = priceQueries.some((q) => q.isLoading);

  const totalInvested = investments.reduce(
    (sum, e) => sum + e.quantity * e.buyPrice,
    0,
  );

  // Sum current values only for investments where price is available (> 0).
  // For unavailable prices, fall back to invested value (no P&L shown).
  let totalCurrent = 0;
  for (let i = 0; i < investments.length; i++) {
    const price = priceQueries[i]?.data;
    const inv = investments[i];
    if (price && price > 0) {
      totalCurrent += price * inv.quantity;
    } else {
      totalCurrent += inv.quantity * inv.buyPrice; // neutral fallback
    }
  }

  return { totalInvested, totalCurrent, pricesLoading };
}

// ─── Risk Analysis Panel ───────────────────────────────────────────────────

type RiskWarning = {
  severity: "high" | "caution";
  label: string;
  detail: string;
};

function computeRiskWarnings(
  investments: Array<{ stockName: string; quantity: number; buyPrice: number }>,
  totalInvested: number,
): RiskWarning[] {
  const warnings: RiskWarning[] = [];

  if (totalInvested <= 0) return warnings;

  // Check A — Concentration risk per stock (> 40%)
  for (const inv of investments) {
    const weight = ((inv.quantity * inv.buyPrice) / totalInvested) * 100;
    if (weight > 40) {
      warnings.push({
        severity: "high",
        label: "High Concentration Risk",
        detail: `${inv.stockName} makes up ${weight.toFixed(1)}% of your portfolio. Consider reducing exposure.`,
      });
    }
  }

  // Check B — Diversification (fewer than 5 holdings)
  if (investments.length < 5) {
    warnings.push({
      severity: "caution",
      label: "Under-Diversified Portfolio",
      detail:
        "Your portfolio may be under-diversified. Diversification helps reduce risk by spreading investments across multiple stocks and sectors.",
    });
  }

  return warnings;
}

function RiskWarningCard({
  warning,
  index,
}: {
  warning: RiskWarning;
  index: number;
}) {
  const isHigh = warning.severity === "high";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07 }}
      className={`flex items-start gap-3 rounded-xl border p-4 ${
        isHigh
          ? "border-red-500/25 bg-red-500/8 border-l-4 border-l-red-500"
          : "border-amber-500/25 bg-amber-500/8 border-l-4 border-l-amber-500"
      }`}
    >
      <div
        className={`mt-0.5 shrink-0 ${isHigh ? "text-red-400" : "text-amber-400"}`}
      >
        {isHigh ? (
          <AlertTriangle className="w-4 h-4" />
        ) : (
          <AlertCircle className="w-4 h-4" />
        )}
      </div>
      <div className="min-w-0">
        <p
          className={`text-sm font-bold leading-tight ${
            isHigh ? "text-red-400" : "text-amber-400"
          }`}
        >
          {warning.label}
        </p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {warning.detail}
        </p>
      </div>
    </motion.div>
  );
}

function RiskAnalysisPanel({
  investments,
  totalInvested,
}: {
  investments: Array<{ stockName: string; quantity: number; buyPrice: number }>;
  totalInvested: number;
}) {
  const warnings = computeRiskWarnings(investments, totalInvested);
  const hasWarnings = warnings.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="mt-6 rounded-2xl border border-border bg-card p-5"
      data-ocid="portfolio.panel"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <AlertTriangle className="w-3.5 h-3.5 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Risk Analysis
          </h3>
          <p className="text-xs text-muted-foreground">
            Portfolio Diversification Rules
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border mb-4" />

      {hasWarnings ? (
        <div className="flex flex-col gap-3">
          {warnings.map((warning, i) => (
            <RiskWarningCard
              key={`${warning.severity}-${i}`}
              warning={warning}
              index={i}
            />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-center gap-3 rounded-xl border border-green-500/25 bg-green-500/8 p-4"
          data-ocid="portfolio.success_state"
        >
          <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
          <div>
            <p className="text-sm font-bold text-green-400">
              Portfolio Looks Healthy
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              No concentration or diversification issues detected.
            </p>
          </div>
        </motion.div>
      )}

      {/* Footer rule summary */}
      <div className="mt-4 pt-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold mb-2">
          Flagged when
        </p>
        <ul className="space-y-1">
          <li className="flex items-center gap-2 text-xs text-muted-foreground/70">
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
            Single stock &gt; 40% of total portfolio weight
          </li>
          <li className="flex items-center gap-2 text-xs text-muted-foreground/70">
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
            Fewer than 5 holdings (insufficient spread)
          </li>
        </ul>
      </div>
    </motion.div>
  );
}

// ─── Add Investment Form ───────────────────────────────────────────────────

function AddInvestmentForm({
  onAdd,
  isAdding,
}: {
  onAdd: (data: {
    stockName: string;
    quantity: number;
    buyPrice: number;
  }) => void;
  isAdding: boolean;
}) {
  const [stockName, setStockName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!stockName.trim()) errs.stockName = "Ticker symbol is required.";
    const qty = Number.parseFloat(quantity);
    if (!quantity || Number.isNaN(qty) || qty <= 0)
      errs.quantity = "Enter a valid quantity.";
    const price = Number.parseFloat(buyPrice);
    if (!buyPrice || Number.isNaN(price) || price <= 0)
      errs.buyPrice = "Enter a valid price.";
    return errs;
  };

  const handleSubmit = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    onAdd({
      stockName: stockName.trim().toUpperCase(),
      quantity: Number.parseFloat(quantity),
      buyPrice: Number.parseFloat(buyPrice),
    });
    setStockName("");
    setQuantity("");
    setBuyPrice("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="rounded-2xl border border-border bg-card p-5 mb-6"
      data-ocid="portfolio.panel"
    >
      <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-1">
        Add Investment
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Enter NSE or BSE ticker symbols (e.g.{" "}
        <span className="text-primary font-medium">TCS.BSE</span>,{" "}
        <span className="text-primary font-medium">RELIANCE.NSE</span>)
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
        {/* Stock Ticker */}
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="stock-name"
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          >
            Ticker Symbol
          </Label>
          <Input
            id="stock-name"
            data-ocid="portfolio.input"
            placeholder="e.g. TCS.BSE"
            value={stockName}
            onChange={(e) => {
              setStockName(e.target.value);
              setErrors((p) => ({ ...p, stockName: "" }));
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="h-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-primary/20 rounded-xl text-sm"
          />
          {errors.stockName && (
            <p
              data-ocid="portfolio.error_state"
              className="text-destructive text-xs"
            >
              {errors.stockName}
            </p>
          )}
        </div>

        {/* Quantity */}
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="quantity"
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          >
            Quantity
          </Label>
          <Input
            id="quantity"
            data-ocid="portfolio.input"
            type="number"
            min="0"
            step="any"
            placeholder="10"
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              setErrors((p) => ({ ...p, quantity: "" }));
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="h-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-primary/20 rounded-xl text-sm"
          />
          {errors.quantity && (
            <p className="text-destructive text-xs">{errors.quantity}</p>
          )}
        </div>

        {/* Buy Price */}
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="buy-price"
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          >
            Buy Price (₹)
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              ₹
            </span>
            <Input
              id="buy-price"
              data-ocid="portfolio.input"
              type="number"
              min="0"
              step="any"
              placeholder="1500.00"
              value={buyPrice}
              onChange={(e) => {
                setBuyPrice(e.target.value);
                setErrors((p) => ({ ...p, buyPrice: "" }));
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="pl-7 h-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-primary/20 rounded-xl text-sm"
            />
          </div>
          {errors.buyPrice && (
            <p className="text-destructive text-xs">{errors.buyPrice}</p>
          )}
        </div>

        {/* Submit */}
        <Button
          data-ocid="portfolio.submit_button"
          onClick={handleSubmit}
          disabled={isAdding}
          className="h-10 px-4 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 glow-green-sm transition-all whitespace-nowrap"
        >
          {isAdding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          <span className="ml-1.5">{isAdding ? "Adding..." : "Add"}</span>
        </Button>
      </div>
    </motion.div>
  );
}

export function PortfolioScreen() {
  const { data: investments = [], isLoading, isError } = useGetInvestments();
  const { mutate: addInvestment, isPending: isAdding } = useAddInvestment();
  const { mutate: deleteInvestment, isPending: isDeleting } =
    useDeleteInvestment();

  const { totalInvested, totalCurrent, pricesLoading } =
    usePortfolioTotals(investments);

  const queryClient = useQueryClient();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Track previous value to detect transition from true -> false
  const prevPricesLoadingRef = useRef(pricesLoading);
  useEffect(() => {
    if (
      prevPricesLoadingRef.current === true &&
      pricesLoading === false &&
      investments.length > 0
    ) {
      setLastUpdated(new Date());
    }
    prevPricesLoadingRef.current = pricesLoading;
  }, [pricesLoading, investments.length]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["stockPrice"] });
  };

  const handleAdd = (data: {
    stockName: string;
    quantity: number;
    buyPrice: number;
  }) => {
    addInvestment(data, {
      onError: () => toast.error("Failed to add investment. Please try again."),
    });
  };

  const handleDelete = (id: bigint) => {
    deleteInvestment(id, {
      onError: () =>
        toast.error("Failed to remove investment. Please try again."),
    });
  };

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 pb-24">
      {/* Page title */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-foreground">My Portfolio</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Track your investments and monitor performance.
            </p>
          </div>

          {/* Refresh button — only shown when there are investments */}
          {investments.length > 0 && (
            <Button
              data-ocid="portfolio.secondary_button"
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={pricesLoading}
              className="h-9 px-3 rounded-xl border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 flex items-center gap-2 shrink-0"
              aria-label="Refresh stock prices"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${pricesLoading ? "animate-spin" : ""}`}
              />
              <span className="text-xs font-semibold">
                {pricesLoading ? "Updating..." : "Refresh"}
              </span>
            </Button>
          )}
        </div>

        {/* Last updated timestamp */}
        <AnimatePresence>
          {lastUpdated !== null && investments.length > 0 && (
            <motion.div
              key="timestamp"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-1.5 mt-2"
              data-ocid="portfolio.success_state"
            >
              <Clock className="w-3 h-3 text-muted-foreground/60" />
              <p className="text-xs text-muted-foreground/60">
                Prices updated at{" "}
                <span className="font-medium text-muted-foreground">
                  {lastUpdated.toLocaleTimeString("en-IN")}
                </span>{" "}
                · auto-refreshes every 30s
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Add form */}
      <AddInvestmentForm onAdd={handleAdd} isAdding={isAdding} />

      {/* Summary bar — only when there are entries */}
      {investments.length > 0 && (
        <SummaryBar
          totalInvested={totalInvested}
          totalCurrent={totalCurrent}
          pricesLoading={pricesLoading}
        />
      )}

      {/* Investment list */}
      {isLoading ? (
        <div
          data-ocid="portfolio.loading_state"
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              className="h-32 rounded-xl bg-card border border-border"
            />
          ))}
        </div>
      ) : isError ? (
        <motion.div
          data-ocid="portfolio.error_state"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
            <TrendingDown className="w-7 h-7 text-destructive" />
          </div>
          <h3 className="text-foreground font-semibold mb-1">
            Failed to load portfolio
          </h3>
          <p className="text-muted-foreground text-sm">
            Please check your connection and try again.
          </p>
        </motion.div>
      ) : investments.length === 0 ? (
        <motion.div
          data-ocid="portfolio.empty_state"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-card border border-border flex items-center justify-center mb-4">
            <TrendingUp className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-foreground font-semibold mb-2">
            No investments yet
          </h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            Add your first investment above to start tracking your portfolio.
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {investments.map((entry, i) => (
              <InvestmentCard
                key={String(entry.id)}
                entry={entry}
                index={i}
                onDelete={handleDelete}
                isDeleting={isDeleting}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Risk Analysis Panel — only when portfolio has entries */}
      {investments.length > 0 && (
        <RiskAnalysisPanel
          investments={investments}
          totalInvested={totalInvested}
        />
      )}
    </main>
  );
}
