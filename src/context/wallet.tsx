'use client';

import { configureChains, WagmiConfig, createConfig } from 'wagmi';
import { InjectedConnector } from 'wagmi/connectors/injected';
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect';
import { MetaMaskConnector } from 'wagmi/connectors/metaMask';
import { createContext, useContext, useEffect, useState } from 'react';
import {
  getContract,
  disconnect,
  signMessage,
  watchAccount,
  getPublicClient,
  getWalletClient,
} from '@wagmi/core';

import CONFIG from '@/config';
import { useGlobalState } from '@/store';
import axios, { BLOCKCHAIN } from '@/api';
import { ConnectKitProvider } from 'connectkit';
import { toast } from 'react-toastify';

const { chains, publicClient, webSocketPublicClient } = configureChains(
  CONFIG.setting.supported_chains,
  CONFIG.setting.providers
);

const config = createConfig({
  autoConnect: false,
  logger: {
    warn: null,
  },
  connectors: [
    new InjectedConnector({ chains }),
    new MetaMaskConnector({
      chains,
    }),
    new WalletConnectConnector({
      chains,
      options: {
        projectId: `${process.env.NEXT_PUBLIC_PROJECT_ID}`,
        showQrModal: false,
      },
    }),
  ],
  publicClient,
  webSocketPublicClient,
});

export const WalletContext = createContext<any>({});
export const useWalletContext = () => useContext(WalletContext);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const gState = useGlobalState();
  const [ctxContract, setCtxContract] = useState(null as any);

  /**
   * LISTENERS & LIFE CYCLE =======================================================
   */

  const onLoad = async () => {
    await fetchBlockchain();
    await loadContract();
  };

  const onWalletConnected = async () => {
    await grecaptcha();
  };

  // onVerified Listener
  const onVerified = async () => {
    await loadContract();
  };

  /**
   * CALLABLE FUNCTIONS ===========================================================
   */

  const fetchBlockchain = async () => {
    try {
      const blockchainData = await axios
        .get(BLOCKCHAIN)
        .then((res) => res.data);
      gState['blockchain'].set(blockchainData);

      const nft = {
        address: blockchainData.anito_address,
        abi: blockchainData.anito_abi,
      };
      const busd = {
        address: blockchainData.busd_address,
        abi: blockchainData.busd_abi,
      };

      gState['contracts'].set({ nft, busd });
    } catch (error) {
      console.error('fetchBlockchain: ', error);
    }
  };

  const loadContract = async () => {
    try {
      const publicClient = getPublicClient();
      const walletClient = await getWalletClient();

      const nft = getContract({
        ...gState['contracts']['nft'].get({ noproxy: true }),
        publicClient,
        walletClient,
      });
      const busd = getContract({
        ...gState['contracts']['busd'].get({ noproxy: true }),
        publicClient,
        walletClient,
      });

      setCtxContract({
        nft,
        busd,
      });
    } catch (error) {
      console.error('loadContract: ', error);
    }
  };

  const Disconnect = async () => {
    await disconnect();
    gState['wallet'].set(null);
    gState['verify'].set(null);
    window.localStorage.clear();
  };

  /**
   * WARNING: Don't mess with what's below unless you know what you are doing!
   */

  const grecaptcha = async () => {
    if (window.grecaptcha) {
      try {
        window.grecaptcha.ready((_) => executeGrecapcha(CONFIG.project));
      } catch (error) {
        console.error('grecaptcha: ', error);
      }
    }
  };

  const executeGrecapcha = async (action) => {
    try {
      // execute grecapcha
      const _gToken = await window.grecaptcha.execute(
        process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
        { action }
      );

      // request metamask for signing
      const _metamaskReq = await axios
        .post('/login/request', {
          address: gState['wallet']['address'].value,
          'g-recaptcha-response': _gToken,
        })
        .then((res) => res.data);

      toast.info(_metamaskReq.message);
      const signature = await signMessage({
        message: _metamaskReq.data,
      });

      // verify signed token
      const verify = await axios
        .post('/login/verify', {
          address: gState['wallet']['address'].value,
          signature,
        })
        .then((res) => res.data);

      toast.success(verify.message);
      localStorage.setItem('token', verify.token);
      gState['verify'].set(verify);
    } catch (error) {
      console.warn('executeGrecapcha: ', error);
    }
  };

  const onAccountChange = async (account) => {
    if (gState['wallet'].value) {
      if (gState['wallet']['address'].value !== account.address) {
        // account has changed
        console.log('onChangeAccount: ', account);
        Disconnect();
      }
    } else {
      if (account.isConnected) {
        gState['wallet'].set({
          address: account.address,
          isConnected: account.isConnected,
          isConnecting: account.isConnecting,
          isDisconnected: account.isDisconnected,
          status: account.status,
        });
        await onWalletConnected();
      }
    }
  };

  useEffect(() => {
    onLoad();
    const unwatch = watchAccount(onAccountChange);

    return () => {
      unwatch();
    };
  }, []);

  useEffect(() => {
    if (gState['verify'].value) {
      onVerified();
    }
  }, [gState['verify']]);

  return (
    <WalletContext.Provider
      value={{
        toast,
        ctxContract,
        onLoad,
        onWalletConnected,
        Disconnect,
      }}
    >
      <WagmiConfig config={config}>
        <ConnectKitProvider>{children}</ConnectKitProvider>
      </WagmiConfig>
    </WalletContext.Provider>
  );
}
