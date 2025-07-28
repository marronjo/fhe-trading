import { useCallback, useEffect, useMemo } from "react";
import { TabType } from "../Tab";
import { Token } from "../Token";
import { TxGuideStepState } from "../TransactionGuide";
import { MARKET_ORDER_HOOK, MAX_SQRT_PRICE, MIN_SQRT_PRICE, POOL_SWAP } from "../constants/Constants";
import { HOOK_DATA, POOL_KEY, TEST_SETTINGS } from "../constants/Constants";
import { MarketOrderAbi } from "../constants/MarketOrder";
import { PoolSwapAbi } from "../constants/PoolSwap";
import { CoFheInItem } from "cofhejs/web";
// Removed unused imports
import { parseUnits } from "viem";
import { useWriteContract } from "wagmi";

interface UseBusinessLogicProps {
  fromToken: Token;
  toToken: Token;
  activeTab: TabType;
  isPending: boolean;
  inputEncryptionDisabled: boolean;
  isQuoteLoading: boolean;
  isEncryptingInput: boolean;
  isProcessingOrder: boolean;
  isSwapLoading: boolean;
  encryptedObject: CoFheInItem | null;
  manualDecryptionStatus: boolean | undefined;
  decryptionStep: TxGuideStepState;
  setIsProcessingOrder: (value: boolean) => void;
  setConfirmationStep: (step: TxGuideStepState) => void;
  setDecryptionStep: (step: TxGuideStepState) => void;
  setExecutionStep: (step: TxGuideStepState) => void;
  setSettlementStep: (step: TxGuideStepState) => void;
  setTransactionHash: (hash: string) => void;
  resetTransactionStatus: () => void;
  moveToAsyncTracking: () => void;
  setIsSwapLoading: (loading: boolean) => void;
}

export function useBusinessLogic({
  fromToken,
  toToken,
  activeTab,
  isPending,
  inputEncryptionDisabled,
  isQuoteLoading,
  isEncryptingInput,
  isProcessingOrder,
  isSwapLoading,
  encryptedObject,
  manualDecryptionStatus,
  decryptionStep,
  setIsProcessingOrder,
  setConfirmationStep,
  setDecryptionStep,
  setExecutionStep,
  setSettlementStep,
  setTransactionHash,
  resetTransactionStatus,
  moveToAsyncTracking,
  setIsSwapLoading,
}: UseBusinessLogicProps) {
  const { writeContractAsync } = useWriteContract();

  // Handle decryption status updates
  useEffect(() => {
    console.log("MANUAL DECRYPTION STATUS:", manualDecryptionStatus);

    if (manualDecryptionStatus !== undefined && isProcessingOrder) {
      if (manualDecryptionStatus === true) {
        console.log("✅ Decryption complete! Moving to execution phase.");
        setDecryptionStep(TxGuideStepState.Success);
        setSettlementStep(TxGuideStepState.Loading);

        setTimeout(() => {
          setSettlementStep(TxGuideStepState.Success);
          console.log("Moving order to async tracking...");
          moveToAsyncTracking();
        }, 3000);
      } else if (manualDecryptionStatus === false) {
        console.log("⏳ Still waiting for decryption...");
        if (decryptionStep !== TxGuideStepState.Loading) {
          setDecryptionStep(TxGuideStepState.Loading);
        }
      }
    }
  }, [
    manualDecryptionStatus,
    isProcessingOrder,
    decryptionStep,
    setDecryptionStep,
    setExecutionStep,
    setSettlementStep,
    moveToAsyncTracking,
  ]);

  // Remove encryption step handling since we pre-encrypt

  const handleSubmit = useCallback(() => {
    if (fromToken.value === "") return;

    const formattedFromValue = parseUnits(fromToken.value, 18);

    if (activeTab === "swap") {
      console.log("Executing swap:", { from: fromToken, to: toToken });

      const swapTokens = async () => {
        try {
          setIsSwapLoading(true);

          const zeroForOne = fromToken.symbol === "CPH";

          const swapParams = {
            zeroForOne: zeroForOne,
            amountSpecified: -formattedFromValue,
            sqrtPriceLimitX96: zeroForOne ? MIN_SQRT_PRICE : MAX_SQRT_PRICE,
          };

          await writeContractAsync({
            abi: PoolSwapAbi,
            address: POOL_SWAP,
            functionName: "swap",
            args: [POOL_KEY, swapParams, TEST_SETTINGS, HOOK_DATA],
          });

          // Reset loading state after transaction is submitted
          setIsSwapLoading(false);
        } catch (error) {
          console.error("Swap transaction failed:", error);
          setIsSwapLoading(false);
        }
      };
      swapTokens();
    } else {
      console.log("Placing market order:", { from: fromToken, to: toToken });

      if (activeTab === "market" && !encryptedObject) {
        console.error("No encrypted object available for market order");
        return;
      }

      // Type guard: Ensure encryptedObject is not null before using it
      if (!encryptedObject) {
        console.error("Encrypted object is null");
        return;
      }

      setIsProcessingOrder(true);
      setConfirmationStep(TxGuideStepState.Loading);

      const placeMarketOrder = async () => {
        try {
          const zeroForOne = fromToken.symbol === "CPH";

          console.log("Using pre-encrypted object:", encryptedObject);
          console.log("encryptedObject keys:", Object.keys(encryptedObject || {}));
          console.log("encryptedObject type:", typeof encryptedObject);

          // Log all arguments being passed to the contract
          console.log("Contract call arguments:", {
            poolKey: POOL_KEY,
            zeroForOne,
            encryptedLiquidity: encryptedObject,
          });

          const hash = await writeContractAsync({
            abi: MarketOrderAbi,
            address: MARKET_ORDER_HOOK,
            functionName: "placeMarketOrder",
            args: [POOL_KEY, zeroForOne, encryptedObject],
            gas: 1000000n, // Add explicit gas limit
          });

          setTransactionHash(hash);
        } catch (error) {
          console.error("Error in market order submission:", error);
          setConfirmationStep(TxGuideStepState.Error);
          setTimeout(() => resetTransactionStatus(), 3000);
        }
      };

      placeMarketOrder();
    }
  }, [
    fromToken,
    toToken,
    activeTab,
    writeContractAsync,
    encryptedObject,
    setIsProcessingOrder,
    setConfirmationStep,
    setTransactionHash,
    resetTransactionStatus,
    setIsSwapLoading,
  ]);

  const isSubmitDisabled = useMemo(() => {
    const commonDisabled = !fromToken.value || !toToken.value || isPending || inputEncryptionDisabled || isQuoteLoading;

    if (activeTab === "market") {
      return commonDisabled || isEncryptingInput || isProcessingOrder;
    }

    return commonDisabled || isEncryptingInput || isSwapLoading;
  }, [
    fromToken.value,
    toToken.value,
    isPending,
    inputEncryptionDisabled,
    isQuoteLoading,
    activeTab,
    isEncryptingInput,
    isProcessingOrder,
    isSwapLoading,
  ]);

  return {
    handleSubmit,
    isSubmitDisabled,
  };
}
