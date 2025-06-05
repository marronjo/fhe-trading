import React from "react";
import { FheTypes } from "cofhejs/web";
import { LockClosedIcon, LockOpenIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { useDecryptValue } from "~~/app/useDecrypt";

interface EncryptedValueCardProps<T extends FheTypes> {
  fheType: T;
  ctHash: bigint | null | undefined;
  label: string;
}

export const EncryptedValueCard = <T extends FheTypes>({ label, fheType, ctHash }: EncryptedValueCardProps<T>) => {
  const { onDecrypt, result } = useDecryptValue(fheType, ctHash);

  return (
    <div className="flex w-full bg-gradient-to-br from-purple-400 to-purple-600 p-0.5 rounded-3xl shadow-lg">
      <div className="flex flex-1 items-center justify-between rounded-[22px] p-2 bg-base-100 w-full">
        <div className="flex flex-row items-center justify-start p-1 pl-4 gap-2 flex-1 rounded-3xl bg-primary-content/5 min-h-12">
          <span className="text-xs font-semibold">{label}</span>
          {result.state === "no-data" && <span className="text-xs font-semibold flex-1 italic">No data</span>}
          {result.state === "encrypted" && (
            <span className="btn btn-md btn-cofhe flex-1" onClick={onDecrypt}>
              <LockClosedIcon className="w-5 h-5" aria-hidden="true" />
              Encrypted
            </span>
          )}
          {result.state === "pending" && (
            <span className="btn btn-md btn-cofhe btn-disabled flex-1">
              <div className="loading-spinner loading-sm" />
              Decrypting
            </span>
          )}
          {result.state === "success" && (
            <div className="flex flex-1 px-4 items-center justify-center gap-2 h-10 bg-success/10 border-success border-2 border-solid rounded-full">
              <LockOpenIcon className="w-5 h-5 text-success" aria-hidden="true" />
              <div className="flex flex-1 items-center justify-center">
                <span className="font-mono">{result.value}</span>
              </div>
            </div>
          )}
          {result.state === "error" && (
            <span className="text-xs text-warning font-semibold flex-1 italic">{result.error}</span>
          )}
        </div>
        <div className="ml-4 flex items-center justify-center">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-gradient-to-br from-purple-400 to-purple-600 shadow-lg">
            <ShieldCheckIcon className="w-6 h-6 text-white" aria-hidden="true" />
          </span>
        </div>
      </div>
    </div>
  );
};
