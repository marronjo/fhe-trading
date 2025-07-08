import { useCallback, useEffect, useState } from "react";
import { MarketOrderAbi } from "./constants/MarketOrder";
import { useEncryptInput } from "./useEncryptInput";
import { FheTypes } from "cofhejs/web";
import { useWriteContract } from "wagmi";

// Types
type TabType = "swap" | "market";

const MARKET_ORDER_HOOK_ADDRESS = "0x34DEb2a90744fC6F2F133140dC69952Bb39CC080";
const CIPHER_TOKEN = "0x09fc36Bb906cB720037232697624bcAc48a4a21F";
const MASK_TOKEN = "0x988E23405b307E59c0B63c71191FEB8681C15097";

const poolKey = {
  currency0: CIPHER_TOKEN,
  currency1: MASK_TOKEN,
  fee: 3000,
  tickSpacing: 60,
  hooks: MARKET_ORDER_HOOK_ADDRESS,
};

// 0x09fc36Bb906cB720037232697624bcAc48a4a21F  Cipher Token (CPH)
// 0x988E23405b307E59c0B63c71191FEB8681C15097 Mask Token (MSK)
// 0x34DEb2a90744fC6F2F133140dC69952Bb39CC080 Market Order Hook

interface Token {
  symbol: string;
  value: string;
}

interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
}

interface TabConfig {
  id: TabType;
  label: string;
  buttonText: string;
}

// Mock exchange rates (replace with real API call)
const MOCK_EXCHANGE_RATES: ExchangeRate[] = [
  { from: "CPH", to: "MSK", rate: 1 },
  { from: "MSK", to: "CPH", rate: 1 },
];

const TABS: TabConfig[] = [
  { id: "market", label: "Market", buttonText: "Place Market Order" },
  { id: "swap", label: "Swap", buttonText: "Swap" },
];

// Simulate API call to fetch exchange rates
const fetchExchangeRate = async (from: string, to: string): Promise<number> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200));

  const rate = MOCK_EXCHANGE_RATES.find(r => r.from === from && r.to === to);
  return rate ? rate.rate : 1; // Default to 1 if no rate found
};

//Cipher / Mask Tokens
const DEFAULT_TOKENS: { from: Token; to: Token } = {
  from: { symbol: "CPH", value: "" },
  to: { symbol: "MSK", value: "" },
};

// Component
export function SwapComponent() {
  const [activeTab, setActiveTab] = useState<TabType>("market");
  const [fromToken, setFromToken] = useState<Token>(DEFAULT_TOKENS.from);
  const [toToken, setToToken] = useState<Token>(DEFAULT_TOKENS.to);
  const [isCalculating, setIsCalculating] = useState(false);
  const { isPending, writeContractAsync } = useWriteContract();
  const { onEncryptInput, isEncryptingInput, inputEncryptionDisabled } = useEncryptInput();

  // 🔥 AUTO-CALCULATION LOGIC - This is where the magic happens!
  const calculateOutputAmount = async (inputAmount: string) => {
    if (!inputAmount || isNaN(Number(inputAmount)) || Number(inputAmount) <= 0) {
      setToToken(prev => ({ ...prev, value: "" }));
      return;
    }

    setIsCalculating(true);

    try {
      // Fetch current exchange rate
      const rate = await fetchExchangeRate(fromToken.symbol, toToken.symbol);

      // Calculate output amount
      const outputAmount = Number(inputAmount) * rate;

      // Format to reasonable decimal places
      const formattedAmount = outputAmount.toFixed(6).replace(/\.?0+$/, "");

      // Update to token with calculated amount
      setToToken(prev => ({ ...prev, value: formattedAmount }));
    } catch (error) {
      console.error("Error calculating exchange rate:", error);
      setToToken(prev => ({ ...prev, value: "" }));
    } finally {
      setIsCalculating(false);
    }
  };

  // Auto-calculate when fromToken amount changes
  useEffect(() => {
    calculateOutputAmount(fromToken.value);
  }, [fromToken.value, fromToken.symbol, toToken.symbol]);

  // Handlers
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  const handleTokenSwap = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    // Note: useEffect will automatically recalculate after swap
  };

  const handleFromTokenChange = (value: string) => {
    setFromToken(prev => ({ ...prev, value }));
    // Note: useEffect will trigger calculateOutputAmount automatically
  };

  const handleSubmit = useCallback(() => {
    if (fromToken.value === "") return;

    if (activeTab === "swap") {
      // Handle swap logic
      console.log("Executing swap:", { from: fromToken, to: toToken });
    } else {
      console.log("Placing market order:", { from: fromToken, to: toToken });

      const encryptInputAndSet = async () => {
        const encryptedValue = await onEncryptInput(FheTypes.Uint128, fromToken.value);

        if (!encryptedValue) {
          console.log("VALUE : " + fromToken.value);
          console.log("error encrypting value!");
          return;
        }

        const zeroForOne = fromToken.symbol === "CPH";
        // Send the encrypted value to the smart contract
        writeContractAsync({
          abi: MarketOrderAbi,
          address: MARKET_ORDER_HOOK_ADDRESS,
          functionName: "placeMarketOrder",
          args: [poolKey, zeroForOne, encryptedValue],
        });
      };

      encryptInputAndSet();
    }
  }, [fromToken, writeContractAsync, onEncryptInput]);

  const isSubmitDisabled =
    !fromToken.value || !toToken.value || isPending || isEncryptingInput || inputEncryptionDisabled;

  const currentTabConfig = TABS.find(tab => tab.id === activeTab);

  return (
    <div className="max-w-md mx-auto mt-10 bg-white dark:bg-neutral-900 rounded-2xl shadow-lg p-6 space-y-6">
      {/* Tabs */}
      <TabSelector tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Token Inputs */}
      <div className="space-y-4">
        <TokenInput token={fromToken} placeholder="0.0" onChange={handleFromTokenChange} label="From" />

        <SwapButton onClick={handleTokenSwap} />

        <TokenInput
          token={toToken}
          placeholder="0.0"
          onChange={() => {}} // Read-only now since it's auto-calculated
          label="To"
          readOnly={true}
          isLoading={isCalculating}
        />
      </div>

      {/* Submit Button */}
      <SubmitButton
        text={
          isPending ? "Processing..." : isEncryptingInput ? "Encrypting..." : currentTabConfig?.buttonText || "Submit"
        }
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
      />
    </div>
  );
}

