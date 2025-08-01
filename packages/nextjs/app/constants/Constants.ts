import { TabConfig } from "../Tab";

// Hook / Pool Addresses (Sepolia)
export const MARKET_ORDER_HOOK = "0x31f5b2DbC1497fA726C0240417E6E2c6089EC080";
export const CIPHER_TOKEN = "0x2f4eD4942BdF443aE5da11ac3cAB7bee8d6FaF45";
export const MASK_TOKEN = "0xbD313aDE73Cc114184CdBEf96788dd55118d4911";

export const POOL_ID = "0xb7518d0725ff168e16bb8884084f177fb5457fbde3c7c60f4f81bc53e957ca63";

// Uniswap Contracts (Sepolia)
export const QUOTER = "0x61B3f2011A92d183C7dbaDBdA940a7555Ccf9227";
export const POOL_SWAP = "0x9B6b46e2c869aa39918Db7f52f5557FE577B6eEe";
export const STATE_VIEW = "0xE1Dd9c3fA50EDB962E442f60DfBc432e24537E4C";

// Misc.
export const MIN_SQRT_PRICE = 4295128739n + 1n;
export const MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970342n - 1n;

export const POOL_KEY = {
  currency0: CIPHER_TOKEN,
  currency1: MASK_TOKEN,
  fee: 3000,
  tickSpacing: 60,
  hooks: MARKET_ORDER_HOOK,
};

export const TEST_SETTINGS = {
  takeClaims: false,
  settleUsingBurn: false,
};

export const HOOK_DATA = "0x";

export const DEFAULT_TOKENS = {
  from: { symbol: "CPH", value: "" },
  to: { symbol: "MSK", value: "" },
};

export const TABS: TabConfig[] = [
  { id: "market", label: "Market", buttonText: "Place Market Order" },
  { id: "swap", label: "Swap", buttonText: "Swap" },
];
