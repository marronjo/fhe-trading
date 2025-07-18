import { useCallback, useEffect, useMemo, useState } from "react";
import { TransactionGuide, TxGuideStepState } from "./TransactionGuide";
import {
  CIPHER_TOKEN,
  MARKET_ORDER_HOOK,
  MASK_TOKEN,
  MAX_SQRT_PRICE,
  MIN_SQRT_PRICE,
  POOL_SWAP,
  QUOTER,
} from "./constants/Constants";
import { MarketOrderAbi } from "./constants/MarketOrder";
import { PoolSwapAbi } from "./constants/PoolSwap";
import { QuoterAbi } from "./constants/QuoterAbi";
import { useEncryptInput } from "./useEncryptInput";
import { CoFheInUint128, FheTypes } from "cofhejs/web";
import { formatUnits, parseUnits } from "viem";
import { erc20Abi } from "viem";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWatchContractEvent,
  useWriteContract,
} from "wagmi";

// Types
type TabType = "swap" | "market";

const poolKey = {
  currency0: CIPHER_TOKEN,
  currency1: MASK_TOKEN,
  fee: 3000,
  tickSpacing: 60,
  hooks: MARKET_ORDER_HOOK,
};

const testSettings = {
  takeClaims: false,
  settleUsingBurn: false,
};

