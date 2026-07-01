"use client";

import { useCallback, useState } from "react";
import {
  BadgeCheck,
  Copy,
  FileSignature,
  KeyRound,
  Send,
  Wallet,
} from "lucide-react";
import { isValidSolanaAddress } from "@/lib/bearco";
import {
  createBearcoClaimCode,
  createBearcoClaimMessage,
} from "@/lib/bearco-client-claim";

interface DisconnectedClaimHolder {
  claiming: boolean;
  displayName: string;
  lookupWallet: string;
  profile?: { walletAddress: string } | null;
  sessionWalletAddress: string;
  walletAddress: string;
  claimProfileWithMemo: (input: {
    displayName: string;
    message: string;
    transactionSignature: string;
    walletAddress: string;
  }) => Promise<void>;
  claimProfileWithSignature: (input: {
    displayName: string;
    message: string;
    signature: string;
    successMessage: string;
    walletAddress: string;
  }) => Promise<void>;
}

export function BearcoDisconnectedClaimPanel({
  holder,
}: {
  holder: DisconnectedClaimHolder;
}) {
  const suggestedWallet =
    holder.lookupWallet ||
    holder.walletAddress ||
    holder.sessionWalletAddress ||
    holder.profile?.walletAddress ||
    "";
  const [proofWallet, setProofWallet] = useState(suggestedWallet);
  const [proofDisplayName, setProofDisplayName] = useState(holder.displayName);
  const [claimMessage, setClaimMessage] = useState("");
  const [signature, setSignature] = useState("");
  const [memoTransaction, setMemoTransaction] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const validWallet = isValidSolanaAddress(proofWallet);
  const memoCode = claimMessage.match(/^Claim Code: (.+)$/m)?.[1] || "";

  const createMessage = useCallback(() => {
    const trimmedWallet = proofWallet.trim();
    if (!isValidSolanaAddress(trimmedWallet)) {
      setLocalError("Paste a valid Solana wallet address first.");
      return;
    }

    setLocalError(null);
    setCopied(null);
    setClaimMessage(
      createBearcoClaimMessage({
        claimCode: createBearcoClaimCode(),
        displayName: proofDisplayName,
        host: window.location.host,
        walletAddress: trimmedWallet,
      }),
    );
  }, [proofDisplayName, proofWallet]);

  const copyValue = useCallback(async (label: string, value: string) => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setLocalError(null);
    } catch {
      setLocalError("Clipboard permission was blocked. Select and copy manually.");
    }
  }, []);

  const submitSignature = useCallback(async () => {
    const trimmedWallet = proofWallet.trim();
    if (!claimMessage || !signature.trim()) {
      setLocalError("Create the message, sign it offline, then paste the signature.");
      return;
    }

    setLocalError(null);
    await holder.claimProfileWithSignature({
      walletAddress: trimmedWallet,
      displayName: proofDisplayName,
      message: claimMessage,
      signature,
      successMessage:
        "Offline signature verified. Social auth and holder rooms are unlocked for this browser session.",
    });
  }, [claimMessage, holder, proofDisplayName, proofWallet, signature]);

  const submitMemo = useCallback(async () => {
    const trimmedWallet = proofWallet.trim();
    if (!claimMessage || !memoTransaction.trim()) {
      setLocalError(
        "Create the claim code, send it as a Solana Memo, then paste the transaction signature.",
      );
      return;
    }

    setLocalError(null);
    await holder.claimProfileWithMemo({
      walletAddress: trimmedWallet,
      displayName: proofDisplayName,
      message: claimMessage,
      transactionSignature: memoTransaction,
    });
  }, [claimMessage, holder, memoTransaction, proofDisplayName, proofWallet]);

  return (
    <div className="bearified-panel-soft p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="bearified-mono text-[10px] uppercase tracking-[0.22em] text-[var(--bearified-faint)]">
            Claim without connecting
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--bearified-muted)]">
            Keep the wallet disconnected from the site and prove ownership with
            an offline signed message. Solana Memo proof can claim the public
            profile, but private rooms still need a non-public signature.
          </p>
        </div>
        <FileSignature className="h-5 w-5 shrink-0 text-[var(--bearified-accent)]" />
      </div>

      <div className="grid gap-3">
        <label className="bearified-mono text-[10px] uppercase tracking-[0.22em] text-[var(--bearified-faint)]">
          Wallet address
        </label>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            value={proofWallet}
            onChange={(event) => setProofWallet(event.target.value)}
            placeholder="Paste Solana wallet address"
            className="bearified-input bearified-mono min-w-0 px-4 py-3 text-sm"
          />
          <button
            onClick={() => setProofWallet(suggestedWallet)}
            disabled={!suggestedWallet || suggestedWallet === proofWallet}
            className="bearified-button bearified-button-secondary justify-center px-4 py-3"
          >
            <Wallet className="h-4 w-4" />
            Use checked
          </button>
        </div>

        <label className="bearified-mono text-[10px] uppercase tracking-[0.22em] text-[var(--bearified-faint)]">
          Public profile name
        </label>
        <input
          value={proofDisplayName}
          onChange={(event) => setProofDisplayName(event.target.value)}
          placeholder="Alex / Bearified Founder"
          className="bearified-input px-4 py-3 text-sm"
        />

        <button
          onClick={createMessage}
          disabled={!validWallet}
          className="bearified-button bearified-button-secondary justify-center px-4 py-3"
        >
          <KeyRound className="h-4 w-4" />
          Create one-time claim message
        </button>

        {claimMessage && (
          <div className="grid gap-3">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="bearified-mono text-[10px] uppercase tracking-[0.22em] text-[var(--bearified-faint)]">
                  Message to sign
                </span>
                <button
                  onClick={() => copyValue("message", claimMessage)}
                  className="bearified-button bearified-button-secondary px-3 py-2 text-xs"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied === "message" ? "Copied" : "Copy"}
                </button>
              </div>
              <textarea
                readOnly
                value={claimMessage}
                className="bearified-input bearified-mono min-h-40 w-full resize-y px-4 py-3 text-xs leading-5"
              />
            </div>

            <div className="grid gap-3 border border-[var(--bearified-border-muted)] bg-black/20 p-3">
              <p className="text-xs leading-5 text-[var(--bearified-muted)]">
                Best privacy path: sign the full message with the wallet in a
                wallet app or local tool, then paste the signature here. Base64,
                base58, and hex signatures are accepted.
              </p>
              <textarea
                value={signature}
                onChange={(event) => setSignature(event.target.value)}
                placeholder="Paste offline message signature"
                className="bearified-input bearified-mono min-h-24 w-full resize-y px-4 py-3 text-xs"
              />
              <button
                onClick={submitSignature}
                disabled={holder.claiming || !signature.trim()}
                className="bearified-button w-full justify-center px-4 py-3"
              >
                <BadgeCheck className="h-4 w-4" />
                Verify signature and open rooms
              </button>
            </div>

            <div className="grid gap-3 border border-[var(--bearified-border-muted)] bg-black/20 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-[var(--bearified-muted)]">
                  Memo path: send the claim code as a Solana Memo from the
                  wallet, then paste the transaction signature. This claims the
                  public profile only.
                </p>
                <button
                  onClick={() => copyValue("memo", memoCode)}
                  className="bearified-button bearified-button-secondary shrink-0 px-3 py-2 text-xs"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied === "memo" ? "Copied" : "Copy code"}
                </button>
              </div>
              <input
                value={memoTransaction}
                onChange={(event) => setMemoTransaction(event.target.value)}
                placeholder="Paste Solana Memo transaction signature"
                className="bearified-input bearified-mono px-4 py-3 text-xs"
              />
              <button
                onClick={submitMemo}
                disabled={holder.claiming || !memoTransaction.trim()}
                className="bearified-button bearified-button-secondary w-full justify-center px-4 py-3"
              >
                <Send className="h-4 w-4" />
                Verify Memo and claim profile
              </button>
            </div>
          </div>
        )}
      </div>

      {localError && (
        <p className="bearified-panel-soft mt-3 p-3 text-xs leading-5 text-red-200">
          {localError}
        </p>
      )}
    </div>
  );
}