// Sub-components
interface TabSelectorProps {
  tabs: TabConfig[];
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

function TabSelector({ tabs, activeTab, onTabChange }: TabSelectorProps) {
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

interface TokenInputProps {
  token: Token;
  placeholder: string;
  onChange: (value: string) => void;
  label: string;
  readOnly?: boolean;
  isLoading?: boolean;
}

function TokenInput({ token, placeholder, onChange, label, readOnly = false, isLoading = false }: TokenInputProps) {
  return (
    <div
      className={`rounded-xl px-4 py-3 transition-colors ${
        readOnly
          ? "bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700"
          : "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
      }`}
    >
      <div className="flex justify-between items-center">
        <input
          type="number"
          placeholder={placeholder}
          value={token.value}
          onChange={e => onChange(e.target.value)}
          readOnly={readOnly}
          disabled={readOnly}
          className={`bg-transparent text-lg font-medium w-full outline-none transition-colors ${
            readOnly
              ? "cursor-not-allowed text-neutral-400 dark:text-neutral-500 placeholder-neutral-300 dark:placeholder-neutral-600"
              : "text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 focus:text-neutral-900 dark:focus:text-white"
          }`}
          aria-label={`${label} amount`}
        />
        <div className="flex items-center ml-2">
          {isLoading && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent mr-2"></div>
          )}
          <span
            className={`text-sm transition-colors ${
              readOnly ? "text-neutral-400 dark:text-neutral-500" : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            {token.symbol}
          </span>
        </div>
      </div>
      {readOnly && token.value && (
        <div className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">Auto-calculated</div>
      )}
    </div>
  );
}

interface SwapButtonProps {
  onClick: () => void;
}

function SwapButton({ onClick }: SwapButtonProps) {
  return (
    <div className="flex justify-center">
      <button
        onClick={onClick}
        className="bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded-full p-2 transition-colors"
        aria-label="Swap tokens"
      >
        <svg
          className="w-4 h-4 text-neutral-600 dark:text-neutral-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      </button>
    </div>
  );
}

interface SubmitButtonProps {
  text: string;
  onClick: () => void;
  disabled: boolean;
}

function SubmitButton({ text, onClick, disabled }: SubmitButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-white text-base py-3 rounded-xl transition ${
        disabled ? "bg-neutral-400 cursor-not-allowed" : "bg-gradient-to-r from-purple-500 to-blue-500 hover:opacity-90"
      }`}
    >
      {text}
    </button>
  );
}
