import React from 'react';
import ReactDOM from 'react-dom/client';
import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, getDefaultConfig, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { creditcoinCC3 } from './chain';
import App from './App';
import './style.css';

const config = getDefaultConfig({
  appName: 'Deadswitch',
  // WalletConnect projectId. Injected wallets (MetaMask, Rabby, Brave, Coinbase)
  // work without a live project; WalletConnect QR needs a real id.
  projectId: 'deadswitch_cc3_testnet_demo',
  chains: [creditcoinCC3],
  ssr: false,
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
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
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
