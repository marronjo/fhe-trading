import { useEffect } from "react";
import { TxGuideStepState } from "../TransactionGuide";
import { MARKET_ORDER_HOOK } from "../constants/Constants";
import { MarketOrderAbi } from "../constants/MarketOrder";
import { usePublicClient, useWaitForTransactionReceipt, useWatchContractEvent } from "wagmi";

interface UseMarketOrderEventsProps {
  transactionHash: string;
  encryptedValue: bigint | undefined;
  isProcessingOrder: boolean;
  address: string | undefined;
  confirmationStep: TxGuideStepState;
  setEncryptedValue: (value: bigint) => void;
  setConfirmationStep: (step: TxGuideStepState) => void;
  setDecryptionStep: (step: TxGuideStepState) => void;
  setExecutionStep: (step: TxGuideStepState) => void;
  setSettlementStep: (step: TxGuideStepState) => void;
  setManualDecryptionStatus: (status: boolean | undefined) => void;
  resetTransactionStatus: () => void;
}

export function useMarketOrderEvents({
  transactionHash,
  encryptedValue,
  isProcessingOrder,
  address,
  confirmationStep,
  setEncryptedValue,
  setConfirmationStep,
  setDecryptionStep,
  setExecutionStep,
  setSettlementStep,
  setManualDecryptionStatus,
  resetTransactionStatus,
}: UseMarketOrderEventsProps) {
  const publicClient = usePublicClient();

  // Watch for transaction confirmation
  const { data: receipt } = useWaitForTransactionReceipt({
    hash: transactionHash as `0x${string}`,
    query: {
      enabled: !!transactionHash,
    },
  });

  // Watch for OrderPlaced event
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

  // Watch for OrderSettled event
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

  // Manual decryption polling
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

      pollDecryptionStatus();
      intervalId = setInterval(pollDecryptionStatus, 2000);
    }

    return () => {
      if (intervalId) {
        console.log("🛑 Stopping manual decryption polling");
        clearInterval(intervalId);
      }
    };
  }, [confirmationStep, isProcessingOrder, publicClient, encryptedValue, setManualDecryptionStatus]);

  // Handle transaction receipt
  useEffect(() => {
    if (receipt && isProcessingOrder) {
      console.log("Transaction receipt received, waiting for OrderPlaced event");
    }
  }, [receipt, isProcessingOrder]);

  return {
    receipt,
  };
}
