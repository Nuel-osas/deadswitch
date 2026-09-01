import './landing.css';

export const metadata = {
  title: 'Deadswitch: cross-chain liquidation proven by Attestcoin',
  description:
    'Deadswitch: collateral on Ethereum Sepolia, debt on Creditcoin CC3. The position liquidates itself when the collateral leaves, proven by an Attestcoin receipt from the source chain. No bridge, no relayer, no price feed.',
  icons: {
    icon:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%2309090b'/%3E%3Cg fill='%23ff3b41'%3E%3Crect x='3' y='9' width='4.5' height='6'/%3E%3Crect x='7.5' y='10.5' width='9' height='3'/%3E%3Crect x='16.5' y='3' width='4.5' height='7.5'/%3E%3Crect x='16.5' y='13.5' width='4.5' height='7.5'/%3E%3C/g%3E%3C/svg%3E",
  },
};

export const viewport = { themeColor: '#09090b' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
