export const QueueAbi = [
  {
    type: "function",
    name: "isEmpty",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "length",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "peek",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "euint128",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pop",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "euint128",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "push",
    inputs: [
      {
        name: "handle",
        type: "uint256",
        internalType: "euint128",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;
