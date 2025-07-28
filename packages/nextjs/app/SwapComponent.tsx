import { useState } from "react";
import { AsyncOrderStatus } from "./AsyncOrderStatus";
import { SubmitButton } from "./SubmitButton";
import { SwapButton } from "./SwapButton";
import { TabType } from "./Tab";
import { TabSelector } from "./TabSelector";
import { Token } from "./Token";
import { TokenInput } from "./TokenInput";
import { TransactionGuide } from "./TransactionGuide";
import { DEFAULT_TOKENS, TABS } from "./constants/Constants";
import { useAsyncOrders } from "./hooks/useAsyncOrders";
import { useBusinessLogic } from "./hooks/useBusinessLogic";
import { useEncryptInput } from "./hooks/useEncryptInput";
import { useMarketOrderEvents } from "./hooks/useMarketOrderEvents";
import { useMarketOrderStatus } from "./hooks/useMarketOrderStatus";
import { useQuoteData } from "./hooks/useQuoteData";
import { useTokenBalances } from "./hooks/useTokenBalances";
import { CoFheInItem, FheTypes } from "cofhejs/web";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";

export function SwapComponent() {
  const [activeTab, setActiveTab] = useState<TabType>("market");
  const [fromToken, setFromToken] = useState<Token>(DEFAULT_TOKENS.from);
  const [toToken, setToToken] = useState<Token>(DEFAULT_TOKENS.to);

  // New state for encryption flow
  const [isOrderEncrypted, setIsOrderEncrypted] = useState(false);
  const [preEncryptedValue, setPreEncryptedValue] = useState<string>("");
  const [encryptedObject, setEncryptedObject] = useState<CoFheInItem | null>(null);

  // Swap loading state
  const [isSwapLoading, setIsSwapLoading] = useState(false);

  const { address } = useAccount();
  const { isEncryptingInput, onEncryptInput } = useEncryptInput();

  // Custom hooks
  const marketOrderStatus = useMarketOrderStatus();
  const tokenBalances = useTokenBalances();
  const quoteData = useQuoteData(fromToken, toToken, setToToken);
  const asyncOrders = useAsyncOrders();

  // Move order to background tracking after completion
  const moveToAsyncTracking = () => {
    if (asyncOrders.hasOrder(marketOrderStatus.transactionHash)) {
      console.log(`Already added order ${marketOrderStatus.transactionHash} to execution queue`);
      return;
    }

    asyncOrders.addAsyncOrder({
      id: marketOrderStatus.transactionHash,
      amount: fromToken.value,
      fromToken: fromToken.symbol,
      toToken: toToken.symbol,
      timestamp: Date.now(),
      encryptedValue: marketOrderStatus.encryptedValue!,
    });

    // Reset the main transaction flow
    marketOrderStatus.resetTransactionStatus();
  };

  useMarketOrderEvents({
    transactionHash: marketOrderStatus.transactionHash,
    encryptedValue: marketOrderStatus.encryptedValue,
    isProcessingOrder: marketOrderStatus.isProcessingOrder,
    address,
    confirmationStep: marketOrderStatus.confirmationStep,
    setEncryptedValue: marketOrderStatus.setEncryptedValue,
    setConfirmationStep: marketOrderStatus.setConfirmationStep,
    setDecryptionStep: marketOrderStatus.setDecryptionStep,
    setExecutionStep: marketOrderStatus.setExecutionStep,
    setSettlementStep: marketOrderStatus.setSettlementStep,
    setManualDecryptionStatus: marketOrderStatus.setManualDecryptionStatus,
    resetTransactionStatus: marketOrderStatus.resetTransactionStatus,
    updateOrderStatus: asyncOrders.updateOrderStatus,
  });

  const businessLogic = useBusinessLogic({
    fromToken,
    toToken,
    activeTab,
    isPending: false,
    inputEncryptionDisabled: false,
    isQuoteLoading: quoteData.isQuoteLoading,
    isEncryptingInput,
    isProcessingOrder: marketOrderStatus.isProcessingOrder,
    isSwapLoading,
    encryptedObject: activeTab === "market" ? encryptedObject : null,
    manualDecryptionStatus: marketOrderStatus.manualDecryptionStatus,
    decryptionStep: marketOrderStatus.decryptionStep,
    setIsProcessingOrder: marketOrderStatus.setIsProcessingOrder,
    setConfirmationStep: marketOrderStatus.setConfirmationStep,
    setDecryptionStep: marketOrderStatus.setDecryptionStep,
    setExecutionStep: marketOrderStatus.setExecutionStep,
    setSettlementStep: marketOrderStatus.setSettlementStep,
    setTransactionHash: marketOrderStatus.setTransactionHash,
    resetTransactionStatus: marketOrderStatus.resetTransactionStatus,
    moveToAsyncTracking,
    setIsSwapLoading,
  });

  // Handlers
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    // Reset encryption state when switching tabs
    setIsOrderEncrypted(false);
    setPreEncryptedValue("");
    setEncryptedObject(null);
    if (!marketOrderStatus.isProcessingOrder) {
      marketOrderStatus.resetTransactionStatus();
    }
  };

  const handleTokenSwap = () => {
    const tempFromSymbol = fromToken.symbol;
    const tempToSymbol = toToken.symbol;

    setFromToken(prev => ({ ...prev, symbol: tempToSymbol }));
    setToToken(prev => ({ ...prev, symbol: tempFromSymbol }));

    // Reset encryption state when swapping tokens
    setIsOrderEncrypted(false);
    setPreEncryptedValue("");
    setEncryptedObject(null);
  };

  const handleFromTokenChange = (value: string) => {
    const decimalIndex = value.indexOf(".");
    if (decimalIndex !== -1 && value.length - decimalIndex - 1 > 18) {
      value = value.substring(0, decimalIndex + 19);
    }

    const regex = /^$|^\d+(\.\d{0,18})?$/;
    if (regex.test(value) && (value === "" || Number(value) >= 0)) {
      setFromToken(prev => ({ ...prev, value }));

      // Reset encryption state when amount changes
      if (isOrderEncrypted && value !== preEncryptedValue) {
        setIsOrderEncrypted(false);
        setPreEncryptedValue("");
        setEncryptedObject(null);
      }
    }
  };

  // New handler for encryption step
  const handleEncryptOrder = async () => {
    if (!fromToken.value || Number(fromToken.value) === 0) {
      return;
    }

    try {
      // Store the value that was encrypted
      setPreEncryptedValue(fromToken.value);

      // Call the encryption function using FheTypes.Uint64 for token amounts
      // Import FheTypes to use the proper enum value
      const formattedInput = parseUnits(fromToken.value, 18);
      const encryptedResult = await onEncryptInput(FheTypes.Uint128, formattedInput);

      if (encryptedResult) {
        // Debug: Log the encrypted result structure
        console.log("Encrypted result structure:", encryptedResult);
        console.log("Encrypted result keys:", Object.keys(encryptedResult));

        // Store the complete encrypted object for later use
        setEncryptedObject(encryptedResult);
        // Set the encrypted value in the market order status - store the ctHash as bigint
        marketOrderStatus.setEncryptedValue(BigInt(encryptedResult.ctHash));
        // Mark as encrypted
        setIsOrderEncrypted(true);
      }
    } catch (error) {
      console.error("Encryption failed:", error);
      // Handle encryption error
    }
  };

  // Get current tab configuration first
  const currentTabConfig = TABS.find(tab => tab.id === activeTab);

  // Determine button text and handler based on state
  const getButtonConfig = () => {
    if (activeTab !== "market") {
      return {
        text: isSwapLoading ? "Swapping..." : currentTabConfig?.buttonText || "Submit",
        onClick: businessLogic.handleSubmit,
        disabled: businessLogic.isSubmitDisabled || isSwapLoading,
        isLoading: isSwapLoading,
      };
    }

    // Market order flow
    if (isEncryptingInput) {
      return {
        text: "Encrypting...",
        onClick: () => {},
        disabled: true,
        isLoading: true,
      };
    }

    if (!isOrderEncrypted) {
      return {
        text: "Encrypt Order",
        onClick: handleEncryptOrder,
        disabled: !fromToken.value || Number(fromToken.value) === 0,
        isLoading: false,
      };
    }

    return {
      text: "Place Market Order",
      onClick: businessLogic.handleSubmit,
      disabled: businessLogic.isSubmitDisabled,
      isLoading: false,
    };
  };

  const buttonConfig = getButtonConfig();

  return (
    <div className="max-w-md w-full mx-auto mt-10 bg-white dark:bg-neutral-900 rounded-2xl shadow-lg p-6 space-y-6">
      <TabSelector tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="space-y-4">
        <TokenInput
          token={fromToken}
          placeholder="0.0"
          onChange={handleFromTokenChange}
          label="From"
          balance={fromToken.symbol === "CPH" ? tokenBalances.cphFormattedBalance : tokenBalances.mskFormattedBalance}
        />

        <SwapButton onClick={handleTokenSwap} disabled={isOrderEncrypted} />

        <TokenInput
          token={toToken}
          placeholder="0.0"
          onChange={() => {}}
          label="To"
          readOnly={true}
          isLoading={quoteData.loadingQuote}
          balance={toToken.symbol === "CPH" ? tokenBalances.cphFormattedBalance : tokenBalances.mskFormattedBalance}
        />

        {/* Encrypted Value Display */}
        {activeTab === "market" && isOrderEncrypted && marketOrderStatus.encryptedValue && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-700 dark:text-green-300">Order Encrypted</span>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Original Amount: {preEncryptedValue} {fromToken.symbol}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Encrypted Value:</div>
              <div className="p-2 bg-gray-100 dark:bg-neutral-800 rounded text-xs font-mono break-all text-gray-800 dark:text-gray-200">
                {marketOrderStatus.encryptedValue.toString()}
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(marketOrderStatus.encryptedValue?.toString() || "")}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Copy encrypted value
              </button>
            </div>
          </div>
        )}
      </div>

      <SubmitButton
        text={buttonConfig.text}
        onClick={buttonConfig.onClick}
        disabled={buttonConfig.disabled}
        isLoading={buttonConfig.isLoading}
      />

      <AsyncOrderStatus orders={asyncOrders.asyncOrders} />

      {activeTab === "market" && marketOrderStatus.isProcessingOrder && (
        <TransactionGuide title="Market Order Progress" steps={marketOrderStatus.marketOrderSteps} />
      )}
    </div>
  );
}
