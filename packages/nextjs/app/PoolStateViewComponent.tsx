"use client";

import { StateViewAbi } from "./constants/StateViewAbi";
import { BigNumber } from "bignumber.js";
import { useReadContract } from "wagmi";

const STATE_VIEW_ADDRESS = "0xE1Dd9c3fA50EDB962E442f60DfBc432e24537E4C"; // replace this
const poolId = "0x4a63d4af4e4aa3228f2705d8996c1cb15af1ca3273626d88202c0e2238ec071b"; // bytes32 string, replace with real value

function calculateExchangeRates(sqrtPriceX96: bigint): { zeroToOne: BigNumber; oneToZero: BigNumber } {
  const price = new BigNumber(sqrtPriceX96);

  const priceRatio = price.dividedBy(new BigNumber(2).pow(96)).pow(2);
  const decimalFactor = new BigNumber(10).pow(18).dividedBy(new BigNumber(10).pow(18));

  const buyOneOfToken0 = priceRatio.dividedBy(decimalFactor);
  const buyOneOfToken1 = new BigNumber(1).dividedBy(buyOneOfToken0);

  return { zeroToOne: buyOneOfToken0, oneToZero: buyOneOfToken1 };
}

export function Slot0Display() {
  const { data } = useReadContract({
    abi: StateViewAbi,
    address: STATE_VIEW_ADDRESS,
    functionName: "getSlot0",
    args: [poolId],
  });

  if (!data) {
    return <div>Error loading from StateView</div>;
  }

  const [sqrtPriceX96, tick, protocolFee, lpFee] = data;

  const { zeroToOne, oneToZero } = calculateExchangeRates(sqrtPriceX96);

  return (
    <div className="max-w-md mx-auto bg-white shadow-md rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4 border-b pb-2 text-gray-800">Pool Slot0 Data</h3>
      <div className="space-y-3 text-gray-700 text-sm">
        <p>
          <span className="font-semibold text-gray-900">Exchange Rate 0 - 1:</span> {zeroToOne.toString()}
        </p>
        <p>
          <span className="font-semibold text-gray-900">Exchange Rate 1 - 0:</span> {oneToZero.toString()}
        </p>
        <p>
          <span className="font-semibold text-gray-900">SqrtPriceX96:</span> {sqrtPriceX96.toString()}
        </p>
        <p>
          <span className="font-semibold text-gray-900">Tick:</span> {tick.toString()}
        </p>
        <p>
          <span className="font-semibold text-gray-900">Protocol Fee:</span> {protocolFee.toString()}
        </p>
        <p>
          <span className="font-semibold text-gray-900">LP Fee:</span> {lpFee.toString()}
        </p>
      </div>
    </div>
  );
}
