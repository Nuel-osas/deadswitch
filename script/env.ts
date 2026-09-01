import dotenv from 'dotenv';

dotenv.config({ override: true });

/**
 * Fail fast, before any network work, with a message that names exactly what is
 * missing. Without this the scripts die on an ethers stack trace — and
 * liquidate.ts does ~30 seconds of real proving first, which is worse.
 */
export function requireEnv(keys: string[]): void {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(
      `\nMissing required environment variable${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}\n` +
      `Copy .env.example to .env and fill in CREDITCOIN_WALLET_PRIVATE_KEY (testnet key only).\n`
    );
    process.exit(1);
  }
}

export const CORE = [
  'SOURCE_CHAIN_KEY', 'PROOF_BUILDER_URL', 'CREDITCOIN_RPC_URL',
  'SOURCE_CHAIN_RPC_URL', 'CREDITCOIN_WALLET_PRIVATE_KEY',
];
