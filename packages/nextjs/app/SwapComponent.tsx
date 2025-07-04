import { useState } from "react";

export function SwapComponent() {
  const [tab, setTab] = useState<"swap" | "limit">("swap");

  return (
    <div className="max-w-md mx-auto mt-10 bg-white dark:bg-neutral-900 rounded-2xl shadow-lg p-6 space-y-6">
      {/* Tabs */}
      <div className="flex justify-between mb-4">
        <button
          onClick={() => setTab("swap")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            tab === "swap"
              ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white"
              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
          }`}
        >
          Swap
        </button>
        <button
          onClick={() => setTab("limit")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            tab === "limit"
              ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white"
              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
          }`}
        >
          Limit
        </button>
      </div>

      {/* Token Inputs */}
      <div className="space-y-4">
        <div className="bg-neutral-100 dark:bg-neutral-800 rounded-xl px-4 py-3">
          <div className="flex justify-between items-center">
            <input type="number" placeholder="0.0" className="bg-transparent text-lg font-medium w-full outline-none" />
            <span className="ml-2 text-sm text-neutral-500">ETH</span>
          </div>
        </div>

        <div className="bg-neutral-100 dark:bg-neutral-800 rounded-xl px-4 py-3">
          <div className="flex justify-between items-center">
            <input type="number" placeholder="0.0" className="bg-transparent text-lg font-medium w-full outline-none" />
            <span className="ml-2 text-sm text-neutral-500">USDC</span>
          </div>
        </div>
      </div>

      {/* Button */}
      <button className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white text-base py-3 rounded-xl hover:opacity-90">
        {tab === "swap" ? "Swap" : "Place Limit Order"}
      </button>
    </div>
  );
}
