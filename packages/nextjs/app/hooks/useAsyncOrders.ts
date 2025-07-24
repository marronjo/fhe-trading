import { useState } from "react";

export interface AsyncOrder {
  id: string;
  amount: string;
  fromToken: string;
  toToken: string;
  timestamp: number;
  encryptedValue: bigint;
  status: "executing" | "completed" | "failed";
}

export function useAsyncOrders() {
  const [asyncOrders, setAsyncOrders] = useState<AsyncOrder[]>([]);

  const addAsyncOrder = (order: {
    id: string;
    amount: string;
    fromToken: string;
    toToken: string;
    timestamp: number;
    encryptedValue: bigint;
  }) => {
    setAsyncOrders(prev => [...prev, { ...order, status: "executing" }]);
  };

  const hasOrder = (id: string): boolean => {
    asyncOrders.forEach(order => {
      if (order.id === id) {
        return true;
      }
    });
    return false;
  };

  const updateOrderStatus = (id: string, status: "completed" | "failed") => {
    setAsyncOrders(prev => prev.map(order => (order.id === id ? { ...order, status } : order)));
  };

  return {
    asyncOrders,
    addAsyncOrder,
    updateOrderStatus,
    hasOrder,
  };
}
