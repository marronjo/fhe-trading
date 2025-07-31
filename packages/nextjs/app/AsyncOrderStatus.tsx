import { useMemo } from "react";
import { AsyncOrder } from "./hooks/useAsyncOrders";

export function AsyncOrderStatus({ orders }: { orders: AsyncOrder[] }) {
  // Deduplicate orders based on ID
  const uniqueOrders = useMemo(() => {
    const seen = new Set<string>();
    return orders.filter(order => {
      if (seen.has(order.id)) {
        console.warn(`Duplicate order detected in display: ${order.id}`);
        return false;
      }
      seen.add(order.id);
      return true;
    });
  }, [orders]);

  if (uniqueOrders.length === 0) return null;

  const queuedCount = uniqueOrders.filter(o => o.status === "executing").length;

  return (
    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full" />
        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{queuedCount} order(s) queued</span>
      </div>
      {uniqueOrders.map(order => (
        <div key={order.id} className="text-xs text-blue-600 dark:text-blue-400 flex justify-between items-center">
          <span>
            {order.amount} {order.fromToken} → {order.toToken}
          </span>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              order.status === "executing"
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                : order.status === "completed"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
            }`}
          >
            {order.status === "executing" ? "queued" : order.status}
          </span>
        </div>
      ))}
    </div>
  );
}
