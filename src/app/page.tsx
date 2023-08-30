'use client';

import config from '@/lib/config';
import { useWalletContext } from '@/context/wallet';
import { useGlobalState } from '@/lib/store';
import { useHookstate } from '@hookstate/core';
import { ConnectKitButton } from 'connectkit';
import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { getPublicClient, waitForTransaction } from '@wagmi/core';

export default function Home() {
  const gState = useGlobalState();
  const { status, address, isDisconnected } = useAccount();
  const { toast, Disconnect, ctxContract } = useWalletContext();
  const balance = useHookstate(0);
  const recipient = useHookstate('');
  const amount = useHookstate(0);

  const getBusdBal = async () => {
    try {
      console.log(ctxContract.busd);
      const data = await ctxContract.busd.read.balanceOf([
        address ?? '0x7893fb78A1273651105cF91d176C11a4186F137c',
      ]);
      console.log('TEST: ', data);

      const bal = await toBUSD(data.toString());
      balance.set(bal);
      toast.success(`Balance: ${bal}`);
    } catch (e) {
      console.error(e);
    }
  };

  const sendBusd = async () => {
    try {
      const _amount = await toRawBUSD(amount.value);
      const publicClient = getPublicClient();

      console.log(config.setting.supported_chains[0]);

      const block = await publicClient.getBlock({
        blockTag: 'latest',
      });
      console.log('block: ', block);

      // const data = await ctxContract.busd.write.transfer(
      //   [recipient.value, _amount],
      //   {
      //     chain: config.setting.supported_chains[0],
      //     gasLimit: block.gasLimit,
      //     gas: block.gasUsed,
      //   }
      // );
      const data = await ctxContract.busd.write.transfer(
        [recipient.value, _amount],
        config.writeContract
      );
      const wait = await waitForTransaction({
        hash: data,
      });
      console.log('Test: ', wait);

      toast.success('SENT SUCCESS');
    } catch (error) {
      toast.error(error.details);
      console.log(error);
      console.error('TEST: ', error.details);
    } finally {
      getBusdBal();
    }
  };

  const toBUSD = async (price) => {
    const usdtDecimal = await ctxContract.busd.read.decimals();
    return Number(price) / 10 ** Number(usdtDecimal);
  };

  const toRawBUSD = async (price) => {
    const usdtDecimal = await ctxContract.busd.read.decimals();
    return Number(price) * 10 ** Number(usdtDecimal);
  };

  useEffect(() => {
    if (isDisconnected) {
      balance.set(0);
    }
  }, [isDisconnected]);

  return (
    <main className="bg-gray-200">
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-4xl font-bold text-red-500">
          Next-Tailwind Starter Template
        </h1>

        {/* sample */}
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="flex items-center gap-4">
            <ConnectKitButton />
            <ConnectKitButton.Custom>
              {({ show, isConnected, truncatedAddress }) => {
                return (
                  <button
                    onClick={show}
                    className="rounded-lg bg-green-500 px-6 py-2 text-white hover:bg-green-600 active:scale-95"
                  >
                    {isConnected ? truncatedAddress : 'Custom Connect'}
                  </button>
                );
              }}
            </ConnectKitButton.Custom>
            {gState['verify'].value && (
              <button
                onClick={() => Disconnect()}
                className="rounded-lg bg-red-500 px-6 py-2 text-white hover:bg-red-600 active:scale-95"
              >
                Disconnect
              </button>
            )}
          </div>

          <div className="text-center">
            <div>Status:</div>
            <div className="text-red-500">{status}</div>
            {address && <div>{address}</div>}
          </div>

          <div className="flex flex-col items-center">
            <button
              onClick={getBusdBal}
              className="rounded-lg bg-green-500 px-6 py-2 text-white hover:bg-green-600 active:scale-95"
            >
              GET BUSD BALANCE
            </button>
            <div>{`BUSD Balance: ${balance.value.toLocaleString()}`}</div>
          </div>

          {gState['verify'].value && (
            <div className="space-y-8 pt-6">
              <div className="flex flex-col items-center gap-2">
                <input
                  className="border px-4 py-1"
                  type="text"
                  value={recipient.value}
                  onChange={(e) => recipient.set(e.target.value)}
                  placeholder="Recipient Address"
                />
                <input
                  className="border px-4 py-1"
                  type="number"
                  value={amount.value}
                  onChange={(e) => amount.set(Number(e.target.value))}
                  placeholder="Amount"
                />
                <button
                  onClick={sendBusd}
                  className="rounded-lg bg-green-500 px-6 py-2 text-white hover:bg-green-600 active:scale-95"
                >
                  SEND
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
