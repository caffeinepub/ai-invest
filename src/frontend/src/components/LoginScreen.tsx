import { Button } from "@/components/ui/button";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Loader2, Shield, TrendingUp, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export function LoginScreen() {
  const { login, isLoggingIn, isInitializing, isLoginError, loginError } =
    useInternetIdentity();

  const isLoading = isLoggingIn || isInitializing;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-background px-4"
      data-ocid="login.page"
    >
      {/* Background ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-primary/3 blur-[80px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-full max-w-md"
      >
        {/* Card */}
        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-8 md:p-10 shadow-card-dark">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col items-center mb-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 glow-green-sm">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Asset<span className="text-primary">Flow</span>
            </h1>
            <span className="text-xs text-muted-foreground font-medium tracking-widest uppercase mt-1">
              AI Invest
            </span>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center mb-8"
          >
            <h2 className="text-xl font-bold text-foreground mb-2">
              Your AI-Powered Investment Assistant
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Sign in to access personalized investment suggestions, track your
              portfolio, and save your financial history.
            </p>
          </motion.div>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-2 mb-8"
          >
            {[
              { icon: Zap, text: "AI-driven insights" },
              { icon: Shield, text: "Secure & private" },
              { icon: TrendingUp, text: "Portfolio tracking" },
            ].map(({ icon: Icon, text }) => (
              <span
                key={text}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-secondary text-muted-foreground text-xs font-medium"
              >
                <Icon className="w-3 h-3 text-primary" />
                {text}
              </span>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="space-y-3"
          >
            <Button
              data-ocid="login.submit_button"
              onClick={login}
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm tracking-wide hover:bg-primary/90 glow-green transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isInitializing ? "Initializing..." : "Signing in..."}
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Login / Sign Up
                </>
              )}
            </Button>

            {/* Error state */}
            <AnimatePresence>
              {isLoginError && loginError && (
                <motion.p
                  data-ocid="login.error_state"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-destructive text-xs text-center bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
                >
                  {loginError.message}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Footer note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            className="text-center text-xs text-muted-foreground mt-6 flex items-center justify-center gap-1.5"
          >
            <Shield className="w-3 h-3" />
            Secure login powered by Internet Identity
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
