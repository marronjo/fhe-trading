"use client";

import { useCallback, useState } from "react";
import { Encryptable, FheTypes, cofhejs } from "cofhejs/web";
import { IntegerInput, IntegerVariant } from "~~/components/scaffold-eth";
import { EncryptedValue } from "~~/components/scaffold-eth/EncryptedValueCard";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

/**
 * FHECounterComponent - A demonstration of Fully Homomorphic Encryption (FHE) in a web application
 *
 * This component showcases how to:
 * 1. Read encrypted values from a smart contract
 * 2. Display encrypted values using a specialized component
 * 3. Encrypt user input before sending to the blockchain
 * 4. Interact with FHE-enabled smart contracts
 *
 * The counter value is stored as an encrypted uint32 on the blockchain,
 * meaning the actual value is never revealed on-chain.
 */

export const FHECounterComponent = () => {
  return (
    <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-start rounded-3xl gap-2">
      <p className="font-bold">FHECounter.sol</p>
      <p>Counter Actions:</p>
      <SetCounterRow />
      <div className="flex flex-row w-full gap-2">
        <IncrementButton />
        <DecrementButton />
      </div>
      <EncryptedCounterDisplay />
    </div>
  );
};

/**
 * SetCounterRow Component
 *
 * Demonstrates the process of encrypting user input before sending it to the blockchain:
 * 1. User enters a number in the input field
 * 2. When "Set" is clicked, the number is encrypted using cofhejs
 * 3. The encrypted value is then sent to the smart contract
 *
 * This ensures the actual value is never exposed on the blockchain,
 * maintaining privacy while still allowing computations.
 */
const SetCounterRow = () => {
  const [input, setInput] = useState<string>("");
  const { isPending, writeContractAsync } = useScaffoldWriteContract({ contractName: "FHECounter" });
  const [isEncrypting, setIsEncrypting] = useState(false);

  const handleSet = useCallback(() => {
    if (input === "") return;

    const encryptInputAndSet = async () => {
      setIsEncrypting(true);
      // Encrypt the input value as a uint32
      // cofhejs.encrypt returns a result object with success status and data/error
      const encryptedResult = await cofhejs.encrypt([Encryptable.uint32(input)]);
      setIsEncrypting(false);

      if (!encryptedResult.success) {
        console.error("Failed to encrypt input", encryptedResult.error);
        notification.error(`Failed to encrypt input: ${encryptedResult.error}`);
        return;
      }

      // Send the encrypted value to the smart contract
      writeContractAsync({ functionName: "set", args: [encryptedResult.data[0]] });
    };

    encryptInputAndSet();
  }, [input, writeContractAsync]);

  const pending = isPending || isEncrypting;

  return (
    <div className="flex flex-row w-full gap-2">
      <div className="flex-1">
        <IntegerInput value={input} onChange={setInput} variant={IntegerVariant.UINT32} disableMultiplyBy1e18 />
      </div>
      <div
        className={`btn btn-primary ${pending ? "btn-disabled" : ""} ${input === "" ? "btn-disabled" : ""}`}
        onClick={handleSet}
      >
        {pending && <span className="loading loading-spinner loading-xs"></span>}
        Set
      </div>
    </div>
  );
};

/**
 * IncrementButton Component
 *
 * Demonstrates a simple operation on encrypted data.
 * The smart contract handles the increment operation on the encrypted value
 * without ever decrypting it, showcasing the power of FHE.
 */
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

/**
 * DecrementButton Component
 *
 * Similar to IncrementButton, this demonstrates another operation
 * that can be performed on encrypted data without decryption.
 * The smart contract handles the decrement operation while maintaining
 * the privacy of the actual value.
 */
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

/**
 * EncryptedCounterDisplay Component
 *
 * A reusable component that handles reading and displaying encrypted counter values.
 * This component demonstrates:
 * 1. How to read encrypted data from a smart contract
 * 2. How to display encrypted values using the EncryptedValue component
 * 3. The pattern for handling encrypted data in the UI
 *
 * @returns A component that displays the current encrypted counter value
 */
const EncryptedCounterDisplay = () => {
  // Reading encrypted data from the smart contract
  // The 'count' value is returned as an encrypted euint32
  // We use EncryptedValue component to display it, which handles decryption
  const { data: count } = useScaffoldReadContract({
    contractName: "FHECounter",
    functionName: "count",
  });

  return (
    <>
      <p>Counter Value:</p>
      <div className="flex flex-row w-full gap-2">
        <EncryptedValue fheType={FheTypes.Uint32} ctHash={count} label="Count" />
      </div>
    </>
  );
};
