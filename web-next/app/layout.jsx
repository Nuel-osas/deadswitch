import './landing.css';

export const metadata = {
  title: 'Deadswitch: cross-chain liquidation proven by Attestcoin',
  description:
    'Deadswitch: collateral on Ethereum Sepolia, debt on Creditcoin CC3. The position liquidates itself when the collateral leaves, proven by an Attestcoin receipt from the source chain. No bridge, no relayer, no price feed.',
  icons: {
    icon:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%2309090b'/%3E%3Crect x='2.6' y='5.4' width='6.6' height='13.2' rx='1.4' fill='none' stroke='%23ff3b41' stroke-width='2'/%3E%3Crect x='14.8' y='5.4' width='6.6' height='13.2' rx='1.4' fill='none' stroke='%23ff3b41' stroke-width='2'/%3E%3Cpath d='M9.2 12h1.6M13.2 12h1.6' stroke='%23ff3b41' stroke-width='2'/%3E%3C/svg%3E",
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
