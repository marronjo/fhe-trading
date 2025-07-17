"use client";

import { Slot0Display } from "./PoolStateViewComponent";
import { SwapComponent } from "./SwapComponent";
import { TokenFaucet } from "./TokenFaucet";
import type { NextPage } from "next";

const Home: NextPage = () => {
  return (
    <>
      <div className="flex items-center flex-col grow pt-10">
        <div className="grow bg-base-300 w-full mt-16 px-8 py-12">
          <div className="flex justify-center items-center gap-12 flex-col md:flex-row">
            <SwapComponent />
          </div>
        </div>
        <div className="grow bg-base-300 w-full mt-16 px-8 py-12">
          <div className="flex justify-center items-center gap-12 flex-col md:flex-row">
            <Slot0Display />
          </div>
        </div>
        <div className="flex-1">
          <TokenFaucet />
        </div>
      </div>
    </>
  );
};

export default Home;
