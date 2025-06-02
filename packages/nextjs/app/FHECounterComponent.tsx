"use client";

import { useCallback, useState } from "react";
import { Encryptable, FheTypes, cofhejs } from "cofhejs/web";
import { IntegerInput, IntegerVariant } from "~~/components/scaffold-eth";
import { EncryptedValueCard } from "~~/components/scaffold-eth/EncryptedValueCard";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

export const FHECounterComponent = () => {
  // The data returned from the smart contract is encrypted as an `euint32`
  // In order to display the value, we need to decrypt it.
  // `EncryptedValueCard` is a component that displays the encrypted value,
  // which uses the `useDecryptValue` hook to decrypt the value.
  const { data: count } = useScaffoldReadContract({
    contractName: "FHECounter",
    functionName: "count",
  });

  return (
    <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-start rounded-3xl gap-2">
      <p className="font-bold">FHECounter.sol</p>
      <p>Counter Actions:</p>
      <SetCounterRow />
      <div className="flex flex-row w-full gap-2">
        <IncrementButton />
        <DecrementButton />
      </div>
      <p>Counter Value:</p>
      <div className="flex flex-row w-full gap-2">
        <EncryptedValueCard fheType={FheTypes.Uint32} ctHash={count} label="Count" />
      </div>
    </div>
  );
};

/**
 * This component gives an example of how to encrypt an input.
 *
 * The input is encrypted using the cofhejs library and then
 * the encrypted value is sent to the smart contract.
 */
const SetCounterRow = () => {
  const [input, setInput] = useState<string>("");
  const { isPending, writeContractAsync } = useScaffoldWriteContract({ contractName: "FHECounter" });

  const handleSet = useCallback(() => {
    if (input === "") return;

    const encryptInputAndSet = async () => {
      const encryptedResult = await cofhejs.encrypt([Encryptable.uint32(input)]);

      if (!encryptedResult.success) {
        console.error("Failed to encrypt input", encryptedResult.error);
        notification.error(`Failed to encrypt input: ${encryptedResult.error}`);
        return;
      }

      console.log("encryptedResult", encryptedResult);

      writeContractAsync({ functionName: "set", args: [encryptedResult.data[0]] });
    };

    encryptInputAndSet();
  }, [input, writeContractAsync]);

  return (
    <div className="flex flex-row w-full gap-2">
      <div className="flex-1">
        <IntegerInput value={input} onChange={setInput} variant={IntegerVariant.UINT32} disableMultiplyBy1e18 />
      </div>
      <div
        className={`btn btn-primary ${isPending ? "btn-disabled" : ""} ${input === "" ? "btn-disabled" : ""}`}
        onClick={handleSet}
      >
        {isPending && <span className="loading loading-spinner loading-xs"></span>}
        Set
      </div>
    </div>
  );
};

const IncrementButton = () => {
  const { isPending, writeContractAsync } = useScaffoldWriteContract({ contractName: "FHECounter" });

  return (
    <div
      className={`btn btn-primary flex-1 ${isPending ? "btn-disabled" : ""}`}
      onClick={() => writeContractAsync({ functionName: "increment" })}
    >
      {isPending && <span className="loading loading-spinner loading-xs"></span>}
      Increment
    </div>
  );
};

const DecrementButton = () => {
  const { isPending, writeContractAsync } = useScaffoldWriteContract({ contractName: "FHECounter" });

  return (
    <div
      className={`btn btn-primary flex-1 ${isPending ? "btn-disabled" : ""}`}
      onClick={() => writeContractAsync({ functionName: "decrement" })}
    >
      {isPending && <span className="loading loading-spinner loading-xs"></span>}
      Decrement
    </div>
  );
};
