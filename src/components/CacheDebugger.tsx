import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

interface CacheQueryState {
  queryKey: readonly unknown[];
  status: string;
  fetchStatus: string;
  dataUpdatedAt: string;
  isStale: boolean;
  observerCount: number;
}

/**
 * Visual component to inspect TanStack Query cache state in real-time.
 * Shows all queries, their status, and cache metadata.
 *
 * Usage: Add <CacheDebugger /> to any component to see live cache state.
 */
export function CacheDebugger() {
  const queryClient = useQueryClient();
  const [cacheState, setCacheState] = useState<CacheQueryState[]>([]);

  useEffect(() => {
    const updateCache = () => {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();

      const state = queries.map((query) => ({
        queryKey: query.queryKey,
        status: query.state.status,
        fetchStatus: query.state.fetchStatus,
        dataUpdatedAt: query.state.dataUpdatedAt ? new Date(query.state.dataUpdatedAt).toLocaleTimeString() : "never",
        isStale: query.isStale(),
        observerCount: query.getObserversCount(),
      }));

      setCacheState(state);
    };

    // Initial update
    updateCache();

    // Subscribe to cache changes
    const unsubscribe = queryClient.getQueryCache().subscribe(updateCache);

    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  return (
    <div className="fixed bottom-4 left-4 bg-black/90 text-white p-4 rounded-lg shadow-xl max-w-lg max-h-96 overflow-auto z-50 text-xs font-mono">
      <div className="font-bold mb-2 text-sm">🔍 Cache Debugger</div>
      {cacheState.length === 0 ? (
        <div className="text-gray-400">No queries in cache</div>
      ) : (
        <div className="space-y-2">
          {cacheState.map((query, index) => (
            <div key={index} className="border-t border-gray-700 pt-2">
              <div className="text-yellow-400">Key: {JSON.stringify(query.queryKey)}</div>
              <div className="text-xs space-y-1 mt-1">
                <div>
                  Status: <span className="text-green-400">{query.status}</span>
                </div>
                <div>
                  Fetch: <span className="text-blue-400">{query.fetchStatus}</span>
                </div>
                <div>
                  Updated: <span className="text-purple-400">{query.dataUpdatedAt}</span>
                </div>
                <div>
                  Stale:{" "}
                  <span className={query.isStale ? "text-red-400" : "text-green-400"}>
                    {query.isStale ? "YES" : "NO"}
                  </span>
                </div>
                <div>
                  Observers: <span className="text-cyan-400">{query.observerCount}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
