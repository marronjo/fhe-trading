import { useState } from "react";
import { useEffect } from "react";
import { cofhejs } from "cofhejs/web";

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
