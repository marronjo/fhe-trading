/* eslint-disable @typescript-eslint/no-unused-vars */
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import hre from "hardhat";
import { cofhejs, Encryptable, FheTypes } from "cofhejs/node";

describe("Counter", function () {
  async function deployCounterFixture() {
    // Contracts are deployed using the first signer/account by default
    const [signer, signer2, bob, alice] = await hre.ethers.getSigners();

    const Counter = await hre.ethers.getContractFactory("FHECounter");
    const counter = await Counter.connect(bob).deploy();

    return { counter, signer, bob, alice };
  }

  describe("Functionality", function () {
    beforeEach(function () {
      if (!hre.cofhe.isPermittedEnvironment("MOCK")) this.skip();

      // NOTE: Uncomment for global logging
      // hre.cofhe.mocks.enableLogs()
    });

    afterEach(function () {
      if (!hre.cofhe.isPermittedEnvironment("MOCK")) return;

      // NOTE: Uncomment for global logging
      // hre.cofhe.mocks.disableLogs()
    });

    it("Should increment the counter", async function () {
      const { counter, bob } = await loadFixture(deployCounterFixture);
      const count = await counter.count();
      await hre.cofhe.mocks.expectPlaintext(count, 0n);

      await hre.cofhe.mocks.withLogs("counter.increment()", async () => {
        await counter.connect(bob).increment();
      });

      const count2 = await counter.count();
      await hre.cofhe.mocks.expectPlaintext(count2, 1n);
    });
    it("cofhejs unseal (mocks)", async function () {
      await hre.cofhe.mocks.enableLogs("cofhejs unseal (mocks)");
      const { counter, bob } = await loadFixture(deployCounterFixture);

      await hre.cofhe.expectResultSuccess(hre.cofhe.initializeWithHardhatSigner(bob));

      const count = await counter.count();
      const unsealedResult = await cofhejs.unseal(count, FheTypes.Uint32);
      console.log("unsealedResult", unsealedResult);
      await hre.cofhe.expectResultValue(unsealedResult, 0n);

      await counter.connect(bob).increment();

      const count2 = await counter.count();
      const unsealedResult2 = await cofhejs.unseal(count2, FheTypes.Uint32);
      await hre.cofhe.expectResultValue(unsealedResult2, 1n);

      await hre.cofhe.mocks.disableLogs();
    });
    it("cofhejs encrypt (mocks)", async function () {
      const { counter, bob } = await loadFixture(deployCounterFixture);

      await hre.cofhe.expectResultSuccess(hre.cofhe.initializeWithHardhatSigner(bob));

      const [encryptedInput] = await hre.cofhe.expectResultSuccess(cofhejs.encrypt([Encryptable.uint32(5n)] as const));
      await hre.cofhe.mocks.expectPlaintext(encryptedInput.ctHash, 5n);

      await counter.connect(bob).set(encryptedInput);

      const count = await counter.count();
      await hre.cofhe.mocks.expectPlaintext(count, 5n);

      const unsealedResult = await cofhejs.unseal(count, FheTypes.Uint32);
      await hre.cofhe.expectResultValue(unsealedResult, 5n);
    });
  });
});
