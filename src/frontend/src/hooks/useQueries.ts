import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createActor } from "../backend";
import type { Asset, DailyInsight, PortfolioEntry, Query } from "../backend.d";

export function useQueryHistory() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Query[]>({
    queryKey: ["queryHistory"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getQueryHistory();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetInvestmentSuggestions() {
  const { actor } = useActor(createActor);
  return useMutation<Asset[], Error, { budget: number; riskLevel: string }>({
    mutationFn: async ({ budget, riskLevel }) => {
      if (!actor) throw new Error("No actor available");
      return actor.getInvestmentSuggestions(budget, riskLevel);
    },
  });
}

export function useGetInvestments() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<PortfolioEntry[]>({
    queryKey: ["investments"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getInvestments();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddInvestment() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation<
    PortfolioEntry,
    Error,
    { stockName: string; quantity: number; buyPrice: number; sector: string }
  >({
    mutationFn: async ({ stockName, quantity, buyPrice, sector }) => {
      if (!actor) throw new Error("No actor available");
      return actor.addInvestment(stockName, quantity, buyPrice, sector);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
    },
  });
}

export function useDeleteInvestment() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, bigint>({
    mutationFn: async (id) => {
      if (!actor) throw new Error("No actor available");
      return actor.deleteInvestment(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
    },
  });
}

// Fetch live stock price for a single ticker via the backend.
// Returns undefined while loading, 0 if unavailable (invalid ticker / API error).
// Auto-refreshes every 30 seconds to track real-time price changes.
export function useGetStockPrice(ticker: string, enabled: boolean) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<number>({
    queryKey: ["stockPrice", ticker],
    queryFn: async () => {
      if (!actor) return 0;
      return actor.getStockPrice(ticker);
    },
    enabled: !!actor && !isFetching && enabled && ticker.trim().length > 0,
    // Auto-refresh every 30 seconds to track real-time price changes
    refetchInterval: 30 * 1000,
    // Cache price; stale after 30s to align with refetch interval
    staleTime: 30 * 1000,
    // Don't retry on failure -- 0 fallback is handled in the UI
    retry: false,
  });
}

// Save a manual price override for a ticker to the backend (persists across sessions)
export function useSaveManualPrice() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation<void, Error, { ticker: string; price: number }>({
    mutationFn: async ({ ticker, price }) => {
      if (!actor) throw new Error("No actor available");
      return actor.saveManualPrice(ticker, price);
    },
    onSuccess: (_data, { ticker }) => {
      // Invalidate this ticker's price so the card re-reads it immediately
      queryClient.invalidateQueries({ queryKey: ["stockPrice", ticker] });
    },
  });
}

// Clear a manual price override (restores live Alpha Vantage fetching)
export function useClearManualPrice() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (ticker) => {
      if (!actor) throw new Error("No actor available");
      return actor.clearManualPrice(ticker);
    },
    onSuccess: (_data, ticker) => {
      queryClient.invalidateQueries({ queryKey: ["stockPrice", ticker] });
    },
  });
}

// Check if a ticker has a manual override saved on the backend
export function useGetManualPrice(ticker: string, enabled: boolean) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<number | null>({
    queryKey: ["manualPrice", ticker],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getManualPrice(ticker);
    },
    enabled: !!actor && !isFetching && enabled && ticker.trim().length > 0,
    staleTime: 60 * 1000,
  });
}

// Auto-suggest sector from a ticker symbol via the backend mapping.
// Debounce usage is handled in the component; enabled=false disables the call.
export function useSuggestSector(ticker: string, enabled: boolean) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<string>({
    queryKey: ["suggestSector", ticker],
    queryFn: async () => {
      if (!actor) return "Other";
      return actor.suggestSector(ticker);
    },
    enabled: !!actor && !isFetching && enabled && ticker.trim().length > 0,
    staleTime: 5 * 60 * 1000, // sector mapping is stable — cache 5 min
    retry: false,
  });
}

// Fetch today's daily AI investment insight.
// staleTime: 0 so it always re-fetches on component mount.
export function useGetDailyInsight() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<DailyInsight>({
    queryKey: ["dailyInsight"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor available");
      return actor.getDailyInsight();
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
    retry: false,
  });
}

// Manually refresh the daily insight (calls backend to re-fetch from AI).
export function useRefreshDailyInsight() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation<DailyInsight, Error, undefined>({
    mutationFn: async () => {
      if (!actor) throw new Error("No actor available");
      return actor.refreshDailyInsight();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyInsight"] });
    },
  });
}
