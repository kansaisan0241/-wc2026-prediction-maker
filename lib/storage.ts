import type { PredictionState } from "@/lib/types";

export const STORAGE_KEY = "wc2026-prediction-maker";

export function readPredictionFromUrl(): PredictionState | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("p");
  if (!value) return null;

  try {
    return JSON.parse(decodeURIComponent(atob(value))) as PredictionState;
  } catch {
    return null;
  }
}

export function createShareUrl(state: PredictionState) {
  const encoded = btoa(encodeURIComponent(JSON.stringify(state)));
  return `${window.location.origin}${window.location.pathname}?p=${encoded}`;
}
