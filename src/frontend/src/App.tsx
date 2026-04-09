import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import {
  ArrowLeft,
  ArrowRight,
  BarChart2,
  History,
  Home,
  Loader2,
  LogOut,
  Shield,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createActor } from "./backend";
import { UserRole } from "./backend.d";
import { DailyInsightsScreen } from "./components/DailyInsightsScreen";
import { HeroChart } from "./components/HeroChart";
import { HistoryScreen } from "./components/HistoryScreen";
import { LoginScreen } from "./components/LoginScreen";
import { PortfolioScreen } from "./components/PortfolioScreen";
import { type Suggestion, SuggestionCard } from "./components/SuggestionCard";

type Tab = "home" | "portfolio" | "history" | "dailyInsights";
type Screen = "home" | "results";

interface ResultState {
  suggestions: Suggestion[];
  budget: number;
  riskLevel: string;
}

const NAV_LINKS = ["Markets", "Analytics", "About"];

const formatCurrencyINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

function Header({
  onLogoClick,
  onLogout,
}: {
  onLogoClick: () => void;
  onLogout?: () => void;
}) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={onLogoClick}
          data-ocid="nav.link"
          className="flex items-center gap-2.5 group"
          type="button"
        >
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center glow-green-sm">
            <TrendingUp className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-foreground font-bold text-lg tracking-tight">
            Asset<span className="text-primary">Flow</span>
          </span>
        </button>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <button
              key={link}
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none cursor-pointer"
            >
              {link}
            </button>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {onLogout && (
            <Button
              data-ocid="nav.logout.button"
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="rounded-full border-border text-muted-foreground hover:text-foreground hover:border-destructive/40 hover:text-destructive flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log Out</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function HomeScreen({ onSubmit }: { onSubmit: (result: ResultState) => void }) {
  const [budget, setBudget] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [budgetError, setBudgetError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { actor } = useActor(createActor);

  const handleSubmit = async () => {
    setBudgetError("");
    const budgetNum = Number.parseFloat(budget.replace(/[^0-9.]/g, ""));

    if (!budget || Number.isNaN(budgetNum) || budgetNum <= 0) {
      setBudgetError("Please enter a valid positive amount.");
      return;
    }
    if (!riskLevel) {
      toast.error("Please select a risk level.");
      return;
    }
    if (!actor) {
      toast.error("Connection not ready. Please try again.");
      return;
    }

    setIsLoading(true);
    try {
      const assets = await actor.getInvestmentSuggestions(budgetNum, riskLevel);
      const suggestions: Suggestion[] = assets.map((asset) => ({
        name: asset.name,
        ticker: asset.ticker,
        allocation: asset.allocation,
        rupeeAmount: asset.rupeeAmount,
        reason: asset.reason,
        riskLevel: riskLevel as Suggestion["riskLevel"],
        riskScore: Number(asset.riskScore),
      }));
      onSubmit({ suggestions, budget: budgetNum, riskLevel });
    } catch {
      toast.error("Failed to fetch suggestions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-8 md:pt-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left: Text */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide mb-6">
              <Zap className="w-3 h-3" />
              AI-Powered Portfolio Intelligence
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-[3.25rem] font-bold text-foreground leading-[1.1] tracking-tight mb-5">
              Let AI Optimize Your{" "}
              <span className="text-primary glow-green-text">Investments.</span>
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-md">
              Intelligent portfolio allocation tailored to your budget and risk
              appetite. Powered by on-chain AI that never sleeps.
            </p>
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              {[
                { icon: Shield, text: "Risk-adjusted returns" },
                { icon: TrendingUp, text: "Real-time rebalancing" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: Chart */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="relative hidden md:block"
          >
            <div className="absolute inset-0 rounded-2xl bg-primary/5 blur-3xl" />
            <div className="relative rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
                  Portfolio Performance
                </span>
                <span className="text-primary text-sm font-bold">+38.4%</span>
              </div>
              <HeroChart />
              <div className="flex gap-4 mt-4 pt-4 border-t border-border">
                {[
                  { label: "Total Return", value: "+₹14,823" },
                  { label: "Avg Annual", value: "18.6%" },
                  { label: "Sharpe", value: "1.94" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex-1">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Action Card */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="rounded-2xl border border-border bg-card p-8 md:p-10 shadow-card-dark"
          data-ocid="invest.card"
        >
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-1.5">
              Start Investing Today
            </h2>
            <p className="text-muted-foreground text-sm">
              Enter your details below and our AI will craft a personalized
              portfolio.
            </p>
          </div>

          <div className="grid md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
            {/* Budget input */}
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="budget"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                Investment Amount
              </Label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                  ₹
                </span>
                <Input
                  id="budget"
                  data-ocid="invest.input"
                  type="text"
                  inputMode="decimal"
                  placeholder="25,000"
                  value={budget}
                  onChange={(e) => {
                    setBudget(e.target.value);
                    setBudgetError("");
                  }}
                  className="pl-7 h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:ring-primary/20 rounded-xl"
                />
              </div>
              {budgetError && (
                <p
                  data-ocid="invest.error_state"
                  className="text-destructive text-xs"
                >
                  {budgetError}
                </p>
              )}
            </div>

            {/* Risk level dropdown */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Risk Tolerance
              </Label>
              <Select value={riskLevel} onValueChange={setRiskLevel}>
                <SelectTrigger
                  data-ocid="invest.select"
                  className="h-12 bg-secondary border-border text-foreground focus:border-primary focus:ring-primary/20 rounded-xl"
                >
                  <SelectValue placeholder="Select risk level" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem
                    value="Low"
                    className="text-foreground focus:bg-primary/10 focus:text-primary"
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      Low — Conservative
                    </span>
                  </SelectItem>
                  <SelectItem
                    value="Medium"
                    className="text-foreground focus:bg-primary/10 focus:text-primary"
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-400" />
                      Medium — Balanced
                    </span>
                  </SelectItem>
                  <SelectItem
                    value="High"
                    className="text-foreground focus:bg-primary/10 focus:text-primary"
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      High — Aggressive
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* CTA Button */}
            <Button
              data-ocid="invest.submit_button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="h-12 px-8 rounded-xl bg-primary text-primary-foreground font-bold uppercase tracking-widest text-sm hover:bg-primary/90 glow-green transition-all duration-200 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  Get Suggestions
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Feature pills */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-wrap gap-3 justify-center"
        >
          {[
            "Real-time market analysis",
            "AI-driven allocations",
            "Risk-adjusted returns",
            "Diversified portfolios",
            "On-chain transparency",
          ].map((feature) => (
            <span
              key={feature}
              className="px-4 py-2 rounded-full border border-border bg-card text-muted-foreground text-xs font-medium"
            >
              {feature}
            </span>
          ))}
        </motion.div>
      </section>
    </main>
  );
}

function ResultsScreen({
  result,
  onBack,
}: {
  result: ResultState;
  onBack: () => void;
}) {
  const riskColors: Record<string, string> = {
    Low: "text-blue-400",
    Medium: "text-yellow-400",
    High: "text-primary",
  };

  return (
    <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {/* Back button */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <Button
          data-ocid="results.back_button"
          variant="ghost"
          onClick={onBack}
          className="group flex items-center gap-2 text-muted-foreground hover:text-foreground px-0 hover:bg-transparent"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Button>
      </motion.div>

      {/* Section heading */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mb-10"
      >
        <h2 className="text-3xl font-bold text-foreground mb-2">
          Investment Suggestions
        </h2>
        <p className="text-muted-foreground">
          Personalized portfolio for{" "}
          <span className="text-foreground font-semibold">
            {formatCurrencyINR(result.budget)}
          </span>{" "}
          with{" "}
          <span
            className={`font-semibold ${
              riskColors[result.riskLevel] ?? "text-primary"
            }`}
          >
            {result.riskLevel} Risk
          </span>{" "}
          tolerance
        </p>

        {/* Summary bar */}
        <div className="mt-6 flex flex-wrap gap-4">
          {[
            {
              label: "Total Budget",
              value: formatCurrencyINR(result.budget),
            },
            {
              label: "Suggestions",
              value: `${result.suggestions.length} suggestions`,
            },
            { label: "Risk Profile", value: result.riskLevel },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="px-5 py-3 rounded-xl bg-card border border-border"
            >
              <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
              <p className="text-sm font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Cards grid */}
      {result.suggestions.length === 0 ? (
        <motion.div
          data-ocid="suggestions.empty_state"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-card border border-border flex items-center justify-center mb-4">
            <TrendingUp className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-foreground font-semibold mb-2">
            No suggestions available
          </h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            We couldn&apos;t generate suggestions for these parameters. Try
            adjusting your budget or risk level.
          </p>
          <Button
            onClick={onBack}
            className="mt-6 rounded-full bg-primary text-primary-foreground"
          >
            Try Again
          </Button>
        </motion.div>
      ) : (
        <div
          data-ocid="suggestions.list"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {result.suggestions.map((suggestion, i) => (
            <SuggestionCard
              key={suggestion.ticker}
              suggestion={suggestion}
              index={i}
            />
          ))}
        </div>
      )}
    </main>
  );
}

// Bottom tab bar
function BottomTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}) {
  const tabs: {
    id: Tab;
    label: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { id: "home", label: "Home", icon: Home },
    { id: "portfolio", label: "Portfolio", icon: BarChart2 },
    { id: "history", label: "History", icon: History },
    { id: "dailyInsights", label: "Insights", icon: Sparkles },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur-md"
      aria-label="Main navigation"
    >
      <div className="max-w-md mx-auto flex">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              data-ocid={`nav.${tab.id}.tab`}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-semibold transition-colors duration-200 ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={`w-5 h-5 transition-transform duration-200 ${
                  isActive ? "scale-110" : "scale-100"
                }`}
              />
              <span>{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 h-0.5 w-12 rounded-full bg-primary"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// Full-screen initializing loader
function InitializingScreen() {
  return (
    <div
      data-ocid="app.loading_state"
      className="min-h-screen flex flex-col items-center justify-center bg-background"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center glow-green-sm">
          <TrendingUp className="w-7 h-7 text-primary" />
        </div>
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <p className="text-muted-foreground text-sm">Loading AssetFlow...</p>
      </motion.div>
    </div>
  );
}

export default function App() {
  const { identity, isInitializing, clear } = useInternetIdentity();
  const { actor } = useActor(createActor);

  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [screen, setScreen] = useState<Screen>("home");
  const [result, setResult] = useState<ResultState | null>(null);

  // Auto-register user on first login
  useEffect(() => {
    if (!identity || !actor) return;

    let cancelled = false;
    void (async () => {
      try {
        const role = await actor.getCallerUserRole();
        if (cancelled) return;
        if (role === UserRole.guest) {
          await actor.assignCallerUserRole(
            identity.getPrincipal(),
            UserRole.user,
          );
        }
      } catch {
        // Silent fail — registration will retry on next login
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [identity, actor]);

  const handleSubmit = (res: ResultState) => {
    setResult(res);
    setScreen("results");
  };

  const handleBack = () => {
    setScreen("home");
  };

  const handleLogoClick = () => {
    setScreen("home");
    setActiveTab("home");
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === "home") {
      setScreen("home");
    }
  };

  // Show initializing loader
  if (isInitializing) {
    return <InitializingScreen />;
  }

  // Show login wall if not authenticated
  if (!identity) {
    return <LoginScreen />;
  }

  const showResults = screen === "results" && result !== null;
  const showPortfolio = activeTab === "portfolio" && !showResults;
  const showHistory = activeTab === "history" && !showResults;
  const showDailyInsights = activeTab === "dailyInsights" && !showResults;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Toaster
        theme="dark"
        toastOptions={{
          classNames: {
            toast: "bg-card border-border text-foreground",
          },
        }}
      />
      <Header onLogoClick={handleLogoClick} onLogout={clear} />

      <AnimatePresence mode="wait">
        {showResults ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="flex-1 flex flex-col"
          >
            <ResultsScreen result={result!} onBack={handleBack} />
          </motion.div>
        ) : showPortfolio ? (
          <motion.div
            key="portfolio"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col"
          >
            <PortfolioScreen />
          </motion.div>
        ) : showHistory ? (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col"
          >
            <HistoryScreen />
          </motion.div>
        ) : showDailyInsights ? (
          <motion.div
            key="dailyInsights"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col"
          >
            <DailyInsightsScreen />
          </motion.div>
        ) : (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col"
          >
            <HomeScreen onSubmit={handleSubmit} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer — hidden on portfolio/history/insights to keep layout clean with bottom nav */}
      {!showPortfolio && !showHistory && !showDailyInsights && (
        <footer className="border-t border-border/50 py-6 mt-8 pb-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span>
                © {new Date().getFullYear()} AssetFlow. All rights reserved.
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              Built with <span className="text-red-400">♥</span> using{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                caffeine.ai
              </a>
            </p>
          </div>
        </footer>
      )}

      {/* Bottom tab bar */}
      <BottomTabBar
        activeTab={showResults ? "home" : activeTab}
        onTabChange={handleTabChange}
      />
    </div>
  );
}
