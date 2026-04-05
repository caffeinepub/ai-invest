import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Asset, PortfolioEntry, Query } from "../backend.d";
import { useActor } from "./useActor";

export function useQueryHistory() {
  const { actor, isFetching } = useActor();
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
  const { actor } = useActor();
  return useMutation<Asset[], Error, { budget: number; riskLevel: string }>({
    mutationFn: async ({ budget, riskLevel }) => {
      if (!actor) throw new Error("No actor available");
      return actor.getInvestmentSuggestions(budget, riskLevel);
    },
  });
}

export function useGetInvestments() {
  const { actor, isFetching } = useActor();
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
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<
    PortfolioEntry,
    Error,
    { stockName: string; quantity: number; buyPrice: number }
  >({
    mutationFn: async ({ stockName, quantity, buyPrice }) => {
      if (!actor) throw new Error("No actor available");
      return actor.addInvestment(stockName, quantity, buyPrice);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
    },
  });
}

export function useDeleteInvestment() {
  const { actor } = useActor();
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
  const { actor, isFetching } = useActor();
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
  const { actor } = useActor();
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
  const { actor } = useActor();
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
  const { actor, isFetching } = useActor();
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
