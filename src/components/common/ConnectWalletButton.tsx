import React, { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Wallet, AlertTriangle, ChevronDown } from "lucide-react";
import { SOMNIA_CHAIN_ID, SOMNIA_RPC_URL, SOMNIA_EXPLORER_URL } from "../../config/constants.js";

export async function addSomniaToWallet() {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    alert("No Web3 wallet extension detected in your browser. Please install MetaMask, Rabby, or another browser wallet.");
    return false;
  }

  const ethereum = (window as any).ethereum;
  try {
    // Try switching to Somnia first
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${SOMNIA_CHAIN_ID.toString(16)}` }],
    });
    return true;
  } catch (switchError: any) {
    // Error 4902 indicates chain has not been added yet
    if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
      try {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: `0x${SOMNIA_CHAIN_ID.toString(16)}`,
              chainName: "Somnia Testnet (Shannon)",
              nativeCurrency: {
                name: "STT",
                symbol: "STT",
                decimals: 18,
              },
              rpcUrls: [SOMNIA_RPC_URL, "https://dream-rpc.somnia.network"],
              blockExplorerUrls: [SOMNIA_EXPLORER_URL],
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error("Failed to add Somnia network to wallet:", addError);
        return false;
      }
    }
    console.error("Failed to switch to Somnia network:", switchError);
    return false;
  }
}

export function ConnectWalletButton() {
  const [isSwitching, setIsSwitching] = useState(false);

  const handleDirectSwitch = async () => {
    setIsSwitching(true);
    try {
      await addSomniaToWallet();
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }: any) => {
        const ready = mounted;
        const connected = ready && account && chain;

        if (!ready) {
          return (
            <div
              aria-hidden="true"
              className="opacity-0 pointer-events-none select-none h-8 w-28 bg-bg-base border border-border-base"
            />
          );
        }

        // 1. NOT CONNECTED STATE
        if (!connected) {
          return (
            <button
              onClick={openConnectModal}
              type="button"
              className="h-8 px-3 bg-up-green text-[#0a0a0f] hover:bg-up-green/90 font-mono text-[11px] font-bold tracking-wider uppercase transition-colors flex items-center gap-1.5 cursor-pointer rounded-none border border-up-green"
            >
              <Wallet size={13} />
              <span>Connect Wallet</span>
            </button>
          );
        }

        // 2. CONNECTED BUT UNSUPPORTED NETWORK (e.g. user is on Ethereum Mainnet / Sepolia)
        if (chain.unsupported || chain.id !== SOMNIA_CHAIN_ID) {
          return (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleDirectSwitch}
                disabled={isSwitching}
                type="button"
                className="h-8 px-2.5 bg-down-red/20 text-down-red border border-down-red hover:bg-down-red hover:text-white font-mono text-[11px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer animate-pulse"
                title="Your wallet is on the wrong network. Click to switch to Somnia Shannon (50312)."
              >
                <AlertTriangle size={13} />
                <span>{isSwitching ? "Switching..." : "Switch to Somnia"}</span>
              </button>

              <button
                onClick={openChainModal}
                type="button"
                className="h-8 px-2 bg-bg-raised border border-border-base text-text-dim hover:text-text-primary font-mono text-[10px]"
                title="Select network manually"
              >
                <ChevronDown size={12} />
              </button>
            </div>
          );
        }

        // 3. FULLY CONNECTED & ON SOMNIA SHANNON (50312)
        return (
          <div className="flex items-center gap-1.5 font-mono">
            {/* Chain Pill */}
            <button
              onClick={openChainModal}
              type="button"
              className="h-8 px-2 bg-bg-base border border-border-base hover:border-border-interactive text-text-secondary hover:text-text-primary text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Connected to Somnia Shannon Testnet"
            >
              <span className="w-1.5 h-1.5 bg-up-green rounded-full inline-block"></span>
              <span className="hidden sm:inline text-cyan-eval">Somnia</span>
              <span className="text-text-dim text-[10px]">(50312)</span>
            </button>

            {/* Account Pill */}
            <button
              onClick={openAccountModal}
              type="button"
              className="h-8 px-2.5 bg-bg-raised border border-border-interactive hover:border-up-green text-text-primary text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open Account Modal"
            >
              <span className="w-2 h-2 bg-up-green inline-block"></span>
              <span>{account.displayName}</span>
              <ChevronDown size={11} className="text-text-dim" />
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
