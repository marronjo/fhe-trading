"use client";

import { useState } from "react";
import { Slot0Display } from "./PoolStateViewComponent";
import { SwapComponent } from "./SwapComponent";
import { TokenFaucet } from "./TokenFaucet";
import type { NextPage } from "next";

type MainTabType = "swap" | "pool" | "faucet";

interface MainTab {
  id: MainTabType;
  label: string;
}

const MAIN_TABS: MainTab[] = [
  { id: "swap", label: "Swap" },
  { id: "faucet", label: "Token Faucet" },
  { id: "pool", label: "Pool" },
];

const Home: NextPage = () => {
  const [activeTab, setActiveTab] = useState<MainTabType>("swap");

  const renderTabContent = () => {
    switch (activeTab) {
      case "swap":
        return <SwapComponent />;
      case "pool":
        return <Slot0Display />;
      case "faucet":
        return <TokenFaucet />;
      default:
        return <SwapComponent />;
    }
  };

  return (
    <>
      <div className="flex items-center flex-col grow pt-10">
        <div className="grow bg-base-300 w-full mt-16 px-8 py-12">
          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="flex space-x-1 bg-neutral-200 dark:bg-neutral-800 rounded-xl p-1">
              {MAIN_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === tab.id
                      ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex justify-center items-center">{renderTabContent()}</div>
        </div>
      </div>
    </>
  );
};

export default Home;
