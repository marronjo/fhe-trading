import { useCallback, useEffect, useState } from "react";
import { useCofhejsAccount, useCofhejsInitialized } from "./useCofhejs";
import { FheTypes, UnsealedItem } from "cofhejs/web";
import { cofhejs } from "cofhejs/web";
import { zeroAddress } from "viem";

export type DecryptionResult<T extends FheTypes> =
  | {
      fheType: T;
      ctHash: null;
      value: null;
      error: null;
      state: "no-data";
    }
  | {
      fheType: T;
      ctHash: bigint;
      value: null;
      error: null;
      state: "encrypted";
    }
  | {
      fheType: T;
      ctHash: bigint;
      value: null;
      error: null;
      state: "pending";
    }
  | {
      fheType: T;
      ctHash: bigint;
      value: UnsealedItem<T>;
      error: null;
      state: "success";
    }
  | {
      fheType: T;
      ctHash: bigint;
      value: null;
      error: string;
      state: "error";
    };

const _decryptValue = async <T extends FheTypes>(
  fheType: T,
  value: bigint,
  address: string,
): Promise<DecryptionResult<T>> => {
  if (value === 0n) {
    return {
      fheType,
      ctHash: 0n,
      value: fheType === FheTypes.Bool ? false : fheType === FheTypes.Uint160 ? zeroAddress : 0n,
      error: null,
      state: "success",
    } as DecryptionResult<T>;
  }

  const result = await cofhejs.unseal(value, fheType, address);
  if (result.success) {
    return {
      fheType,
      ctHash: value,
      value: result.data,
      error: null,
      state: "success",
    } as DecryptionResult<T>;
  }
  return {
    fheType,
    ctHash: value,
    value: null,
    error: result.error.message,
    state: "error",
  } as DecryptionResult<T>;
};

const initialDecryptionResult = <T extends FheTypes>(
  fheType: T,
  ctHash: bigint | null | undefined,
): DecryptionResult<T> => {
  if (ctHash == null) {
    return {
      fheType,
      ctHash: null,
      value: null,
      error: null,
      state: "no-data",
    };
  }

  if (ctHash === 0n) {
    return {
      fheType,
      ctHash,
      value: (fheType === FheTypes.Bool ? false : fheType === FheTypes.Uint160 ? zeroAddress : 0n) as UnsealedItem<T>,
      error: null,
      state: "success",
    };
  }

  return {
    fheType,
    ctHash,
    value: null,
    error: null,
    state: "encrypted",
  };
};

export const useDecryptValue = <T extends FheTypes>(
  fheType: T,
  ctHash: bigint | null | undefined,
): { onDecrypt: () => Promise<void>; result: DecryptionResult<T> } => {
  const cofhejsAccount = useCofhejsAccount();
  const cofhejsInitialized = useCofhejsInitialized();
  const [result, setResult] = useState<DecryptionResult<T>>(initialDecryptionResult(fheType, ctHash));

  // Reset when ctHash changes
  useEffect(() => {
    setResult(initialDecryptionResult(fheType, ctHash));
  }, [fheType, ctHash]);

  const onDecrypt = useCallback(async () => {
    if (ctHash == null) {
      setResult({
        fheType,
        ctHash: null,
        value: null,
        error: null,
        state: "no-data",
      });
      return;
    }
    if (!cofhejsInitialized || cofhejsAccount == null) {
      setResult({
        fheType,
        ctHash,
        value: null,
        error: !cofhejsInitialized ? "Cofhejs not initialized" : "No account connected",
        state: "error",
      });
      return;
    }

    setResult({
      fheType,
      ctHash,
      value: null,
      error: null,
      state: "pending",
    });
    try {
      const result = await _decryptValue(fheType, ctHash, cofhejsAccount);
      setResult(result);
    } catch (error) {
      setResult({
        fheType,
        ctHash,
        value: null,
        error: error instanceof Error ? error.message : "Unknown error",
        state: "error",
      });
    }
  }, [fheType, ctHash, cofhejsAccount, cofhejsInitialized]);

  return {
    onDecrypt,
    result,
  };
};
