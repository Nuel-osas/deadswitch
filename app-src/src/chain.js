import { defineChain } from 'viem';

// Creditcoin CC3 Testnet — the execution chain. Defined explicitly so that the
// wallet shows a real network name, the correct native currency and a working
// explorer link when it asks the user to switch or sign.
export const creditcoinCC3 = defineChain({
  id: 102031,
  name: 'Creditcoin CC3 Testnet',
  network: 'creditcoin-cc3-testnet',
  nativeCurrency: { name: 'Creditcoin', symbol: 'CTC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.cc3-testnet.creditcoin.network'] },
    public: { http: ['https://rpc.cc3-testnet.creditcoin.network'] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://creditcoin-testnet.blockscout.com' },
  },
  testnet: true,
});

export const CONTRACTS = {
  manager: '0x44e2d55Af74f400b97fBC010Acd504A1458bA682',
  vault: '0x80366d27b907828A36243140ce6ACED6350EE412',
  token: '0xe12EEc4cD89F695A709e27E8ceb01b213fcd9a0c',
};

export const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com';
export const PROVER = 'https://prover.cc3-testnet.creditcoin.network';
export const CHAIN_KEY = 1; // Sepolia's Attestcoin chainKey (not its EVM chainId)
export const POSITION_ID = 4n;

export const MANAGER_ABI = [
  {
    type: 'function', name: 'debtPositions', stateMutability: 'view',
    inputs: [{ type: 'uint256' }],
    outputs: [
      { name: 'borrower', type: 'address' },
      { name: 'debt', type: 'uint256' },
      { name: 'minCollateral', type: 'uint256' },
      { name: 'lastAttestedCollateral', type: 'uint256' },
      { name: 'lastAttestedBlock', type: 'uint64' },
      { name: 'status', type: 'uint8' },
      { name: 'exists', type: 'bool' },
    ],
  },
  {
    type: 'function', name: 'execute', stateMutability: 'nonpayable',
    inputs: [
      { name: 'chainKey', type: 'uint64' },
      { name: 'blockHeight', type: 'uint64' },
      { name: 'encodedTransaction', type: 'bytes' },
      { name: 'merkleRoot', type: 'bytes32' },
      { name: 'siblings', type: 'tuple[]', components: [{ name: 'hash', type: 'bytes32' }, { name: 'isLeft', type: 'bool' }] },
      { name: 'lowerEndpointDigest', type: 'bytes32' },
      { name: 'continuityRoots', type: 'bytes32[]' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'event', name: 'PositionLiquidated',
    inputs: [
      { name: 'positionId', type: 'uint256', indexed: true },
      { name: 'remainingCollateral', type: 'uint256' },
      { name: 'minCollateral', type: 'uint256' },
    ],
  },
  {
    type: 'event', name: 'CollateralAttested',
    inputs: [
      { name: 'positionId', type: 'uint256', indexed: true },
      { name: 'remaining', type: 'uint256' },
      { name: 'blockHeight', type: 'uint64' },
    ],
  },
  {
    type: 'event', name: 'PositionRestored',
    inputs: [
      { name: 'positionId', type: 'uint256', indexed: true },
      { name: 'remainingCollateral', type: 'uint256' },
      { name: 'minCollateral', type: 'uint256' },
    ],
  },
];

export const VAULT_ABI = [
  {
    type: 'function', name: 'positions', stateMutability: 'view',
    inputs: [{ type: 'uint256' }],
    outputs: [
      { name: 'owner', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'balance', type: 'uint256' },
      { name: 'exists', type: 'bool' },
    ],
  },
];
