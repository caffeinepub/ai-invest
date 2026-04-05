import { motion } from "motion/react";
import type { Asset } from "../backend.d";

interface AssetCardProps {
  asset: Asset;
  index: number;
  budget: number;
}

export function AssetCard({ asset, index, budget: _budget }: AssetCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <motion.div
      data-ocid={`suggestions.item.${index + 1}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="group relative flex flex-col gap-3 rounded-xl p-5 bg-card border border-border hover:border-primary/40 transition-all duration-300 hover:shadow-glow-green"
    >
      {/* Ticker + Name */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="inline-block px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-bold tracking-widest uppercase border border-primary/20 mb-2">
            {asset.ticker}
          </span>
          <h3 className="text-foreground font-semibold text-sm leading-tight">
            {asset.name}
          </h3>
        </div>
      </div>

      {/* Reason */}
      <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2">
        {asset.reason}
      </p>

      {/* Allocation % + Rupee Amount */}
      <div className="mt-auto pt-3 border-t border-border">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold text-primary glow-green-text leading-none">
              {asset.allocation.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">Allocation</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-foreground">
              {formatCurrency(asset.rupeeAmount)}
            </p>
            <p className="text-xs text-muted-foreground">Invested</p>
          </div>
        </div>
      </div>

      {/* View Details button */}
      <button
        data-ocid={`suggestions.secondary_button.${index + 1}`}
        className="mt-1 w-full rounded-full border border-border py-2 text-xs font-medium text-muted-foreground tracking-wide hover:border-primary/40 hover:text-primary transition-all duration-200"
        type="button"
      >
        View Details
      </button>
    </motion.div>
  );
}
