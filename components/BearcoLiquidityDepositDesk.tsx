"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Droplets,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { Connection, Transaction } from "@solana/web3.js";
import {
  DEFAULT_SOLANA_RPC_URL,
  formatTokenAmount,
  isValidSolanaAddress,
} from "@/lib/bearco";

type DepositInputSide = "base" | "quote";

interface SolanaWalletProvider {
  publicKey?: { toString(): string };
  isPhantom?: boolean;
  isSolflare?: boolean;
  connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{
    publicKey: { toString(): string };
  }>;
  signAndSendTransaction?: (
    transaction: Transaction,
  ) => Promise<{ signature: string } | string>;
  signTransaction?: (transaction: Transaction) => Promise<Transaction>;
}

interface DepositQuote {
  walletAddress: string;
  poolAddress: string;
  lpMintAddress: string;
  userLpTokenAccount: string;
  inputSide: DepositInputSide;
  slippagePercent: number;
  baseAmountUi: string;
  quoteAmountUi: string;
  lpTokenAmountUi: string;
  maxBaseAmountUi: string;
  maxQuoteAmountUi: string;
  swapReference: SwapReference | null;
  swapReferenceError: string | null;
}

interface DepositBuild extends DepositQuote {
  transactionBase64: string;
  blockhash: string;
  lastValidBlockHeight: number;
}

interface SwapReference {
  source: "pumpswap-swap";
  inputSide: DepositInputSide;
  inputTokenSymbol: "$BEARCO" | "SOL";
  outputTokenSymbol: "$BEARCO" | "SOL";
  inputAmountUi: string;
  outputAmountUi: string;
  minimumOutputAmountUi: string | null;
  maximumInputAmountUi: string | null;
}

interface HolderBalanceResponse {
  balance: {
    uiAmountString: string;
  };
}

interface LpSnapshot {
  lpTokenAccount: string;
  lpTokenBalanceUi: string;
  transactionSignature: string | null;
  persisted: boolean;
  persistError: string | null;
  updatedAt: string;
}

