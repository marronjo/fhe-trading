import { useCallback, useEffect, useMemo, useState } from "react";
import { SubmitButton } from "./SubmitButton";
import { SwapButton } from "./SwapButton";
import { TabConfig, TabType } from "./Tab";
import { TabSelector } from "./TabSelector";
import { Token } from "./Token";
import { TokenInput } from "./TokenInput";
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
import { FheTypes } from "cofhejs/web";
import { formatUnits, parseUnits } from "viem";
import { erc20Abi } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWatchContractEvent,
  useWriteContract,
} from "wagmi";

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
  const [encryptedValue, setEncryptedValue] = useState<bigint>();
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [encryptionStep, setEncryptionStep] = useState<TxGuideStepState>(TxGuideStepState.Ready);
  const [confirmationStep, setConfirmationStep] = useState<TxGuideStepState>(TxGuideStepState.Ready);
  const [decryptionStep, setDecryptionStep] = useState<TxGuideStepState>(TxGuideStepState.Ready);
  const [executionStep, setExecutionStep] = useState<TxGuideStepState>(TxGuideStepState.Ready);
  const [settlementStep, setSettlementStep] = useState<TxGuideStepState>(TxGuideStepState.Ready);

  const [manualDecryptionStatus, setManualDecryptionStatus] = useState<boolean | undefined>(undefined);

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
      logs.forEach(log => {
        if (log.transactionHash === transactionHash && log.args?.user === address) {
          console.log("OrderPlaced event detected for our specific order: ", log);
          if (!log.args.handle) {
            console.log("Error reading handle from orderplaced event!");
            return;
          }
          setEncryptedValue(log.args.handle);
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
        console.log("order settled: ", log);
        if (log.args?.user === address && encryptedValue && log.args?.handle === encryptedValue) {
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

  // Add this hook
  const publicClient = usePublicClient();

  // Replace the useReadContract decryption polling with this manual approach
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (!!encryptedValue && confirmationStep === TxGuideStepState.Success && isProcessingOrder) {
      console.log("🔄 Starting manual decryption polling at:", new Date().toLocaleTimeString());

      if (!publicClient) {
        console.log("Error initialising public client!!");
        return;
      }

      const pollDecryptionStatus = async () => {
        console.log("CtHash : " + encryptedValue);
        try {
          const result = await publicClient.readContract({
            address: MARKET_ORDER_HOOK,
            abi: MarketOrderAbi,
            functionName: "getOrderDecryptStatus",
            args: [encryptedValue],
          });

          if (result === true && intervalId) {
            console.log("✅ Decryption complete! Stopping polling.");
            clearInterval(intervalId);
            intervalId = null;
          }

          console.log("Decryption poll result:", result, "at", new Date().toLocaleTimeString());
          setManualDecryptionStatus(result as boolean);
        } catch (error) {
          console.error("Decryption poll error:", error);
        }
      };

      // Call immediately, then every 2 seconds
      pollDecryptionStatus();
      intervalId = setInterval(pollDecryptionStatus, 2000);
    } else {
      console.log("⏹️ Decryption polling conditions not met:", {
        hasCtHash: !!encryptedValue,
        confirmationSuccess: confirmationStep === TxGuideStepState.Success,
        isProcessing: isProcessingOrder,
      });
    }

    return () => {
      if (intervalId) {
        console.log("🛑 Stopping manual decryption polling");
        clearInterval(intervalId);
      }
    };
  }, [confirmationStep, isProcessingOrder, publicClient]);

  // Update your decryption status effect to use manualDecryptionStatus
  useEffect(() => {
    console.log("MANUAL DECRYPTION STATUS:", manualDecryptionStatus);

    if (manualDecryptionStatus !== undefined && isProcessingOrder) {
      if (manualDecryptionStatus === true) {
        console.log("✅ Decryption complete! Moving to execution phase.");
        setDecryptionStep(TxGuideStepState.Success);
        setExecutionStep(TxGuideStepState.Loading);
      } else if (manualDecryptionStatus === false) {
        console.log("⏳ Still waiting for decryption...");
        if (decryptionStep !== TxGuideStepState.Loading) {
          setDecryptionStep(TxGuideStepState.Loading);
        }
      }
    }
  }, [manualDecryptionStatus, isProcessingOrder, decryptionStep]);

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
          const encryptedLiquidity = await onEncryptInput(FheTypes.Uint128, formattedFromValue);

          if (!encryptedLiquidity) {
            console.log("VALUE : " + fromToken.value);
            console.log("error encrypting value!");
            setEncryptionStep(TxGuideStepState.Error);
            setTimeout(() => resetTransactionStatus(), 3000);
            return;
          }

          //72828117381250811770990506987290907741609732012241119344315262097694224281949n - generated locally
          //72828117381250811770990506987290907741609732012241119344315262097694224221696

          //109376801294357633682831014798950957135275081277313880508956184444273475061248 - actual value on chain
          //109376801294357633682831014798950957135275081277313880508956184444273475080057 - ctHash locally

          // Encryption successful
          setEncryptionStep(TxGuideStepState.Success);
          setConfirmationStep(TxGuideStepState.Loading);

          console.log("Encrypted Value: ", encryptedLiquidity);

          // Store the encrypted value for polling
          setEncryptedValue(encryptedLiquidity.ctHash);

          const zeroForOne = fromToken.symbol === "CPH";

          // Send the encrypted value to the smart contract
          const hash = await writeContractAsync({
            abi: MarketOrderAbi,
            address: MARKET_ORDER_HOOK,
            functionName: "placeMarketOrder",
            args: [poolKey, zeroForOne, encryptedLiquidity],
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

  const isSubmitDisabled = useMemo(() => {
    // Common conditions that always disable the button
    const commonDisabled = !fromToken.value || !toToken.value || isPending || inputEncryptionDisabled || isQuoteLoading;

    // If on market tab, also disable when encrypting or processing a market order
    if (activeTab === "market") {
      return commonDisabled || isEncryptingInput || isProcessingOrder;
    }

    // If on swap tab, don't disable due to market order processing
    // (but still disable if encrypting since that affects both)
    return commonDisabled || isEncryptingInput;
  }, [
    fromToken.value,
    toToken.value,
    isPending,
    inputEncryptionDisabled,
    isQuoteLoading,
    activeTab,
    isEncryptingInput,
    isProcessingOrder,
  ]);

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
