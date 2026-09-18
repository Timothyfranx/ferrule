import React, { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { Wallet, AlertTriangle, ChevronDown } from "lucide-react";
import { 
  ARC_CHAIN_ID, 
  ARC_RPC_URL, 
  ARC_EXPLORER_URL 
} from "../../config/constants.js";

export async function addArcToWallet() {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    alert("No Web3 wallet extension detected in your browser. Please install MetaMask, Rabby, or another browser wallet.");
    return false;
  }

  const ethereum = (window as any).ethereum;
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${ARC_CHAIN_ID.toString(16)}` }],
    });
    return true;
  } catch (switchError: any) {
    const isUnrecognized = 
      switchError?.code === 4902 || 
      switchError?.data?.originalError?.code === 4902 ||
      switchError?.message?.includes("Unrecognized chain ID") ||
      switchError?.message?.includes("4902");

    if (isUnrecognized) {
      try {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: `0x${ARC_CHAIN_ID.toString(16)}`,
              chainName: "Arc Mainnet",
              nativeCurrency: {
                name: "USDC",
                symbol: "USDC",
                decimals: 18,
              },
              rpcUrls: [ARC_RPC_URL],
              blockExplorerUrls: [ARC_EXPLORER_URL],
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error("Failed to add Arc Mainnet to wallet:", addError);
        return false;
      }
    }
    return false;
  }
}

export function ConnectWalletButton() {
  const { chainId: wagmiAccountChainId } = useAccount();
  const currentChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const [isSwitching, setIsSwitching] = useState(false);

  // Directly handle network switch via Wagmi or RPC
  const handleDirectSwitch = async () => {
    setIsSwitching(true);
    try {
      if (switchChainAsync) {
        try {
          await switchChainAsync({ chainId: ARC_CHAIN_ID });
          setIsSwitching(false);
          return;
        } catch {
          // Fall through to manual wallet_switchEthereumChain
        }
      }
      await addArcToWallet();
    } catch (err) {
      console.error("Direct network switch error:", err);
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
              className="opacity-0 pointer-events-none select-none font-mono text-xs"
            >
              Loading...
            </div>
          );
        }

        // 1. NOT CONNECTED STATE
        if (!connected) {
          return (
            <button
              id="connect-wallet-btn"
              onClick={openConnectModal}
              type="button"
              className="h-7 px-3 bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-[#080B10] font-mono text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer rounded"
              title="Connect Web3 Wallet"
            >
              <Wallet size={12} />
              <span>Connect Wallet</span>
            </button>
          );
        }

        // Direct check against window.ethereum
        const rawEthChainId = typeof window !== "undefined" ? (window as any).ethereum?.chainId : null;
        const parsedEthChainId = rawEthChainId ? parseInt(rawEthChainId, 16) : null;

        const effectiveChainId =
          (chain?.id ? Number(chain.id) : null) ??
          (wagmiAccountChainId ? Number(wagmiAccountChainId) : null) ??
          (currentChainId ? Number(currentChainId) : null) ??
          parsedEthChainId;

        const isArc = effectiveChainId === ARC_CHAIN_ID || parsedEthChainId === ARC_CHAIN_ID;

        // 2. CONNECTED BUT ON WRONG NETWORK
        if (!isArc) {
          return (
            <div className="flex items-center gap-1">
              <button
                onClick={handleDirectSwitch}
                disabled={isSwitching}
                type="button"
                className="h-7 px-2 bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444] hover:bg-[#EF4444]/25 font-mono text-[10px] font-bold tracking-wider uppercase transition-colors flex items-center gap-1.5 cursor-pointer rounded"
                title="Your wallet is on the wrong network. Click to switch to Arc Mainnet (5042)."
              >
                <AlertTriangle size={11} />
                <span>{isSwitching ? "Switching..." : "Switch to Arc"}</span>
              </button>

              <button
                onClick={openChainModal}
                type="button"
                className="h-7 px-1.5 bg-[#0D121D] border border-[#1E293B] text-[#64748B] hover:text-white font-mono text-[10px] rounded cursor-pointer"
                title="Select network manually"
              >
                <ChevronDown size={11} />
              </button>
            </div>
          );
        }

        // 3. FULLY CONNECTED (Arc Mainnet)
        return (
          <div className="flex items-center gap-1.5 font-mono">
            {/* Chain Pill */}
            <button
              onClick={openChainModal}
              type="button"
              className="h-7 px-2 bg-[#0D121D] border border-[#1E293B] hover:border-[#334155] text-[#94A3B8] hover:text-white text-[10px] flex items-center gap-1.5 transition-colors cursor-pointer rounded"
              title="Connected to Arc Mainnet (5042)"
            >
              <span className="w-1.5 h-1.5 rounded-full inline-block bg-[#00E5FF] shadow-[0_0_6px_#00E5FF]"></span>
              <span className="text-[#00E5FF] font-bold">
                Arc Mainnet
              </span>
            </button>

            {/* Account Pill */}
            <button
              onClick={openAccountModal}
              type="button"
              className="h-7 px-2.5 bg-[#0D121D] border border-[#1E293B] hover:border-[#334155] text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer rounded"
              title="Open Account Modal"
            >
              <span className="w-1.5 h-1.5 bg-[#10B981] inline-block rounded-full"></span>
              <span>{account.displayName}</span>
              <ChevronDown size={10} className="text-[#64748B]" />
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
