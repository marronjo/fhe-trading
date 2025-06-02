"use client";

import { useCallback, useState } from "react";
import { useDecryptValue } from "./useDecrypt";
import { Encryptable, FheTypes, cofhejs } from "cofhejs/web";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { Address, IntegerInput, IntegerVariant } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();

  return (
    <>
      <div className="flex items-center flex-col grow pt-10">
        <div className="px-5">
          <h1 className="text-center">
            <span className="block text-2xl mb-2">Welcome to</span>
            <span className="block text-4xl font-bold mb-2">CoFHE-ETH</span>
            <a
              className="flex justify-center items-center gap-1"
              href="https://cofhe-docs.fhenix.zone/"
              target="_blank"
              rel="noreferrer"
            >
              <span className="link">Fhenix CoFHE Documentation</span>
            </a>
          </h1>
          <div className="flex justify-center items-center space-x-2 flex-col">
            <p className="my-2 font-medium">Connected Address:</p>
            <Address address={connectedAddress} />
          </div>

          <p className="text-center text-lg">
            Get started by editing{" "}
            <code className="italic bg-base-300 text-base font-bold max-w-full break-words break-all inline-block">
              packages/nextjs/app/page.tsx
            </code>
          </p>
          <p className="text-center text-lg">
            Edit your smart contract{" "}
            <code className="italic bg-base-300 text-base font-bold max-w-full break-words break-all inline-block">
              FHECounter.sol
            </code>{" "}
            in{" "}
            <code className="italic bg-base-300 text-base font-bold max-w-full break-words break-all inline-block">
              packages/hardhat/contracts
            </code>
          </p>
        </div>

        <div className="grow bg-base-300 w-full mt-16 px-8 py-12">
          <div className="flex justify-center items-center gap-12 flex-col md:flex-row">
            <FHECounter />
          </div>
        </div>
      </div>
    </>
  );
};

const FHECounter = () => {
  const { data: count } = useScaffoldReadContract({
    contractName: "FHECounter",
    functionName: "count",
  });

  return (
    <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-start rounded-3xl gap-2">
      <p className="font-bold">FHECounter</p>
      <p>Counter Actions:</p>
      <SetCounterRow />
      <div className="flex flex-row w-full gap-2">
        <IncrementButton />
        <DecrementButton />
      </div>
      <p>Counter Value:</p>
      <div className="flex flex-row w-full gap-2">
        <EncryptedValue value={count} />
      </div>
    </div>
  );
};

const SetCounterRow = () => {
  const [input, setInput] = useState<string>("");
  const { isPending /* , writeContractAsync */ } = useScaffoldWriteContract({ contractName: "FHECounter" });

  const encryptValue = useCallback(() => {
    const encrypt = async () => {
      const encrypted = await cofhejs.encrypt([Encryptable.uint32(input)]);
      console.log(encrypted);
    };
    encrypt();
  }, [input]);

  return (
    <div className="flex flex-row w-full gap-2">
      <div className="flex-1">
        <IntegerInput value={input} onChange={setInput} variant={IntegerVariant.UINT32} disableMultiplyBy1e18 />
      </div>
      <div className={`btn btn-primary ${isPending ? "btn-disabled" : ""}`} onClick={encryptValue}>
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

const EncryptedValue = ({ value }: { value: bigint | undefined }) => {
  const { onDecrypt, result } = useDecryptValue(FheTypes.Uint32, value);

  if (result.state === "no-data") {
    return <p className="w-full">No data</p>;
  }

  if (result.state === "encrypted") {
    return (
      <div className="btn btn-primary" onClick={onDecrypt}>
        Decrypt
      </div>
    );
  }

  if (result.state === "pending") {
    return <p className="w-full">Decrypting...</p>;
  }

  if (result.state === "error") {
    return <p className="w-full">Error: {result.error}</p>;
  }

  return <p className="w-full">Decrypted: {result.value}</p>;
};

export default Home;
