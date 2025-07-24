import { CIPHER_TOKEN, MASK_TOKEN } from "../constants/Constants";
import { erc20Abi, formatUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";

export function useTokenBalances() {
  const { address, isConnected } = useAccount();

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
    if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
    if (num >= 1) return num.toFixed(2);
    if (num >= 0.01) return num.toFixed(4);
    return num.toExponential(2);
  };

  return {
    cphFormattedBalance: formatBalance(cphBalance),
    mskFormattedBalance: formatBalance(mskBalance),
  };
}