function getProvider(): SolanaWalletProvider | null {
  if (typeof window === "undefined") return null;
  const walletWindow = window as unknown as {
    solana?: SolanaWalletProvider;
    phantom?: { solana?: SolanaWalletProvider };
    solflare?: SolanaWalletProvider;
  };

  return (
    walletWindow.phantom?.solana ||
    (walletWindow.solana?.isPhantom ? walletWindow.solana : null) ||
    walletWindow.solflare ||
    walletWindow.solana ||
    null
  );
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function getClientRpcUrl(): string {
  return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || DEFAULT_SOLANA_RPC_URL;
}

function walletLabel(wallet: string): string {
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

function formatDisplayAmount(value: string): string {
  return formatTokenAmount(value);
}

function isPositiveDecimalInput(value: string): boolean {
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return false;
  return Number(trimmed) > 0;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Request failed.");
  }
  return result as T;
}

export function BearcoLiquidityDepositDesk() {
  const [providerReady, setProviderReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [inputSide, setInputSide] = useState<DepositInputSide>("base");
  const [baseAmount, setBaseAmount] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [slippagePercent, setSlippagePercent] = useState("1");
  const [quote, setQuote] = useState<DepositQuote | null>(null);
  const [deposit, setDeposit] = useState<DepositBuild | null>(null);
  const [snapshot, setSnapshot] = useState<LpSnapshot | null>(null);
  const [holderBalance, setHolderBalance] = useState<string | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshingSnapshot, setRefreshingSnapshot] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeAmount = inputSide === "base" ? baseAmount : quoteAmount;
  const preview = deposit ?? quote;
  const canBuildDeposit =
    connected && Boolean(quote) && activeAmount.trim().length > 0;
  const depositSummary = useMemo(() => {
    if (!preview) return null;

    return [
      { label: "$BEARCO to pair", value: formatDisplayAmount(preview.baseAmountUi) },
      { label: "SOL to pair", value: formatDisplayAmount(preview.quoteAmountUi) },
      { label: "Expected LP", value: formatDisplayAmount(preview.lpTokenAmountUi) },
    ];
  }, [preview]);
  const advancedDepositSummary = useMemo(() => {
    if (!preview) return null;

    return [
      { label: "Max $BEARCO", value: formatDisplayAmount(preview.maxBaseAmountUi) },
      { label: "Max SOL", value: formatDisplayAmount(preview.maxQuoteAmountUi) },
      { label: "LP account", value: walletLabel(preview.userLpTokenAccount) },
    ];
  }, [preview]);
  const swapSummary = useMemo(() => {
    const reference = preview?.swapReference;
    if (!reference) return null;

    const rows = [
      {
        label: "Swap path",
        value: `${reference.inputTokenSymbol} -> ${reference.outputTokenSymbol}`,
      },
      {
        label: "Pump-style output",
        value: `${formatDisplayAmount(reference.outputAmountUi)} ${reference.outputTokenSymbol}`,
      },
    ];

    if (reference.minimumOutputAmountUi) {
      rows.push({
        label: "Min after slippage",
        value: `${formatDisplayAmount(reference.minimumOutputAmountUi)} ${reference.outputTokenSymbol}`,
      });
    }

    if (reference.maximumInputAmountUi) {
      rows.push({
        label: "Max input with slippage",
        value: `${formatDisplayAmount(reference.maximumInputAmountUi)} ${reference.inputTokenSymbol}`,
      });
    }

    return rows;
  }, [preview]);

  useEffect(() => {
    setProviderReady(Boolean(getProvider()));
  }, []);

  useEffect(() => {
    setDeposit(null);
  }, [activeAmount, inputSide, slippagePercent, walletAddress]);

  useEffect(() => {
    const trimmedAmount = activeAmount.trim();
    if (!trimmedAmount) {
      setQuote(null);
      setLoadingQuote(false);
      if (inputSide === "base") setQuoteAmount("");
      if (inputSide === "quote") setBaseAmount("");
      return;
    }

    if (
      !connected ||
      !isValidSolanaAddress(walletAddress) ||
      !isPositiveDecimalInput(trimmedAmount)
    ) {
      setQuote(null);
      setLoadingQuote(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setLoadingQuote(true);
    setError(null);

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/bearco/pumpswap-quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress,
            inputSide,
            amount: trimmedAmount,
            slippagePercent,
          }),
          signal: controller.signal,
        });
        const result = await readJsonResponse<DepositQuote>(response);
        if (cancelled) return;

        setQuote(result);
        if (inputSide === "base") setQuoteAmount(result.quoteAmountUi);
        if (inputSide === "quote") setBaseAmount(result.baseAmountUi);
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        setQuote(null);
        setError(err instanceof Error ? err.message : "Unable to quote deposit.");
      } finally {
        if (!cancelled) setLoadingQuote(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [
    activeAmount,
    connected,
    inputSide,
    slippagePercent,
    walletAddress,
  ]);

  const refreshLpSnapshot = useCallback(
    async (signature?: string) => {
      if (!walletAddress) return;

      setRefreshingSnapshot(true);
      setError(null);

      try {
        const response = await fetch("/api/bearco/pumpswap-lp-snapshot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress,
            transactionSignature: signature,
          }),
        });
        const result = await readJsonResponse<LpSnapshot>(response);
        setSnapshot(result);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to refresh LP balance.",
        );
      } finally {
        setRefreshingSnapshot(false);
      }
    },
    [walletAddress],
  );

  const refreshHolderBalance = useCallback(async () => {
    if (!walletAddress) return;

    setLoadingBalance(true);
    try {
      const response = await fetch(
        `/api/bearco/holder-profile?wallet=${encodeURIComponent(walletAddress)}`,
      );
      const result = await readJsonResponse<HolderBalanceResponse>(response);
      setHolderBalance(result.balance.uiAmountString);
    } catch {
      setHolderBalance(null);
    } finally {
      setLoadingBalance(false);
    }
  }, [walletAddress]);

  const connectWallet = useCallback(async () => {
    const provider = getProvider();
    if (!provider) {
      setError("No Solana wallet extension detected in this Chrome profile.");
      return;
    }

    setError(null);
    setStatus(null);

    try {
      const response = await provider.connect();
      const wallet = response.publicKey.toString();
      setWalletAddress(wallet);
      setConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet connection failed.");
    }
  }, []);

  useEffect(() => {
    if (connected && isValidSolanaAddress(walletAddress)) {
      void refreshLpSnapshot();
      void refreshHolderBalance();
    }
  }, [connected, refreshHolderBalance, refreshLpSnapshot, walletAddress]);

  const fillMaxBearco = useCallback(() => {
    if (!holderBalance || !isPositiveDecimalInput(holderBalance)) {
      void refreshHolderBalance();
      return;
    }

    setInputSide("base");
    setBaseAmount(holderBalance);
    setStatus("Max $BEARCO loaded. SOL is filling from the live LP pool ratio.");
  }, [holderBalance, refreshHolderBalance]);

  const previewDeposit = useCallback(async () => {
    if (!connected || !isValidSolanaAddress(walletAddress)) {
      setError("Connect a Solana wallet before previewing a deposit.");
      return;
    }
    if (!quote) {
      setError("Enter an amount and wait for the paired quote first.");
      return;
    }

    setLoadingQuote(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch("/api/bearco/pumpswap-deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          inputSide,
          amount: activeAmount,
          slippagePercent,
        }),
      });
      const result = await readJsonResponse<DepositBuild>(response);
      setDeposit(result);
      setStatus("Deposit transaction ready. Review both token amounts before signing.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to build deposit.",
      );
    } finally {
      setLoadingQuote(false);
    }
  }, [
    activeAmount,
    connected,
    inputSide,
    quote,
    slippagePercent,
    walletAddress,
  ]);

  const submitDeposit = useCallback(async () => {
    const provider = getProvider();
    if (!provider || !deposit) return;

    setSubmitting(true);
    setError(null);
    setStatus(null);

    try {
      const transaction = Transaction.from(
        base64ToBytes(deposit.transactionBase64),
      );
      const connection = new Connection(getClientRpcUrl(), "confirmed");
      let signature = "";

      if (provider.signAndSendTransaction) {
        const result = await provider.signAndSendTransaction(transaction);
        signature = typeof result === "string" ? result : result.signature;
      } else if (provider.signTransaction) {
        const signed = await provider.signTransaction(transaction);
        signature = await connection.sendRawTransaction(signed.serialize(), {
          skipPreflight: false,
        });
      } else {
        throw new Error("This wallet cannot sign Solana transactions.");
      }

      if (!signature) throw new Error("Wallet did not return a signature.");
      setStatus("Transaction sent. Waiting for Solana confirmation...");
      await connection.confirmTransaction(
        {
          signature,
          blockhash: deposit.blockhash,
          lastValidBlockHeight: deposit.lastValidBlockHeight,
        },
        "confirmed",
      );
      await refreshLpSnapshot(signature);
      setStatus("Deposit confirmed. LP balance snapshot refreshed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deposit failed.");
    } finally {
      setSubmitting(false);
    }
  }, [deposit, refreshLpSnapshot]);

  return (
    <section className="bearified-panel p-5 sm:p-7">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="bearified-kicker">
            Live deposit flow
          </p>
          <h2 className="bearified-display mt-3 text-5xl leading-none sm:text-6xl">
            Connect. Pair. Sign.
          </h2>
        </div>
        <div className="border border-[var(--bearified-border)] bg-[rgb(254_106_0_/_0.08)] p-3 text-[var(--bearified-accent)]">
          <Droplets className="h-6 w-6" />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <button
            onClick={connectWallet}
            className="bearified-button w-full px-5 py-4"
          >
            <Wallet className="h-5 w-5" />
            {connected ? "Wallet connected" : "Connect Solana wallet"}
          </button>

          {!providerReady && (
            <p className="bearified-panel-soft p-4 text-sm leading-6 text-[var(--bearified-muted)]">
              No injected Solana wallet was detected in this browser profile.
            </p>
          )}

          {walletAddress && (
            <MetricRow label="Wallet" value={walletLabel(walletAddress)} />
          )}

          <div className="bearified-panel-soft p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <label className="bearified-mono text-[10px] uppercase tracking-[0.22em] text-[var(--bearified-faint)]">
                You deposit
              </label>
              <button
                type="button"
                onClick={fillMaxBearco}
                disabled={!connected || loadingBalance}
                className="bearified-button bearified-button-secondary px-3 py-2 text-[10px]"
              >
                {loadingBalance ? "Loading..." : "Max"}
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <input
                value={baseAmount}
                onFocus={() => setInputSide("base")}
                onChange={(event) => {
                  setInputSide("base");
                  setBaseAmount(event.target.value);
                }}
                inputMode="decimal"
                placeholder="0.00"
                className="bearified-input bearified-mono px-4 py-3 text-sm"
              />
              <span className="bearified-mono border border-[var(--bearified-border-muted)] bg-black/20 px-4 py-3 text-xs text-white">
                $BEARCO
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--bearified-muted)]">
              Balance:{" "}
              {holderBalance
                ? `${formatDisplayAmount(holderBalance)} $BEARCO`
                : connected
                  ? "loading..."
                  : "connect wallet"}
            </p>
          </div>

          <div className="bearified-panel-soft p-4">
            <label className="bearified-mono mb-3 block text-[10px] uppercase tracking-[0.22em] text-[var(--bearified-faint)]">
              Pool pairs with
            </label>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <input
                value={quoteAmount}
                onFocus={() => setInputSide("quote")}
                onChange={(event) => {
                  setInputSide("quote");
                  setQuoteAmount(event.target.value);
                }}
                inputMode="decimal"
                placeholder="0.00"
                className="bearified-input bearified-mono px-4 py-3 text-sm"
              />
              <span className="bearified-mono border border-[var(--bearified-border-muted)] bg-black/20 px-4 py-3 text-xs text-white">
                SOL
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--bearified-muted)]">
              Edit either side. The other side fills from the live PumpSwap
              LP pool ratio.
            </p>
          </div>

          <div className="bearified-panel-soft p-4">
            <label className="bearified-mono mb-2 block text-[10px] uppercase tracking-[0.22em] text-[var(--bearified-faint)]">
              Slippage %
            </label>
            <input
              value={slippagePercent}
              onChange={(event) => setSlippagePercent(event.target.value)}
              inputMode="decimal"
              className="bearified-input bearified-mono px-4 py-3 text-sm"
            />
            <p className="mt-2 text-xs leading-5 text-[var(--bearified-muted)]">
              Deposits fail if the pool moves beyond this tolerance before the
              transaction lands.
            </p>
          </div>

          <button
            onClick={previewDeposit}
            disabled={!canBuildDeposit || loadingQuote}
            className="bearified-button bearified-button-secondary w-full px-5 py-3"
          >
            <BadgeCheck className="h-4 w-4" />
            {loadingQuote ? "Working..." : "Build deposit transaction"}
          </button>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="bearified-panel-soft flex items-start gap-3 p-4 text-sm leading-6 text-red-200">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              {error}
            </div>
          )}
          {status && (
            <p className="bearified-panel-soft p-4 text-sm leading-6 text-emerald-200">
              {status}
            </p>
          )}

          <div className="bearified-panel-soft p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="bearified-mono text-[10px] uppercase tracking-[0.22em] text-[var(--bearified-faint)]">
                Liquidity deposit quote
              </p>
              <button
                onClick={() => void refreshLpSnapshot()}
                disabled={!walletAddress || refreshingSnapshot}
                className="bearified-button bearified-button-secondary p-2"
                aria-label="Refresh LP balance"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {depositSummary ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {depositSummary.map((item) => (
                  <MetricRow
                    key={item.label}
                    label={item.label}
                    value={item.value}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-[var(--bearified-muted)]">
                Connect a wallet and preview a deposit to see the paired token
                amount, expected LP tokens, and slippage caps.
              </p>
            )}

            {preview && (
              <details className="mt-4 border-t border-[var(--bearified-border-muted)] pt-4">
                <summary className="bearified-mono cursor-pointer text-[10px] uppercase tracking-[0.22em] text-[var(--bearified-accent)]">
                  Advanced quote details
                </summary>
                <div className="mt-4 space-y-4">
                  {advancedDepositSummary && (
                    <div className="grid gap-3 sm:grid-cols-3">
                      {advancedDepositSummary.map((item) => (
                        <MetricRow
                          key={item.label}
                          label={item.label}
                          value={item.value}
                        />
                      ))}
                    </div>
                  )}

                  {(swapSummary || preview.swapReferenceError) && (
                    <div>
                      <p className="bearified-mono mb-3 text-[10px] uppercase tracking-[0.22em] text-[var(--bearified-faint)]">
                        Pump swap reference
                      </p>
                      {swapSummary ? (
                        <>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {swapSummary.map((item) => (
                              <MetricRow
                                key={item.label}
                                label={item.label}
                                value={item.value}
                              />
                            ))}
                          </div>
                          <p className="mt-3 text-xs leading-5 text-[var(--bearified-muted)]">
                            Swaps include price impact and fees. LP deposits use
                            the current pool ratio, so these numbers will not
                            match.
                          </p>
                        </>
                      ) : (
                        <p className="text-xs leading-5 text-amber-200">
                          {preview.swapReferenceError}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </details>
            )}

            <button
              onClick={submitDeposit}
              disabled={!deposit || submitting}
              className="bearified-button mt-4 w-full px-5 py-3"
            >
              <Wallet className="h-4 w-4" />
              {submitting ? "Waiting for wallet..." : "Sign and deposit"}
            </button>
          </div>

          <div className="bearified-panel-soft p-4">
            <p className="bearified-mono text-[10px] uppercase tracking-[0.22em] text-[var(--bearified-faint)]">
              LP position snapshot
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <MetricRow
                label="LP balance"
                value={
                  snapshot
                    ? formatDisplayAmount(snapshot.lpTokenBalanceUi)
                    : "Not loaded"
                }
              />
              <MetricRow
                label="Persisted"
                value={snapshot?.persisted ? "Yes" : "Pending"}
              />
              <MetricRow
                label="LP account"
                value={
                  snapshot?.lpTokenAccount
                    ? walletLabel(snapshot.lpTokenAccount)
                    : "Not loaded"
                }
              />
              <MetricRow
                label="Signature"
                value={
                  snapshot?.transactionSignature
                    ? walletLabel(snapshot.transactionSignature)
                    : "None"
                }
              />
            </div>
            {snapshot?.persistError && (
              <p className="mt-3 text-xs leading-5 text-amber-200">
                {snapshot.persistError}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--bearified-border-muted)] bg-black/20 p-3">
      <p className="bearified-mono text-[10px] uppercase tracking-[0.18em] text-[var(--bearified-faint)]">
        {label}
      </p>
      <p className="bearified-mono mt-2 break-words text-sm text-white">
        {value}
      </p>
    </div>
  );
}
