// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.25;

// TASK

// Operations like FHE_add, FHE_sub, FHE_mul, FHE_div are computationally expensive
// We want to charge for their usage, paid with FHEToken
// Create a system in FHE.sol that tracks how much the user should pay for the operations
// And automatically withdraws the payment from the user's wallet.
// There should only be a single FHEToken transaction per user transaction.
// If the user does not have enough FHEToken, the transaction should revert.

// Prices:
// FHE_add: 1 FHEToken
// FHE_sub: 1 FHEToken
// FHE_mul: 2 FHEToken
// FHE_div: 5 FHEToken

// Example:
// mixedUsage() should cost 1 + 2 + 1 + 5 + 2 + 1 + 1 = 13 FHEToken

contract FHE {
    // TODO: Implement payment system

    // HINT: Modifiers allow you to run code before and after a function
    modifier trackCost() {
        // Logic (run before the function)
        {

        }

        // Function body
        _;

        // Logic (run after the function)
        {

        }

        return;
    }

    function FHE_add(uint32 a, uint32 b) internal pure returns (uint32) {
        return a + b;
    }

    function FHE_sub(uint32 a, uint32 b) internal pure returns (uint32) {
        return a - b;
    }

    function FHE_mul(uint32 a, uint32 b) internal pure returns (uint32) {
        return a * b;
    }

    function FHE_div(uint32 a, uint32 b) internal pure returns (uint32) {
        return a / b;
    }
}

contract ExampleUsageContract is FHE {
    uint32 public count;

    constructor() {
        count = 0;
    }

    function increment() public {
        count = FHE_add(count, 1);
    }

    function decrement() public {
        count = FHE_sub(count, 1);
    }

    function double() public {
        count = FHE_mul(count, 2);
    }

    function half() public {
        count = FHE_div(count, 2);
    }

    function mixedUsage() public {
        increment();
        double();
        decrement();
        half();
        double();
        increment();
        decrement();
    }
}
