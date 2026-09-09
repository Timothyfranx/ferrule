import React, { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
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
    // Error 4902 or unrecognized chain indicates chain has not been added yet
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
  const { chainId: wagmiAccountChainId } = useAccount();
  const currentChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  const handleDirectSwitch = async () => {
    setIsSwitching(true);
    try {
      if (switchChainAsync) {
        await switchChainAsync({ chainId: SOMNIA_CHAIN_ID });
      } else {
        await addSomniaToWallet();
      }
    } catch (switchErr) {
      console.warn("Wagmi switchChain error, falling back to wallet RPC:", switchErr);
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
        const connected = ready && Boolean(account);

        if (!ready) {
          return (
            <div
              aria-hidden="true"
              className="opacity-0 pointer-events-none select-none h-7 w-24 bg-bg-base border border-border-base rounded-[3px]"
            />
          );
        }

        // 1. NOT CONNECTED STATE
        if (!connected) {
          return (
            <button
              onClick={openConnectModal}
              type="button"
              className="h-7 px-2.5 sm:px-3 bg-bg-base border border-border-interactive hover:border-cyan-eval/60 text-text-primary hover:text-white font-mono text-[11px] font-medium tracking-wide uppercase transition-all flex items-center gap-1.5 cursor-pointer rounded-[3px] group shadow-xs"
            >
              <Wallet size={12} className="text-text-dim group-hover:text-cyan-eval transition-colors" />
              <span>Connect Wallet</span>
            </button>
          );
        }

        // Robust multi-source chain ID detection
        const rawEthereumChainId =
          typeof window !== "undefined" && (window as any).ethereum?.chainId
            ? (window as any).ethereum.chainId
            : null;

        const parsedEthChainId = rawEthereumChainId
          ? (typeof rawEthereumChainId === "string" && rawEthereumChainId.startsWith("0x")
              ? parseInt(rawEthereumChainId, 16)
              : Number(rawEthereumChainId))
          : null;

        const effectiveChainId =
          (chain?.id ? Number(chain.id) : null) ??
          (wagmiAccountChainId ? Number(wagmiAccountChainId) : null) ??
          (currentChainId ? Number(currentChainId) : null) ??
          parsedEthChainId;

        // Valid Somnia chain IDs (Shannon testnet 50312, or local/devnet 5031)
        const isSomnia =
          effectiveChainId === SOMNIA_CHAIN_ID ||
          effectiveChainId === 5031 ||
          parsedEthChainId === SOMNIA_CHAIN_ID;

        // 2. CONNECTED BUT NOT ON SOMNIA SHANNON
        if (!isSomnia) {
          return (
            <div className="flex items-center gap-1">
              <button
                onClick={handleDirectSwitch}
                disabled={isSwitching}
                type="button"
                className="h-7 px-2 bg-down-red/15 text-down-red border border-down-red hover:bg-down-red/25 font-mono text-[10px] font-bold tracking-wider uppercase transition-colors flex items-center gap-1.5 cursor-pointer rounded-[3px]"
                title="Your wallet is on the wrong network. Click to switch to Somnia Shannon (50312)."
              >
                <AlertTriangle size={11} />
                <span>{isSwitching ? "Switching..." : "Switch Network"}</span>
              </button>

              <button
                onClick={openChainModal}
                type="button"
                className="h-7 px-1.5 bg-bg-base border border-border-base text-text-dim hover:text-text-primary font-mono text-[10px] rounded-[3px] cursor-pointer"
                title="Select network manually"
              >
                <ChevronDown size={11} />
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
              className="h-7 px-2 bg-bg-base border border-border-base hover:border-border-interactive text-text-secondary hover:text-text-primary text-[10px] flex items-center gap-1.5 transition-colors cursor-pointer rounded-[3px]"
              title="Connected to Somnia Shannon Testnet"
            >
              <span className="w-1.5 h-1.5 bg-up-green rounded-full inline-block"></span>
              <span className="text-text-secondary">Shannon</span>
            </button>

            {/* Account Pill */}
            <button
              onClick={openAccountModal}
              type="button"
              className="h-7 px-2 bg-bg-base border border-border-interactive hover:border-text-secondary text-text-primary text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer rounded-[3px]"
              title="Open Account Modal"
            >
              <span className="w-1.5 h-1.5 bg-up-green inline-block"></span>
              <span>{account.displayName}</span>
              <ChevronDown size={10} className="text-text-dim" />
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
