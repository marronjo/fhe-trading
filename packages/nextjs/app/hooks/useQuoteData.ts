import { useEffect, useMemo } from "react";
import { Token } from "../Token";
import { POOL_KEY, QUOTER } from "../constants/Constants";
import { QuoterAbi } from "../constants/QuoterAbi";
import { formatUnits, parseUnits } from "viem";
import { useReadContract } from "wagmi";

const hookData = "0x";

export function useQuoteData(fromToken: Token, toToken: Token, setToToken: (fn: (prev: Token) => Token) => void) {
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

  const { data: quoteData, isLoading: isQuoteLoading } = useReadContract({
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

  useEffect(() => {
    if (quoteData && shouldFetchQuote) {
      const quoteWei = BigInt(quoteData[0]);
      const quotedAmount = formatUnits(quoteWei, 18);
      setToToken(prev => ({ ...prev, value: quotedAmount }));
    } else {
      setToToken(prev => ({ ...prev, value: "" }));
    }
  }, [quoteData, shouldFetchQuote, fromToken.symbol, toToken.symbol, setToToken]);

  const loadingQuote = !!(isQuoteLoading && shouldFetchQuote);

  return {
    shouldFetchQuote,
    quoteData,
    isQuoteLoading,
    loadingQuote,
  };
}
