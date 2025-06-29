import { useEffect, useState, useCallback } from "react";
import type { AdminUser } from "@/lib/admin/monitoring-service";

interface MonitoringState {
  threats: AdminUser[];
  isLoading: boolean;
  error: Error | null;
  lastCheck: Date | null;
}

export function useAdminMonitoring(enabled: boolean = true) {
  const [state, setState] = useState<MonitoringState>({
    threats: [],
    isLoading: false,
    error: null,
    lastCheck: null,
  });

  const checkAdmins = useCallback(async () => {
    if (!enabled) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch("/api/admin/check-admins", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to parse error response" }));
        throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();

      setState((prev) => ({
        ...prev,
        threats: data.threats || [],
        lastCheck: new Date(data.timestamp),
        isLoading: false,
      }));
    } catch (err) {
      console.error("Error during admin monitoring:", err);
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err : new Error("An unknown error occurred"),
        isLoading: false,
      }));
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    // Initial check on mount
    checkAdmins();

    // Periodic check every 2 minutes
    const intervalId = setInterval(checkAdmins, 2 * 60 * 1000);

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, [enabled, checkAdmins]);

  return {
    ...state,
    forceCheck: checkAdmins, // Expose a function to manually trigger a check
  };
}
