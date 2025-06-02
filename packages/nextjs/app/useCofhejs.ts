import { useMemo, useState } from "react";
import { useEffect } from "react";
import { cofhejs } from "cofhejs/web";
import * as chains from "viem/chains";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import scaffoldConfig from "~~/scaffold.config";
import { notification } from "~~/utils/scaffold-eth";

const ChainEnvironments = {
  // Ethereum
  [chains.mainnet.id]: "MAINNET",
  // Arbitrum
  [chains.arbitrum.id]: "MAINNET",
  // Ethereum Sepolia
  [chains.sepolia.id]: "TESTNET",
  // Arbitrum Sepolia
  [chains.arbitrumSepolia.id]: "TESTNET",
  // Hardhat
  [chains.hardhat.id]: "MOCK",
} as const;

export const useIsConnectedChainSupported = () => {
  const { chainId } = useAccount();
  return useMemo(
    () => scaffoldConfig.targetNetworks.some((network: chains.Chain) => network.id === chainId),
    [chainId],
  );
};

export function useInitializeCofhejs() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const isChainSupported = useIsConnectedChainSupported();

  const handleError = (error: string) => {
    console.error("cofhejs initialization error:", error);
    notification.error(`cofhejs initialization error: ${error}`);
  };

  useEffect(() => {
    const initializeCofhejs = async () => {
      // Early exit if any of the required dependencies are missing
      if (!publicClient || !walletClient || !isChainSupported) return;

      const chainId = publicClient?.chain.id;
      const environment = ChainEnvironments[chainId as keyof typeof ChainEnvironments] ?? "TESTNET";

      try {
        const initializationResult = await cofhejs.initializeWithViem({
          viemClient: publicClient,
          viemWalletClient: walletClient,
          environment,
          // Whether to generate a permit for the connected account during the initialization process
          // Recommended to set to false, and then call `cofhejs.generatePermit()` when the user is ready to generate a permit
          // !! if **true** - will generate a permit immediately on page load !!
          generatePermit: true,
          // Hard coded signer for submitting encrypted inputs
          // This is only used in the mock environment to submit the mock encrypted inputs so that they can be used in FHE ops.
          // This has no effect in the mainnet or testnet environments.
          // TODO: zkvSigner: zkvSigner
        });

        if (initializationResult.success) {
          console.log("Cofhejs initialized successfully");
          notification.success("Cofhejs initialized successfully");
        } else {
          handleError(initializationResult.error.message ?? String(initializationResult.error));
        }
      } catch (err) {
        console.error("Failed to initialize cofhejs:", err);
        handleError(err instanceof Error ? err.message : "Unknown error initializing cofhejs");
      }
    };

    initializeCofhejs();
  }, [walletClient, publicClient, isChainSupported]);
}

export const useCofhejsAccount = () => {
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = cofhejs.store.subscribe(state => {
      setAccount(state.account);
    });

    // Initial state
    setAccount(cofhejs.store.getState().account);

    return () => {
      unsubscribe();
    };
  }, []);

  return account;
};

export const useCofhejsInitialized = () => {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const unsubscribe = cofhejs.store.subscribe(state => {
      setInitialized(state.fheKeysInitialized && state.providerInitialized && state.signerInitialized);
    });

    // Initial state
    setInitialized(
      cofhejs.store.getState().fheKeysInitialized &&
        cofhejs.store.getState().providerInitialized &&
        cofhejs.store.getState().signerInitialized,
    );

    return () => {
      unsubscribe();
    };
  }, []);

  return initialized;
};
