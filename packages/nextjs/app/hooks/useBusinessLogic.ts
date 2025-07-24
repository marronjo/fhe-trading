import { useCallback, useEffect, useMemo } from "react";
import { TabType } from "../Tab";
import { Token } from "../Token";
import { TxGuideStepState } from "../TransactionGuide";
import { MARKET_ORDER_HOOK, MAX_SQRT_PRICE, MIN_SQRT_PRICE, POOL_SWAP } from "../constants/Constants";
import { HOOK_DATA, POOL_KEY, TEST_SETTINGS } from "../constants/Constants";
import { MarketOrderAbi } from "../constants/MarketOrder";
import { PoolSwapAbi } from "../constants/PoolSwap";
import { useEncryptInput } from "./useEncryptInput";
import { FheTypes } from "cofhejs/web";
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
  manualDecryptionStatus: boolean | undefined;
  decryptionStep: TxGuideStepState;
  setIsProcessingOrder: (value: boolean) => void;
  setEncryptionStep: (step: TxGuideStepState) => void;
  setConfirmationStep: (step: TxGuideStepState) => void;
  setDecryptionStep: (step: TxGuideStepState) => void;
  setExecutionStep: (step: TxGuideStepState) => void;
  setSettlementStep: (step: TxGuideStepState) => void;
  setEncryptedValue: (value: bigint) => void;
  setTransactionHash: (hash: string) => void;
  resetTransactionStatus: () => void;
  moveToAsyncTracking: () => void;
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
  manualDecryptionStatus,
  decryptionStep,
  setIsProcessingOrder,
  setEncryptionStep,
  setConfirmationStep,
  setDecryptionStep,
  setExecutionStep,
  setSettlementStep,
  setEncryptedValue,
  setTransactionHash,
  resetTransactionStatus,
  moveToAsyncTracking,
}: UseBusinessLogicProps) {
  const { writeContractAsync } = useWriteContract();
  const { onEncryptInput } = useEncryptInput();

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

  // Handle encryption status updates
  useEffect(() => {
    if (isEncryptingInput && isProcessingOrder) {
      setEncryptionStep(TxGuideStepState.Loading);
    }
  }, [isEncryptingInput, isProcessingOrder, setEncryptionStep]);

  const handleSubmit = useCallback(() => {
    if (fromToken.value === "") return;

    const formattedFromValue = parseUnits(fromToken.value, 18);

    if (activeTab === "swap") {
      console.log("Executing swap:", { from: fromToken, to: toToken });

      const swapTokens = async () => {
        const zeroForOne = fromToken.symbol === "CPH";

        const swapParams = {
          zeroForOne: zeroForOne,
          amountSpecified: -formattedFromValue,
          sqrtPriceLimitX96: zeroForOne ? MIN_SQRT_PRICE : MAX_SQRT_PRICE,
        };

        writeContractAsync({
          abi: PoolSwapAbi,
          address: POOL_SWAP,
          functionName: "swap",
          args: [POOL_KEY, swapParams, TEST_SETTINGS, HOOK_DATA],
        });
      };
      swapTokens();
    } else {
      console.log("Placing market order:", { from: fromToken, to: toToken });

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

          setEncryptionStep(TxGuideStepState.Success);
          setConfirmationStep(TxGuideStepState.Loading);

          console.log("Encrypted Value: ", encryptedLiquidity);
          setEncryptedValue(encryptedLiquidity.ctHash);

          const zeroForOne = fromToken.symbol === "CPH";

          const hash = await writeContractAsync({
            abi: MarketOrderAbi,
            address: MARKET_ORDER_HOOK,
            functionName: "placeMarketOrder",
            args: [POOL_KEY, zeroForOne, encryptedLiquidity],
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
  }, [
    fromToken,
    toToken,
    activeTab,
    writeContractAsync,
    onEncryptInput,
    setIsProcessingOrder,
    setEncryptionStep,
    setConfirmationStep,
    setEncryptedValue,
    setTransactionHash,
    resetTransactionStatus,
  ]);

  const isSubmitDisabled = useMemo(() => {
    const commonDisabled = !fromToken.value || !toToken.value || isPending || inputEncryptionDisabled || isQuoteLoading;

    if (activeTab === "market") {
      return commonDisabled || isEncryptingInput || isProcessingOrder;
    }

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

  return {
    handleSubmit,
    isSubmitDisabled,
  };
}
