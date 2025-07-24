export interface TabConfig {
  id: TabType;
  label: string;
  buttonText: string;
}

export type TabType = "swap" | "market";
