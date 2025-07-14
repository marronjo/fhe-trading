import { useCallback, useEffect, useMemo, useState } from "react";
import { MarketOrderAbi } from "./constants/MarketOrder";
import { PoolSwapAbi } from "./constants/PoolSwap";
import { QuoterAbi } from "./constants/QuoterAbi";
import { useEncryptInput } from "./useEncryptInput";
import { FheTypes } from "cofhejs/web";
import { formatUnits, parseUnits } from "viem";
import { useReadContract, useWriteContract } from "wagmi";

// Types
type TabType = "swap" | "market";

const MARKET_ORDER_HOOK_ADDRESS = "0x34DEb2a90744fC6F2F133140dC69952Bb39CC080";
const CIPHER_TOKEN = "0x09fc36Bb906cB720037232697624bcAc48a4a21F";
const MASK_TOKEN = "0x988E23405b307E59c0B63c71191FEB8681C15097";

const QUOTER_ADDRESS = "0x61B3f2011A92d183C7dbaDBdA940a7555Ccf9227";

const POOL_SWAP = "0x9B6b46e2c869aa39918Db7f52f5557FE577B6eEe";

const MIN_SQRT_PRICE = 4295128739n + 1n;
const MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970342n - 1n;

const poolKey = {
  currency0: CIPHER_TOKEN,
  currency1: MASK_TOKEN,
  fee: 3000,
  tickSpacing: 60,
  hooks: MARKET_ORDER_HOOK_ADDRESS,
};

const testSettings = {
  takeClaims: false,
  settleUsingBurn: false,
};

const hookData = "0x";

// 0x09fc36Bb906cB720037232697624bcAc48a4a21F  Cipher Token (CPH)
// 0x988E23405b307E59c0B63c71191FEB8681C15097 Mask Token (MSK)
// 0x34DEb2a90744fC6F2F133140dC69952Bb39CC080 Market Order Hook

interface Token {
  symbol: string;
  value: string;
}

interface TabConfig {
  id: TabType;
  label: string;
  buttonText: string;
}

const TABS: TabConfig[] = [
  { id: "market", label: "Market", buttonText: "Place Market Order" },
  { id: "swap", label: "Swap", buttonText: "Swap" },
];

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
  const { isPending, writeContractAsync } = useWriteContract();
  const { onEncryptInput, isEncryptingInput, inputEncryptionDisabled } = useEncryptInput();

  const shouldFetchQuote = useMemo(() => {
    return (
      fromToken.value &&
      fromToken.value !== "0" &&
      Number(fromToken.value) > 0 &&
      !isNaN(Number(fromToken.value)) &&
      fromToken.symbol !== toToken.symbol
    );
  }, [fromToken, toToken]);

  const quoteParams = {
    poolKey: poolKey,
    zeroForOne: fromToken.symbol === "CPH",
    exactAmount: parseUnits(fromToken.value, 18),
    hookData: hookData,
  };

  // quoteExactInputSingle is not a view function, hence the need for ts-ignore below
  // we want the call to be static and return a valid quote
  const { data: quoteData, isLoading: isQuoteLoading } = useReadContract({
    abi: QuoterAbi,
    address: QUOTER_ADDRESS,
    // @ts-ignore
    functionName: "quoteExactInputSingle",
    // @ts-ignore
    args: [quoteParams],
  });

  useEffect(() => {
    if (quoteData && shouldFetchQuote) {
      const quoteWei = BigInt(quoteData[0]);
      const quotedAmount = formatUnits(quoteWei, 18);
      setToToken(prev => ({ ...prev, value: quotedAmount }));
    } else {
      setToToken(prev => ({ ...prev, value: "" }));
    }
  }, [quoteData, shouldFetchQuote, fromToken.symbol, toToken.symbol]);

  // Handlers
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  const handleTokenSwap = () => {
    const tempFromSymbol = fromToken.symbol;
    const tempToSymbol = toToken.symbol;

    setFromToken(prev => ({ ...prev, symbol: tempToSymbol }));
    setToToken(prev => ({ ...prev, symbol: tempFromSymbol }));
  };

  const handleFromTokenChange = (value: string) => {
    const decimalIndex = value.indexOf(".");
    if (decimalIndex !== -1 && value.length - decimalIndex - 1 > 18) {
      value = value.substring(0, decimalIndex + 19);
    }

    const regex = /^$|^\d+(\.\d{0,18})?$/;
    if (regex.test(value) && (value === "" || Number(value) >= 0)) {
      setFromToken(prev => ({ ...prev, value }));
    }
  };

  const handleSubmit = useCallback(() => {
    if (fromToken.value === "") return;

    if (activeTab === "swap") {
      console.log("Executing swap:", { from: fromToken, to: toToken });

      const swapTokens = async () => {
        const zeroForOne = fromToken.symbol === "CPH";

        const swapParams = {
          zeroForOne: zeroForOne,
          amountSpecified: -BigInt(fromToken.value),
          sqrtPriceLimitX96: zeroForOne ? MIN_SQRT_PRICE : MAX_SQRT_PRICE,
        };

        writeContractAsync({
          abi: PoolSwapAbi,
          address: POOL_SWAP,
          functionName: "swap",
          args: [poolKey, swapParams, testSettings, hookData],
        });
      };
      swapTokens();
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
    !fromToken.value || !toToken.value || isPending || isEncryptingInput || inputEncryptionDisabled || isQuoteLoading;

  const currentTabConfig = TABS.find(tab => tab.id === activeTab);

  const loadingQuote = !!(isQuoteLoading && shouldFetchQuote);

  return (
    <div className="max-w-md w-full mx-auto mt-10 bg-white dark:bg-neutral-900 rounded-2xl shadow-lg p-6 space-y-6">
      {/* Tabs */}
      <TabSelector tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Token Inputs */}
      <div className="space-y-4">
        <TokenInput token={fromToken} placeholder="0.0" onChange={handleFromTokenChange} label="From" />

        <SwapButton onClick={handleTokenSwap} />

        <TokenInput
          token={toToken}
          placeholder="0.0"
          onChange={() => {}}
          label="To"
          readOnly={true}
          isLoading={loadingQuote}
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
          min="0"
          step="1e-18"
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
      {readOnly && (
        <div className="mt-1 text-xs h-4">
          {token.value && <span className="text-neutral-400 dark:text-neutral-500">Auto-calculated</span>}
        </div>
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
