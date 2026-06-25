import "server-only";

import {
  Connection,
  PublicKey,
  Transaction,
  type Commitment,
} from "@solana/web3.js";
import {
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  buyQuoteInput,
  OnlinePumpAmmSdk,
  PUMP_AMM_SDK,
  sellBaseInput,
} from "@pump-fun/pump-swap-sdk";
import type { LiquiditySolanaState } from "@pump-fun/pump-swap-sdk";
import BN from "bn.js";
import {
  BEARCO_PUMPSWAP_LP_MINT,
  BEARCO_PUMPSWAP_POOL,
  DEFAULT_SOLANA_RPC_URL,
  isValidSolanaAddress,
} from "./bearco";
import { persistHolderLpSnapshot } from "./bearco-server";

export type BearcoDepositInputSide = "base" | "quote";

export interface BearcoPumpSwapReferenceQuote {
  source: "pumpswap-swap";
  inputSide: BearcoDepositInputSide;
  inputTokenSymbol: "$BEARCO" | "SOL";
  outputTokenSymbol: "$BEARCO" | "SOL";
  inputAmountUi: string;
  outputAmountUi: string;
  minimumOutputAmountUi: string | null;
  maximumInputAmountUi: string | null;
}

export interface BearcoPumpSwapDepositQuote {
  walletAddress: string;
  poolAddress: string;
  lpMintAddress: string;
  userLpTokenAccount: string;
  inputSide: BearcoDepositInputSide;
  slippagePercent: number;
  baseAmountAtomic: string;
  baseAmountUi: string;
  quoteAmountAtomic: string;
  quoteAmountUi: string;
  lpTokenAmountAtomic: string;
  lpTokenAmountUi: string;
  maxBaseAmountAtomic: string;
  maxBaseAmountUi: string;
  maxQuoteAmountAtomic: string;
  maxQuoteAmountUi: string;
  swapReference: BearcoPumpSwapReferenceQuote | null;
  swapReferenceError: string | null;
  updatedAt: string;
}

export interface BearcoPumpSwapDepositBuild
  extends BearcoPumpSwapDepositQuote {
  transactionBase64: string;
  blockhash: string;
  lastValidBlockHeight: number;
}

export interface BearcoLpSnapshot {
  walletAddress: string;
  lpMintAddress: string;
  lpTokenAccount: string;
  lpTokenBalanceAtomic: string;
  lpTokenBalanceUi: string;
  transactionSignature: string | null;
  persisted: boolean;
  persistError: string | null;
  updatedAt: string;
}

function getRpcUrl(): string {
  const candidates = [
    process.env.SOLANA_RPC_URLS?.split(",")[0],
    process.env.SOLANA_RPC_URL,
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    DEFAULT_SOLANA_RPC_URL,
  ];

  return candidates.map((value) => value?.trim()).find(Boolean) || DEFAULT_SOLANA_RPC_URL;
}

function getConnection(commitment: Commitment = "confirmed"): Connection {
  return new Connection(getRpcUrl(), commitment);
}

function normalizeSlippagePercent(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  if (numeric < 0.1 || numeric > 10) {
    throw new Error("Slippage must be between 0.1% and 10%.");
  }
  return numeric;
}

function parseUiAmount(value: unknown, decimals: number): BN {
  if (typeof value !== "string") throw new Error("Enter an amount.");
  const cleaned = value.trim();
  if (!/^\d+(\.\d+)?$/.test(cleaned)) {
    throw new Error("Enter a positive decimal amount.");
  }

  const [whole, fraction = ""] = cleaned.split(".");
  if (fraction.length > decimals && /[1-9]/.test(fraction.slice(decimals))) {
    throw new Error(`Amount supports at most ${decimals} decimal places.`);
  }

  const wholeAtomic =
    BigInt(whole || "0") * BigInt(10) ** BigInt(decimals);
  const fractionAtomic = BigInt((fraction.slice(0, decimals) || "").padEnd(decimals, "0") || "0");
  const atomic = wholeAtomic + fractionAtomic;
  if (atomic <= BigInt(0)) throw new Error("Enter an amount greater than zero.");

  return new BN(atomic.toString());
}

