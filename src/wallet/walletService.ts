import { createWalletClient, custom, type Address, type WalletClient, formatUnits } from "viem";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { SOMNIA_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";

export interface WalletState {
  connected: boolean;
  address: Address | null;
  chainId: number | null;
  sttBalance: string;
  usdcBalance: string;
  walletClient: WalletClient | null;
}

const SOMNIA_SHANNON_PARAMS = {
  chainId: "0xc488", // 50312
  chainName: "Somnia Shannon Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: ["https://api.infra.testnet.somnia.network"],
  blockExplorerUrls: ["https://shannon-explorer.somnia.network"],
};

export class WalletService {
  private static instance: WalletService;

  static getInstance(): WalletService {
    if (!this.instance) {
      this.instance = new WalletService();
    }
    return this.instance;
  }

  isAvailable(): boolean {
    return typeof window !== "undefined" && typeof (window as any).ethereum !== "undefined";
  }

  async connect(): Promise<WalletState> {
    if (!this.isAvailable()) {
      throw new Error("No Web3 wallet found. Please install MetaMask, Rabby, or another EVM wallet.");
    }

    const ethereum = (window as any).ethereum;

    // 1. Request accounts
    const accounts: string[] = await ethereum.request({ method: "eth_requestAccounts" });
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts selected");
    }

    const address = accounts[0] as Address;

    // 2. Ensure Somnia Shannon Testnet (50312)
    const currentChainHex: string = await ethereum.request({ method: "eth_chainId" });
    const currentChainId = parseInt(currentChainHex, 16);

    if (currentChainId !== 50312) {
      try {
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: SOMNIA_SHANNON_PARAMS.chainId }],
        });
      } catch (switchError: any) {
        // Chain not added to wallet yet (code 4902)
        if (switchError.code === 4902 || switchError.message?.includes("Unrecognized chain")) {
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [SOMNIA_SHANNON_PARAMS],
          });
        } else {
          throw switchError;
        }
      }
    }

    // 3. Create Viem WalletClient
    const walletClient = createWalletClient({
      account: address,
      chain: somniaShannon,
      transport: custom(ethereum),
    });

    // 4. Read native STT balance
    let sttBalance = "0.00";
    try {
      const rawBalance = await ethereum.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      });
      sttBalance = parseFloat(formatUnits(BigInt(rawBalance), 18)).toFixed(3);
    } catch {
      // Balance read fallback
    }

    // 5. Read Test USDC collateral balance (6dp)
    let usdcBalance = "0.00";
    try {
      // balanceOf(address) selector: 0x70a08231 + padded address
      const data = `0x70a08231000000000000000000000000${address.slice(2).toLowerCase()}`;
      const rawUsdc = await ethereum.request({
        method: "eth_call",
        params: [
          {
            to: SOMNIA_TESTNET_ADDRESSES.testUsdc,
            data,
          },
          "latest",
        ],
      });
      if (rawUsdc && rawUsdc !== "0x") {
        usdcBalance = parseFloat(formatUnits(BigInt(rawUsdc), 6)).toFixed(2);
      }
    } catch {
      // Collateral balance read fallback
    }

    return {
      connected: true,
      address,
      chainId: 50312,
      sttBalance,
      usdcBalance,
      walletClient,
    };
  }
}
