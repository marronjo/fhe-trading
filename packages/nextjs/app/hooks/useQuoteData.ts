import { useEffect, useMemo, useRef, useState } from "react";
import { Token } from "../Token";
import { POOL_KEY, QUOTER } from "../constants/Constants";
import { QuoterAbi } from "../constants/QuoterAbi";
import { formatUnits, parseUnits } from "viem";
import { useReadContract } from "wagmi";

const hookData = "0x";

export function useQuoteData(fromToken: Token, toToken: Token, setToToken: (fn: (prev: Token) => Token) => void) {
  const [isTimeout, setIsTimeout] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
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
    poolKey: POOL_KEY,
    zeroForOne: fromToken.symbol === "CPH",
    exactAmount: parseUnits(fromToken.value || "0", 18),
    hookData: hookData,
  };

  const {
    data: quoteData,
    isLoading: isQuoteLoading,
    error: quoteError,
  } = useReadContract({
    abi: QuoterAbi,
    address: QUOTER,
    // @ts-ignore
    functionName: "quoteExactInputSingle",
    // @ts-ignore
    args: [quoteParams],
    query: {
      enabled: !!shouldFetchQuote,
    },
  });

  // Handle timeout for stuck loading states
  useEffect(() => {
    if (isQuoteLoading && shouldFetchQuote) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Reset timeout state
      setIsTimeout(false);

      // Set new timeout for 2 seconds
      timeoutRef.current = setTimeout(() => {
        if (isQuoteLoading) {
          setIsTimeout(true);
        }
      }, 2000);
    } else {
      // Clear timeout when loading stops
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsTimeout(false);
    }

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isQuoteLoading, shouldFetchQuote]);

  useEffect(() => {
    if (quoteData && shouldFetchQuote && !quoteError) {
      const quoteWei = BigInt(quoteData[0]);
      const quotedAmount = formatUnits(quoteWei, 18);
      setToToken(prev => ({ ...prev, value: quotedAmount }));
    } else if (quoteError || !quoteData) {
      setToToken(prev => ({ ...prev, value: "" }));
    }
  }, [quoteData, shouldFetchQuote, quoteError, fromToken.symbol, toToken.symbol, setToToken]);

  const loadingQuote = !!(isQuoteLoading && shouldFetchQuote && !isTimeout);
  const hasQuoteError = !!(quoteError && shouldFetchQuote) || isTimeout;

  return {
    shouldFetchQuote,
    quoteData,
    isQuoteLoading,
    loadingQuote,
    quoteError,
    hasQuoteError,
    isTimeout,
  };
}
