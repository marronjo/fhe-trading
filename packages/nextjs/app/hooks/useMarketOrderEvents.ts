import { useCallback, useEffect, useState } from "react";
import { TxGuideStepState } from "../TransactionGuide";
import { MARKET_ORDER_HOOK } from "../constants/Constants";
import { MarketOrderAbi } from "../constants/MarketOrder";
import { decodeEventLog } from "viem";
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
  setSettlementStep: (step: TxGuideStepState) => void;
  setManualDecryptionStatus: (status: boolean | undefined) => void;
  updateOrderStatus: (id: string, status: "completed" | "failed") => void;
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
  setSettlementStep,
  setManualDecryptionStatus,
  updateOrderStatus,
}: UseMarketOrderEventsProps) {
  const publicClient = usePublicClient();
  const [orderPlacedDetected, setOrderPlacedDetected] = useState(false);

  // Reset orderPlacedDetected when a new transaction starts
  useEffect(() => {
    if (transactionHash && isProcessingOrder) {
      setOrderPlacedDetected(false);
    }
  }, [transactionHash, isProcessingOrder]);

  // Centralized handler for OrderPlaced events
  const handleOrderPlacedEvent = useCallback(
    (args: any) => {
      if (orderPlacedDetected) return; // Prevent duplicate processing

      if (!args.handle) {
        console.log("Error reading handle from OrderPlaced event!");
        return;
      }

      console.log("Processing OrderPlaced event with handle:", args.handle);
      setOrderPlacedDetected(true);
      setEncryptedValue(args.handle);
      setConfirmationStep(TxGuideStepState.Success);
      setDecryptionStep(TxGuideStepState.Loading);
    },
    [orderPlacedDetected, setEncryptedValue, setConfirmationStep, setDecryptionStep],
  );

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
          console.log("OrderPlaced event detected via watcher:", log);
          handleOrderPlacedEvent(log.args);
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
          setSettlementStep(TxGuideStepState.Success);

          // Update the async order status to completed
          if (transactionHash) {
            console.log("Updating async order status to completed for:", transactionHash);
            updateOrderStatus(transactionHash, "completed");
          }

          // Transaction status will remain visible until manually reset
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

  // Handle transaction receipt - parse for OrderPlaced events as fallback
  useEffect(() => {
    if (receipt && receipt.logs && isProcessingOrder && !orderPlacedDetected) {
      console.log("Parsing transaction receipt for OrderPlaced events...");

      try {
        const orderPlacedEvents = receipt.logs.filter(log => {
          try {
            const decoded = decodeEventLog({
              abi: MarketOrderAbi,
              data: log.data,
              topics: log.topics,
            });
            return decoded.eventName === "OrderPlaced" && decoded.args?.user === address;
          } catch {
            return false;
          }
        });

        if (orderPlacedEvents.length > 0) {
          const eventLog = orderPlacedEvents[0];
          const decoded = decodeEventLog({
            abi: MarketOrderAbi,
            data: eventLog.data,
            topics: eventLog.topics,
          });
          console.log("Found OrderPlaced event in transaction receipt:", decoded);
          handleOrderPlacedEvent(decoded.args);
        }
      } catch (error) {
        console.error("Error parsing transaction receipt for OrderPlaced events:", error);
      }
    }
  }, [receipt, isProcessingOrder, address, orderPlacedDetected, handleOrderPlacedEvent]);

  return {
    receipt,
  };
}