function atomicToUiAmount(amount: BN, decimals: number): string {
  if (decimals === 0) return amount.toString();

  const raw = amount.toString().padStart(decimals + 1, "0");
  const whole = raw.slice(0, -decimals) || "0";
  const fraction = raw.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

async function getMintDecimals(
  connection: Connection,
  mint: PublicKey,
): Promise<number> {
  if (mint.equals(NATIVE_MINT)) return 9;

  const account = await connection.getAccountInfo(mint, "confirmed");
  if (!account) throw new Error(`Mint ${mint.toString()} was not found.`);

  const tokenProgram = account.owner.equals(TOKEN_2022_PROGRAM_ID)
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID;
  const mintAccount = await getMint(connection, mint, "confirmed", tokenProgram);
  return mintAccount.decimals;
}

function normalizeWalletAddress(walletAddress: unknown): PublicKey {
  const wallet =
    typeof walletAddress === "string" ? walletAddress.trim() : "";
  if (!isValidSolanaAddress(wallet)) {
    throw new Error("Invalid Solana wallet address.");
  }
  return new PublicKey(wallet);
}

interface PreparedDepositQuote {
  connection: Connection;
  liquidityState: LiquiditySolanaState;
  lpToken: BN;
  quote: BearcoPumpSwapDepositQuote;
}

async function quotePumpSwapReference(input: {
  onlineSdk: OnlinePumpAmmSdk;
  poolKey: PublicKey;
  user: PublicKey;
  inputSide: BearcoDepositInputSide;
  inputAmount: BN;
  slippagePercent: number;
  baseDecimals: number;
  quoteDecimals: number;
}): Promise<BearcoPumpSwapReferenceQuote> {
  const swapState = await input.onlineSdk.swapSolanaState(
    input.poolKey,
    input.user,
  );
  const {
    baseMint,
    baseMintAccount,
    feeConfig,
    globalConfig,
    pool,
    poolBaseAmount,
    poolQuoteAmount,
  } = swapState;

  if (input.inputSide === "base") {
    const result = sellBaseInput({
      base: input.inputAmount,
      slippage: input.slippagePercent,
      baseReserve: poolBaseAmount,
      quoteReserve: poolQuoteAmount,
      globalConfig,
      baseMintAccount,
      baseMint,
      coinCreator: pool.coinCreator,
      creator: pool.creator,
      feeConfig,
    });

    return {
      source: "pumpswap-swap",
      inputSide: "base",
      inputTokenSymbol: "$BEARCO",
      outputTokenSymbol: "SOL",
      inputAmountUi: atomicToUiAmount(input.inputAmount, input.baseDecimals),
      outputAmountUi: atomicToUiAmount(result.uiQuote, input.quoteDecimals),
      minimumOutputAmountUi: atomicToUiAmount(
        result.minQuote,
        input.quoteDecimals,
      ),
      maximumInputAmountUi: null,
    };
  }

  const result = buyQuoteInput({
    quote: input.inputAmount,
    slippage: input.slippagePercent,
    baseReserve: poolBaseAmount,
    quoteReserve: poolQuoteAmount,
    globalConfig,
    baseMintAccount,
    baseMint,
    coinCreator: pool.coinCreator,
    creator: pool.creator,
    feeConfig,
  });

  return {
    source: "pumpswap-swap",
    inputSide: "quote",
    inputTokenSymbol: "SOL",
    outputTokenSymbol: "$BEARCO",
    inputAmountUi: atomicToUiAmount(input.inputAmount, input.quoteDecimals),
    outputAmountUi: atomicToUiAmount(result.base, input.baseDecimals),
    minimumOutputAmountUi: null,
    maximumInputAmountUi: atomicToUiAmount(result.maxQuote, input.quoteDecimals),
  };
}

async function prepareBearcoPumpSwapDepositQuote(input: {
  walletAddress: unknown;
  inputSide: unknown;
  amount: unknown;
  slippagePercent: unknown;
}): Promise<PreparedDepositQuote> {
  const user = normalizeWalletAddress(input.walletAddress);
  const inputSide =
    input.inputSide === "quote" ? "quote" : "base";
  const slippagePercent = normalizeSlippagePercent(input.slippagePercent);
  const connection = getConnection();
  const onlineSdk = new OnlinePumpAmmSdk(connection);
  const poolKey = new PublicKey(BEARCO_PUMPSWAP_POOL);
  const liquidityState = await onlineSdk.liquiditySolanaState(poolKey, user);
  const { baseMint, quoteMint, lpMint } = liquidityState.pool;

  const [baseDecimals, quoteDecimals, lpDecimals] = await Promise.all([
    getMintDecimals(connection, baseMint),
    getMintDecimals(connection, quoteMint),
    getMintDecimals(connection, lpMint),
  ]);

  const inputDecimals = inputSide === "quote" ? quoteDecimals : baseDecimals;
  const inputAmount = parseUiAmount(input.amount, inputDecimals);
  const depositQuote =
    inputSide === "quote"
      ? PUMP_AMM_SDK.depositQuoteInput(
          liquidityState,
          inputAmount,
          slippagePercent,
        )
      : null;
  const depositBase =
    inputSide === "base"
      ? PUMP_AMM_SDK.depositBaseInput(
          liquidityState,
          inputAmount,
          slippagePercent,
        )
      : null;
  const baseAmount = depositQuote?.base ?? inputAmount;
  const quoteAmount = depositBase?.quote ?? inputAmount;
  const lpToken = depositQuote?.lpToken ?? depositBase?.lpToken;
  const maxBase = depositQuote?.maxBase ?? depositBase?.maxBase;
  const maxQuote = depositQuote?.maxQuote ?? depositBase?.maxQuote;

  if (!lpToken || !maxBase || !maxQuote || lpToken.isZero()) {
    throw new Error("Deposit amount is too small for the current pool.");
  }

  let swapReference: BearcoPumpSwapReferenceQuote | null = null;
  let swapReferenceError: string | null = null;
  try {
    swapReference = await quotePumpSwapReference({
      onlineSdk,
      poolKey,
      user,
      inputSide,
      inputAmount,
      slippagePercent,
      baseDecimals,
      quoteDecimals,
    });
  } catch (error) {
    swapReferenceError =
      error instanceof Error
        ? error.message
        : "Pump-style swap reference is unavailable.";
  }

  return {
    connection,
    liquidityState,
    lpToken,
    quote: {
      walletAddress: user.toString(),
      poolAddress: poolKey.toString(),
      lpMintAddress: lpMint.toString(),
      userLpTokenAccount: liquidityState.userPoolTokenAccount.toString(),
      inputSide,
      slippagePercent,
      baseAmountAtomic: baseAmount.toString(),
      baseAmountUi: atomicToUiAmount(baseAmount, baseDecimals),
      quoteAmountAtomic: quoteAmount.toString(),
      quoteAmountUi: atomicToUiAmount(quoteAmount, quoteDecimals),
      lpTokenAmountAtomic: lpToken.toString(),
      lpTokenAmountUi: atomicToUiAmount(lpToken, lpDecimals),
      maxBaseAmountAtomic: maxBase.toString(),
      maxBaseAmountUi: atomicToUiAmount(maxBase, baseDecimals),
      maxQuoteAmountAtomic: maxQuote.toString(),
      maxQuoteAmountUi: atomicToUiAmount(maxQuote, quoteDecimals),
      swapReference,
      swapReferenceError,
      updatedAt: new Date().toISOString(),
    },
  };
}

export async function quoteBearcoPumpSwapDeposit(input: {
  walletAddress: unknown;
  inputSide: unknown;
  amount: unknown;
  slippagePercent: unknown;
}): Promise<BearcoPumpSwapDepositQuote> {
  const prepared = await prepareBearcoPumpSwapDepositQuote(input);
  return prepared.quote;
}

export async function buildBearcoPumpSwapDeposit(input: {
  walletAddress: unknown;
  inputSide: unknown;
  amount: unknown;
  slippagePercent: unknown;
}): Promise<BearcoPumpSwapDepositBuild> {
  const { connection, liquidityState, lpToken, quote } =
    await prepareBearcoPumpSwapDepositQuote(input);
  const instructions = await PUMP_AMM_SDK.depositInstructions(
    liquidityState,
    lpToken,
    quote.slippagePercent,
  );
  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  const transaction = new Transaction({
    feePayer: new PublicKey(quote.walletAddress),
    recentBlockhash: latestBlockhash.blockhash,
  });
  transaction.add(...instructions);

  const transactionBase64 = transaction
    .serialize({ requireAllSignatures: false, verifySignatures: false })
    .toString("base64");

  return {
    ...quote,
    transactionBase64,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  };
}

export async function refreshBearcoLpSnapshot(input: {
  walletAddress: unknown;
  transactionSignature?: unknown;
}): Promise<BearcoLpSnapshot> {
  const user = normalizeWalletAddress(input.walletAddress);
  const transactionSignature =
    typeof input.transactionSignature === "string" &&
    input.transactionSignature.trim()
      ? input.transactionSignature.trim()
      : null;
  const connection = getConnection();
  const lpMint = new PublicKey(BEARCO_PUMPSWAP_LP_MINT);
  const [lpDecimals, lpTokenAccount] = await Promise.all([
    getMintDecimals(connection, lpMint),
    Promise.resolve(
      getAssociatedTokenAddressSync(
        lpMint,
        user,
        true,
        TOKEN_2022_PROGRAM_ID,
      ),
    ),
  ]);

  let lpBalance = new BN(0);
  try {
    const account = await getAccount(
      connection,
      lpTokenAccount,
      "confirmed",
      TOKEN_2022_PROGRAM_ID,
    );
    lpBalance = new BN(account.amount.toString());
  } catch {
    lpBalance = new BN(0);
  }

  const updatedAt = new Date().toISOString();
  const snapshot = {
    walletAddress: user.toString(),
    lpMintAddress: lpMint.toString(),
    lpTokenAccount: lpTokenAccount.toString(),
    lpTokenBalanceAtomic: lpBalance.toString(),
    lpTokenBalanceUi: atomicToUiAmount(lpBalance, lpDecimals),
    transactionSignature,
    persisted: false,
    persistError: null,
    updatedAt,
  } satisfies BearcoLpSnapshot;

  const persistence = await persistHolderLpSnapshot({
    walletAddress: snapshot.walletAddress,
    lpTokenAccount: snapshot.lpTokenAccount,
    lpTokenBalanceAtomic: snapshot.lpTokenBalanceAtomic,
    lpTokenBalanceUi: snapshot.lpTokenBalanceUi,
    transactionSignature,
    updatedAt,
  });

  return {
    ...snapshot,
    persisted: persistence.persisted,
    persistError: persistence.persistError,
  };
}
