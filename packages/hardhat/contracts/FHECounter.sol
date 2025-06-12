// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

/**
 * @title FHECounter
 * @dev A simple counter contract that demonstrates the use of Fully Homomorphic Encryption (FHE)
 * to perform encrypted arithmetic operations. The counter value is stored in encrypted form,
 * allowing for private increments, decrements, and value updates.
 *
 * This contract showcases basic FHE operations:
 * - Encrypted state storage
 * - Encrypted arithmetic (addition and subtraction)
 * - Access control for encrypted values
 * - Value encryption and decryption
 */
contract FHECounter {
    /// @notice The encrypted counter value
    euint32 public count;

    /// @notice A constant encrypted value of 1 used for increments/decrements (gas saving)
    euint32 private ONE;

    /**
     * @dev Initializes the contract with encrypted values and sets up access permissions
     * - Sets ONE to encrypted value of 1
     * - Initializes count to encrypted value of 0
     * - Configures access permissions for the encrypted values
     */
    constructor() {
        ONE = FHE.asEuint32(1);
        count = FHE.asEuint32(0);

        // Allows anyone to read the initial encrypted value (0)
        // Also allows anyone to perform an operation USING the initial value
        FHE.allowGlobal(count);

        // Allows this contract to perform operations using the constant ONE
        FHE.allowThis(ONE);
    }

    /**
     * @dev Increments the encrypted counter value by 1
     * Updates access permissions to allow the contract and sender to read the new value
     */
    function increment() public {
        // Performs an encrypted addition of count and ONE
        count = FHE.add(count, ONE);

        // Only this contract and the sender can read the new value
        FHE.allowThis(count);
        FHE.allowSender(count);
    }

    /**
     * @dev Decrements the encrypted counter value by 1
     * Updates access permissions to allow the contract and sender to read the new value
     */
    function decrement() public {
        count = FHE.sub(count, ONE);
        FHE.allowThis(count);
        FHE.allowSender(count);
    }

    /**
     * @dev Sets the counter to a new encrypted value
     * @param value The new encrypted value to set the counter to
     * Updates access permissions to allow the contract and sender to read the new value
     */
    function set(InEuint32 memory value) public {
        count = FHE.asEuint32(value);
        FHE.allowThis(count);
        FHE.allowSender(count);
    }
}
