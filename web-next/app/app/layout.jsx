import './app.css';
import Providers from './providers';

export const metadata = {
  title: 'Deadswitch: live console',
  description:
    'Live Deadswitch state on Creditcoin CC3 and Ethereum Sepolia. Submit an Attestcoin proof with your own wallet: proof submission is permissionless.',
};

export default function AppLayout({ children }) {
  return <Providers>{children}</Providers>;
}
