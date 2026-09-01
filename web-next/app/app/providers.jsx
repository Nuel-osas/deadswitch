'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, getDefaultConfig, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { creditcoinCC3 } from '../chain';

const config = getDefaultConfig({
  appName: 'Deadswitch',
  // Injected wallets (MetaMask, Rabby, Brave, Coinbase) work without a live
  // WalletConnect project; the QR flow needs a real projectId.
  projectId: 'deadswitch_cc3_testnet_demo',
  chains: [creditcoinCC3],
  ssr: true,
});

export default function Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          initialChain={creditcoinCC3}
          theme={darkTheme({
            accentColor: '#ff3b41',
            accentColorForeground: '#0a0507',
            borderRadius: 'small',
            overlayBlur: 'small',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
