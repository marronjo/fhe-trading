import { useCallback, useMemo } from "react";
import { useEffect } from "react";
import { PermitOptions, cofhejs, permitStore } from "cofhejs/web";
import * as chains from "viem/chains";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { create, useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
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
          generatePermit: false,
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

type CofhejsStoreState = ReturnType<typeof cofhejs.store.getState>;

const useCofhejsStore = <T>(selector: (state: CofhejsStoreState) => T) => useStore(cofhejs.store, selector);

export const useCofhejsAccount = () => {
  return useCofhejsStore(state => state.account);
};

export const useCofhejsChainId = () => {
  return useCofhejsStore(state => state.chainId);
};

export const useCofhejsInitialized = () => {
  return useCofhejsStore(state => state.fheKeysInitialized && state.providerInitialized && state.signerInitialized);
};

export const useCofhejsStatus = () => {
  const chainId = useCofhejsChainId();
  const account = useCofhejsAccount();
  const initialized = useCofhejsInitialized();

  return useMemo(() => ({ chainId, account, initialized }), [chainId, account, initialized]);
};

// Permit Modal

interface CofhejsPermitModalStore {
  generatePermitModalOpen: boolean;
  generatePermitModalCallback?: () => void;
  setGeneratePermitModalOpen: (open: boolean, callback?: () => void) => void;
}

export const useCofhejsModalStore = create<CofhejsPermitModalStore>(set => ({
  generatePermitModalOpen: false,
  setGeneratePermitModalOpen: (open, callback) =>
    set({ generatePermitModalOpen: open, generatePermitModalCallback: callback }),
}));

// Permits

type PermitStoreState = ReturnType<typeof permitStore.store.getState>;

export const useCofhejsPermitStore = <T>(selector: (state: PermitStoreState) => T) => {
  return useStore(permitStore.store, selector);
};

export const useCofhejsActivePermitHash = () => {
  const { chainId, account, initialized } = useCofhejsStatus();
  return useCofhejsPermitStore(state => {
    if (!initialized || !chainId || !account) return undefined;
    return state.activePermitHash?.[chainId]?.[account];
  });
};

export const useCofhejsActivePermit = () => {
  const activePermitHash = useCofhejsActivePermitHash();
  return useMemo(() => {
    const permitResult = cofhejs.getPermit(activePermitHash ?? undefined);
    if (!permitResult) return null;
    if (permitResult.success) {
      return permitResult.data;
    } else {
      return null;
    }
  }, [activePermitHash]);
};

export const useCofhejsIsActivePermitValid = () => {
  const permit = useCofhejsActivePermit();
  return useMemo(() => {
    if (!permit) return false;
    return permit.isValid();
  }, [permit]);
};

export const useCofhejsAllPermitHashes = () => {
  const { chainId, account, initialized } = useCofhejsStatus();
  return useCofhejsPermitStore(
    useShallow(state => {
      if (!initialized || !chainId || !account) return [];
      return (
        Object.entries(state.permits?.[chainId]?.[account] ?? {})
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .filter(([_, permit]) => permit !== undefined)
          .map(([hash]) => hash)
      );
    }),
  );
};

export const useCofhejsAllPermits = () => {
  const permitHashes = useCofhejsAllPermitHashes();
  return useMemo(() => {
    return permitHashes.map(hash => cofhejs.getPermit(hash));
  }, [permitHashes]);
};

export const useCofhejsCreatePermit = () => {
  const { chainId, account, initialized } = useCofhejsStatus();
  return useCallback(
    async (permit?: PermitOptions) => {
      if (!initialized || !chainId || !account) return;
      const permitResult = await cofhejs.createPermit(permit);
      if (permitResult.success) {
        notification.success("Permit created");
      } else {
        notification.error(permitResult.error.message ?? String(permitResult.error));
      }
      return permitResult;
    },
    [chainId, account, initialized],
  );
};

export const useCofhejsRemovePermit = () => {
  const { chainId, account, initialized } = useCofhejsStatus();
  return useCallback(
    async (permitHash: string) => {
      if (!initialized || !chainId || !account) return;
      permitStore.removePermit(chainId, account, permitHash);
      notification.success("Permit removed");
    },
    [chainId, account, initialized],
  );
};

export const useCofhejsSetActivePermit = () => {
  const { chainId, account, initialized } = useCofhejsStatus();
  return useCallback(
    async (permitHash: string) => {
      if (!initialized || !chainId || !account) return;
      permitStore.setActivePermitHash(chainId, account, permitHash);
      notification.success("Active permit updated");
    },
    [chainId, account, initialized],
  );
};

export const useCofhejsPermitIssuer = () => {
  const permit = useCofhejsActivePermit();
  return useMemo(() => {
    if (!permit) return null;
    return permit.issuer;
  }, [permit]);
};