const hookData = "0x";

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

  // Transaction status state
  const [transactionHash, setTransactionHash] = useState<string>("");
  const [encryptedValue, setEncryptedValue] = useState<CoFheInUint128>();
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [encryptionStep, setEncryptionStep] = useState<TxGuideStepState>(TxGuideStepState.Ready);
  const [confirmationStep, setConfirmationStep] = useState<TxGuideStepState>(TxGuideStepState.Ready);
  const [decryptionStep, setDecryptionStep] = useState<TxGuideStepState>(TxGuideStepState.Ready);
  const [executionStep, setExecutionStep] = useState<TxGuideStepState>(TxGuideStepState.Ready);
  const [settlementStep, setSettlementStep] = useState<TxGuideStepState>(TxGuideStepState.Ready);

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

  const { address, isConnected } = useAccount();

  // Poll for decryption status
  const { data: decryptionStatus } = useReadContract({
    abi: MarketOrderAbi,
    address: MARKET_ORDER_HOOK,
    functionName: "getOrderDecryptStatus",
    args: encryptedValue?.ctHash ? [encryptedValue.ctHash] : undefined, // Use the ctHash from the encrypted value
    query: {
      enabled: !!encryptedValue?.ctHash && confirmationStep === TxGuideStepState.Success,
      refetchInterval: 2000, // Poll every 2 seconds
      refetchIntervalInBackground: true, // Keep polling even when tab not focused
      // refetchOnWindowFocus: false,
      // retry: false,
      // staleTime: 0, // Always consider data stale
    },
  });

  console.log("📞 CONTRACT CALL STATUS:", {
    timestamp: new Date().toLocaleTimeString(),
    data: decryptionStatus,
    enabled: !!encryptedValue?.ctHash && confirmationStep === TxGuideStepState.Success,
  });

  // Watch for transaction confirmation
  const { data: receipt } = useWaitForTransactionReceipt({
    hash: transactionHash as `0x${string}`,
    query: {
      enabled: !!transactionHash,
    },
  });

  // Watch for contract events - filtering by user and encrypted handle
  useWatchContractEvent({
    address: MARKET_ORDER_HOOK,
    abi: MarketOrderAbi,
    eventName: "OrderPlaced",
    onLogs: logs => {
      console.log("Order Placed LOGS: ", logs);
      logs.forEach(log => {
        console.log("Order Placed LOG: ", log);
        // Check both user address and encrypted handle match our order
        if (
          log.transactionHash === transactionHash &&
          log.args?.user === address //&&
          // encryptedValue &&
          // log.args?.handle === encryptedValue.ctHash) {
        ) {
          console.log("OrderPlaced event detected for our specific order");
          setConfirmationStep(TxGuideStepState.Success);
          setDecryptionStep(TxGuideStepState.Loading);
        }
      });
    },
    enabled: !!isProcessingOrder && !!address && !!encryptedValue,
  });

  useWatchContractEvent({
    address: MARKET_ORDER_HOOK,
    abi: MarketOrderAbi,
    eventName: "OrderSettled",
    onLogs: logs => {
      logs.forEach(log => {
        // Check both user address and encrypted handle match our order
        if (log.args?.user === address && encryptedValue && log.args?.handle === encryptedValue.ctHash) {
          console.log("OrderSettled event detected for our specific order");
          setExecutionStep(TxGuideStepState.Success);
          setSettlementStep(TxGuideStepState.Success);
          setTimeout(() => {
            resetTransactionStatus();
          }, 5000);
        }
      });
    },
    enabled: !!transactionHash && !!address && !!encryptedValue,
  });

  // useWatchContractEvent({
  //   address: MARKET_ORDER_HOOK,
  //   abi: MarketOrderAbi,
  //   eventName: 'OrderFailed',
  //   onLogs: (logs) => {
  //     logs.forEach(log => {
  //       if (log.transactionHash === transactionHash && log.args?.user === address) {
  //         setSettlementStep(TxGuideStepState.Error);
  //         // Reset after 5 seconds
  //         setTimeout(() => {
  //           resetTransactionStatus();
  //         }, 5000);
  //       }
  //     });
  //   },
  //   enabled: !!transactionHash && !!address,
  // });

  // Update encryption step based on isEncryptingInput
  useEffect(() => {
    if (isEncryptingInput && isProcessingOrder) {
      setEncryptionStep(TxGuideStepState.Loading);
    }
  }, [isEncryptingInput, isProcessingOrder]);

  // Update confirmation step when transaction is confirmed
  useEffect(() => {
    if (receipt && isProcessingOrder) {
      console.log("Transaction receipt received, waiting for OrderPlaced event");
      // Don't set confirmation to success here, wait for OrderPlaced event
      // This ensures we have both transaction confirmation AND contract event
    }
  }, [receipt, isProcessingOrder]);

  // Update decryption step based on polling result
  useEffect(() => {
    console.log("DECRYPTION STATUS: " + decryptionStatus);
    console.log();
    if (decryptionStatus !== undefined && isProcessingOrder) {
      // Assuming getOrderDecryptStatus returns a boolean or status code
      // Adjust this logic based on what your contract actually returns
      if (decryptionStatus === true) {
        setDecryptionStep(TxGuideStepState.Success);
        setExecutionStep(TxGuideStepState.Loading);
      } else if (decryptionStatus === false) {
        // Still pending decryption
        setDecryptionStep(TxGuideStepState.Loading);
      }
      // Add more conditions based on your contract's return values
    }
  }, [decryptionStatus, isProcessingOrder]);

  const resetTransactionStatus = () => {
    setIsProcessingOrder(false);
    setTransactionHash("");
    setEncryptedValue(undefined);
    setEncryptionStep(TxGuideStepState.Ready);
    setConfirmationStep(TxGuideStepState.Ready);
    setDecryptionStep(TxGuideStepState.Ready);
    setExecutionStep(TxGuideStepState.Ready);
    setSettlementStep(TxGuideStepState.Ready);
  };

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
    address: QUOTER,
    // @ts-ignore
    functionName: "quoteExactInputSingle",
    // @ts-ignore
    args: [quoteParams],
  });

  const { data: cphBalance } = useReadContract({
    abi: erc20Abi,
    address: CIPHER_TOKEN,
    functionName: "balanceOf",
    args: [address!],
    query: {
      enabled: isConnected && !!address,
    },
  });

  const { data: mskBalance } = useReadContract({
    abi: erc20Abi,
    address: MASK_TOKEN,
    functionName: "balanceOf",
    args: [address!],
    query: {
      enabled: isConnected && !!address,
    },
  });

  const formatBalance = (balance: bigint | undefined): string => {
    if (!balance) return "0";
    const formatted = formatUnits(balance, 18);
    const num = Number(formatted);

    if (num >= 999e12) return ">999T";
    if (num >= 1e12) return (num / 1e12).toFixed(2) + "T"; // Trillion
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B"; // Billion
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M"; // Million
    if (num >= 1e3) return (num / 1e3).toFixed(2) + "K"; // Thousand
    if (num >= 1) return num.toFixed(2); // Regular numbers
    if (num >= 0.01) return num.toFixed(4); // Small decimals
    return num.toExponential(2);
  };

  const cphFormattedBalance = formatBalance(cphBalance);
  const mskFormattedBalance = formatBalance(mskBalance);

  useEffect(() => {
    if (quoteData && shouldFetchQuote) {
      const quoteWei = BigInt(quoteData[0]);
      const quotedAmount = formatUnits(quoteWei, 18);
      setToToken(prev => ({ ...prev, value: quotedAmount }));
    } else {
      setToToken(prev => ({ ...prev, value: "" }));
    }
  }, [quoteData, shouldFetchQuote, fromToken.symbol, toToken.symbol]);

  // Transaction steps for market orders
  const marketOrderSteps = [
    {
      title: "Encrypt",
      hint: "Securing your order amount using FHE",
      state: encryptionStep,
      userInteraction: false,
    },
    {
      title: "Confirm",
      hint: "Transaction submitted to blockchain",
      state: confirmationStep,
      userInteraction: false,
    },
    {
      title: "Decrypt",
      hint: "Fhenix coprocessor decrypting order",
      state: decryptionStep,
      userInteraction: false,
    },
    {
      title: "Execute",
      hint: "Processing your swap order",
      state: executionStep,
      userInteraction: false,
    },
    {
      title: "Settle",
      hint: settlementStep === TxGuideStepState.Success ? "Order completed successfully!" : "Finalizing your trade",
      state: settlementStep,
      userInteraction: false,
    },
  ];

  // Handlers
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    // Reset transaction status when switching tabs
    if (!isProcessingOrder) {
      resetTransactionStatus();
    }
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

    const formattedFromValue = parseUnits(fromToken.value, 18);

    if (activeTab === "swap") {
      console.log("Executing swap:", { from: fromToken, to: toToken });

      const swapTokens = async () => {
        const zeroForOne = fromToken.symbol === "CPH";

        const swapParams = {
          zeroForOne: zeroForOne,
          amountSpecified: -formattedFromValue, //minus for exactInput swap
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

      // Start transaction tracking
      setIsProcessingOrder(true);
      setEncryptionStep(TxGuideStepState.Loading);

      const encryptInputAndSet = async () => {
        try {
          const encryptedValue = await onEncryptInput(FheTypes.Uint128, formattedFromValue);

          if (!encryptedValue) {
            console.log("VALUE : " + fromToken.value);
            console.log("error encrypting value!");
            setEncryptionStep(TxGuideStepState.Error);
            setTimeout(() => resetTransactionStatus(), 3000);
            return;
          }

          // Encryption successful
          setEncryptionStep(TxGuideStepState.Success);
          setConfirmationStep(TxGuideStepState.Loading);

          // Store the encrypted value for polling
          setEncryptedValue(encryptedValue);

          const zeroForOne = fromToken.symbol === "CPH";

          // Send the encrypted value to the smart contract
          const hash = await writeContractAsync({
            abi: MarketOrderAbi,
            address: MARKET_ORDER_HOOK,
            functionName: "placeMarketOrder",
            args: [poolKey, zeroForOne, encryptedValue],
          });

          setTransactionHash(hash);
        } catch (error) {
          console.error("Error in market order submission:", error);
          setEncryptionStep(TxGuideStepState.Error);
          setTimeout(() => resetTransactionStatus(), 3000);
        }
      };

      encryptInputAndSet();
    }
  }, [fromToken, toToken, activeTab, writeContractAsync, onEncryptInput]);

  const isSubmitDisabled =
    !fromToken.value ||
    !toToken.value ||
    isPending ||
    isEncryptingInput ||
    inputEncryptionDisabled ||
    isQuoteLoading ||
    isProcessingOrder;

  const currentTabConfig = TABS.find(tab => tab.id === activeTab);

  const loadingQuote = !!(isQuoteLoading && shouldFetchQuote);

  return (
    <div className="max-w-md w-full mx-auto mt-10 bg-white dark:bg-neutral-900 rounded-2xl shadow-lg p-6 space-y-6">
      {/* Tabs */}
      <TabSelector tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Token Inputs */}
      <div className="space-y-4">
        <TokenInput
          token={fromToken}
          placeholder="0.0"
          onChange={handleFromTokenChange}
          label="From"
          balance={fromToken.symbol === "CPH" ? cphFormattedBalance : mskFormattedBalance}
        />

        <SwapButton onClick={handleTokenSwap} />

        <TokenInput
          token={toToken}
          placeholder="0.0"
          onChange={() => {}}
          label="To"
          readOnly={true}
          isLoading={loadingQuote}
          balance={toToken.symbol === "CPH" ? cphFormattedBalance : mskFormattedBalance}
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

      {/* Transaction Status Guide - Only show for market orders when processing */}
      {activeTab === "market" && isProcessingOrder && (
        <TransactionGuide title="Market Order Progress" steps={marketOrderSteps} />
      )}
    </div>
  );
}

// Sub-components remain the same...
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
  balance?: string;
}

function TokenInput({
  token,
  placeholder,
  onChange,
  label,
  readOnly = false,
  isLoading = false,
  balance = "0",
}: TokenInputProps) {
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
      <div className="mt-2 text-xs h-4 flex justify-between items-center">
        <span className="text-neutral-400 dark:text-neutral-500">{readOnly && token.value && "Auto-calculated"}</span>
        <span className="text-neutral-400 dark:text-neutral-500">
          {balance} {token.symbol}
        </span>
      </div>
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
