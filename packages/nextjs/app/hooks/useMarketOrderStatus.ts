import { useState } from "react";
import { TxGuideStepState } from "../TransactionGuide";

export function useMarketOrderStatus() {
  const [transactionHash, setTransactionHash] = useState<string>("");
  const [encryptedValue, setEncryptedValue] = useState<bigint>();
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [encryptionStep, setEncryptionStep] = useState<TxGuideStepState>(TxGuideStepState.Ready);
  const [confirmationStep, setConfirmationStep] = useState<TxGuideStepState>(TxGuideStepState.Ready);
  const [decryptionStep, setDecryptionStep] = useState<TxGuideStepState>(TxGuideStepState.Ready);
  const [executionStep, setExecutionStep] = useState<TxGuideStepState>(TxGuideStepState.Ready);
  const [settlementStep, setSettlementStep] = useState<TxGuideStepState>(TxGuideStepState.Ready);
  const [manualDecryptionStatus, setManualDecryptionStatus] = useState<boolean | undefined>(undefined);

  const resetTransactionStatus = () => {
    setIsProcessingOrder(false);
    setTransactionHash("");
    setEncryptedValue(undefined);
    setEncryptionStep(TxGuideStepState.Ready);
    setConfirmationStep(TxGuideStepState.Ready);
    setDecryptionStep(TxGuideStepState.Ready);
    setExecutionStep(TxGuideStepState.Ready);
    setSettlementStep(TxGuideStepState.Ready);
    setManualDecryptionStatus(undefined);
  };

  const marketOrderSteps = [
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
      title: "Queue",
      hint:
        settlementStep === TxGuideStepState.Success
          ? "Order queued! We'll notify you when executed."
          : "Adding to execution queue...",
      state: settlementStep, // Use settlement step for the final "Queue" step
      userInteraction: false,
    },
  ];

  return {
    // States
    transactionHash,
    encryptedValue,
    isProcessingOrder,
    encryptionStep,
    confirmationStep,
    decryptionStep,
    executionStep,
    settlementStep,
    manualDecryptionStatus,
    marketOrderSteps,

    // Setters
    setTransactionHash,
    setEncryptedValue,
    setIsProcessingOrder,
    setEncryptionStep,
    setConfirmationStep,
    setDecryptionStep,
    setExecutionStep,
    setSettlementStep,
    setManualDecryptionStatus,

    // Functions
    resetTransactionStatus,
  };
}
