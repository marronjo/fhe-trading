import { TabConfig, TabType } from "./Tab";

interface TabSelectorProps {
  tabs: TabConfig[];
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function TabSelector({ tabs, activeTab, onTabChange }: TabSelectorProps) {
  return (
    <div className="flex justify-between mb-4">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === tab.id
              ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white"
              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
