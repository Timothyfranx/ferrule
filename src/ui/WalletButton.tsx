import React, { useState } from "react";
import { Wallet, LogOut, ExternalLink, ChevronDown, Check } from "lucide-react";
import type { WalletState } from "../wallet/walletService.js";

interface WalletButtonProps {
  walletState: WalletState;
  onConnect: () => Promise<void>;
  onDisconnect: () => void;
  loading: boolean;
}

export function WalletButton({ walletState, onConnect, onDisconnect, loading }: WalletButtonProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function copyAddress() {
    if (walletState.address) {
      navigator.clipboard.writeText(walletState.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (!walletState.connected) {
    return (
      <button
        className="mode-btn real"
        style={{
          padding: "0.5rem 1rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.45rem",
          boxShadow: "0 2px 10px rgba(16, 185, 129, 0.35)",
        }}
        onClick={onConnect}
        disabled={loading}
      >
        <Wallet size={16} />
        {loading ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  const shortAddress = `${walletState.address!.slice(0, 6)}...${walletState.address!.slice(-4)}`;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          background: "var(--bg-subtle)",
          border: "1px solid var(--border-bright)",
          borderRadius: "0.5rem",
          padding: "0.35rem 0.75rem",
          color: "var(--text-main)",
          cursor: "pointer",
          fontSize: "0.85rem",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span className="mono" style={{ fontWeight: 700 }}>{shortAddress}</span>
          <span style={{ fontSize: "0.68rem", color: "var(--up-color)" }}>
            ${walletState.usdcBalance} tUSDC · {walletState.sttBalance} STT
          </span>
        </div>
        <ChevronDown size={14} color="var(--text-dim)" />
      </button>

      {dropdownOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 0.5rem)",
            right: 0,
            background: "var(--bg-card)",
            border: "1px solid var(--border-bright)",
            borderRadius: "0.6rem",
            padding: "0.5rem",
            minWidth: "220px",
            zIndex: 100,
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}
        >
          <button
            onClick={copyAddress}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              padding: "0.5rem 0.6rem",
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontSize: "0.8rem",
              width: "100%",
              textAlign: "left",
            }}
          >
            {copied ? <Check size={14} color="var(--up-color)" /> : <Wallet size={14} />}
            {copied ? "Address Copied!" : "Copy Address"}
          </button>

          <a
            href={`https://shannon-explorer.somnia.network/address/${walletState.address}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "var(--text-muted)",
              padding: "0.5rem 0.6rem",
              borderRadius: "0.375rem",
              fontSize: "0.8rem",
              textDecoration: "none",
            }}
          >
            <ExternalLink size={14} />
            View on Explorer
          </a>

          <div style={{ height: "1px", background: "var(--border-color)", margin: "0.25rem 0" }}></div>

          <button
            onClick={() => {
              setDropdownOpen(false);
              onDisconnect();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "transparent",
              border: "none",
              color: "var(--down-color)",
              padding: "0.5rem 0.6rem",
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontSize: "0.8rem",
              width: "100%",
              textAlign: "left",
            }}
          >
            <LogOut size={14} />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
