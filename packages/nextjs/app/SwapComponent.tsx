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
import { useAccount } from "wagmi";

export function SwapComponent() {
  const [activeTab, setActiveTab] = useState<TabType>("market");
  const [fromToken, setFromToken] = useState<Token>(DEFAULT_TOKENS.from);
  const [toToken, setToToken] = useState<Token>(DEFAULT_TOKENS.to);

  const { address } = useAccount();
  const { isEncryptingInput } = useEncryptInput();

  // Custom hooks
  const marketOrderStatus = useMarketOrderStatus();
  const tokenBalances = useTokenBalances();
  const quoteData = useQuoteData(fromToken, toToken, setToToken);

  // In SwapComponent.tsx
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
  });

  const businessLogic = useBusinessLogic({
    fromToken,
    toToken,
    activeTab,
    isPending: false, // You'll need to get this from useWriteContract
    inputEncryptionDisabled: false, // From useEncryptInput
    isQuoteLoading: quoteData.isQuoteLoading,
    isEncryptingInput,
    isProcessingOrder: marketOrderStatus.isProcessingOrder,
    manualDecryptionStatus: marketOrderStatus.manualDecryptionStatus,
    decryptionStep: marketOrderStatus.decryptionStep,
    setIsProcessingOrder: marketOrderStatus.setIsProcessingOrder,
    setEncryptionStep: marketOrderStatus.setEncryptionStep,
    setConfirmationStep: marketOrderStatus.setConfirmationStep,
    setDecryptionStep: marketOrderStatus.setDecryptionStep,
    setExecutionStep: marketOrderStatus.setExecutionStep,
    setSettlementStep: marketOrderStatus.setSettlementStep,
    setEncryptedValue: marketOrderStatus.setEncryptedValue,
    setTransactionHash: marketOrderStatus.setTransactionHash,
    resetTransactionStatus: marketOrderStatus.resetTransactionStatus,
    moveToAsyncTracking,
  });

  // Handlers
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (!marketOrderStatus.isProcessingOrder) {
      marketOrderStatus.resetTransactionStatus();
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

  const currentTabConfig = TABS.find(tab => tab.id === activeTab);

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

        <SwapButton onClick={handleTokenSwap} />

        <TokenInput
          token={toToken}
          placeholder="0.0"
          onChange={() => {}}
          label="To"
          readOnly={true}
          isLoading={quoteData.loadingQuote}
          balance={toToken.symbol === "CPH" ? tokenBalances.cphFormattedBalance : tokenBalances.mskFormattedBalance}
        />
      </div>

      <SubmitButton
        text={isEncryptingInput ? "Encrypting..." : currentTabConfig?.buttonText || "Submit"}
        onClick={businessLogic.handleSubmit}
        disabled={businessLogic.isSubmitDisabled}
      />

      <AsyncOrderStatus orders={asyncOrders.asyncOrders} />

      {activeTab === "market" && (
        <TransactionGuide title="Market Order Progress" steps={marketOrderStatus.marketOrderSteps} />
      )}
    </div>
  );
}
