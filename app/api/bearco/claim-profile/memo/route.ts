import { NextRequest, NextResponse } from "next/server";
import bs58 from "bs58";
import {
  Connection,
  type ParsedInstruction,
  type ParsedTransactionWithMeta,
  type PartiallyDecodedInstruction,
} from "@solana/web3.js";
import {
  BEARCO_MINT_ADDRESS,
  DEFAULT_SOLANA_RPC_URL,
  isValidSolanaAddress,
} from "@/lib/bearco";
import {
  CLAIM_MAX_AGE_MS,
  claimCode,
  claimIssuedAt,
  requestHost,
  verifyClaimMessage,
} from "@/lib/bearco-claim";
import {
  getBearcoHolderProfile,
  normalizeDisplayName,
  upsertHolderProfile,
} from "@/lib/bearco-server";

export const dynamic = "force-dynamic";

const MEMO_PROGRAM_IDS = new Set([
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
  "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo",
]);

function rpcUrl(): string {
  return (
    process.env.SOLANA_RPC_URL ||
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    DEFAULT_SOLANA_RPC_URL
  );
}

function isTransactionSignature(value: string): boolean {
  try {
    return bs58.decode(value).length === 64;
  } catch {
    return false;
  }
}

function signerIncludesWallet(
  transaction: ParsedTransactionWithMeta,
  walletAddress: string,
): boolean {
  return transaction.transaction.message.accountKeys.some((account) => {
    return account.signer && account.pubkey.toBase58() === walletAddress;
  });
}

function instructionMemo(
  instruction: ParsedInstruction | PartiallyDecodedInstruction,
): string | null {
  if (!MEMO_PROGRAM_IDS.has(instruction.programId.toBase58())) return null;

  if ("parsed" in instruction && typeof instruction.parsed === "string") {
    return instruction.parsed;
  }

  if ("data" in instruction) {
    try {
      return Buffer.from(bs58.decode(instruction.data)).toString("utf8");
    } catch {
      return null;
    }
  }

  return null;
}

function transactionIncludesClaimMemo(
  transaction: ParsedTransactionWithMeta,
  code: string,
): boolean {
  return transaction.transaction.message.instructions.some((instruction) => {
    const memo = instructionMemo(instruction);
    return Boolean(memo && memo.includes(code));
  });
}

function transactionIsFresh(transaction: ParsedTransactionWithMeta): boolean {
  if (!transaction.blockTime) return false;

  const issuedAt = transaction.blockTime * 1000;
  const ageMs = Date.now() - issuedAt;
  return ageMs >= -60_000 && ageMs <= CLAIM_MAX_AGE_MS;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const walletAddress =
    typeof body.walletAddress === "string" ? body.walletAddress.trim() : "";
  const message = typeof body.message === "string" ? body.message : "";
  const transactionSignature =
    typeof body.transactionSignature === "string"
      ? body.transactionSignature.trim()
      : "";
  const displayName = normalizeDisplayName(body.displayName);

  if (!isValidSolanaAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  if (!message || !transactionSignature) {
    return NextResponse.json(
      { error: "Missing memo claim proof" },
      { status: 400 },
    );
  }

  const code = claimCode(message);
  if (!code) {
    return NextResponse.json(
      { error: "Missing one-time claim code" },
      { status: 400 },
    );
  }

  if (!isTransactionSignature(transactionSignature)) {
    return NextResponse.json(
      { error: "Invalid Solana transaction signature" },
      { status: 400 },
    );
  }

  if (
    !verifyClaimMessage({
      host: requestHost(req.headers, req.nextUrl.host),
      walletAddress,
      displayName,
      message,
    })
  ) {
    return NextResponse.json(
      { error: "Claim message is expired or does not match this site" },
      { status: 401 },
    );
  }

  try {
    const connection = new Connection(rpcUrl(), "confirmed");
    const transaction = await connection.getParsedTransaction(
      transactionSignature,
      {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      },
    );

    if (!transaction) {
      return NextResponse.json(
        { error: "Solana memo transaction was not found yet" },
        { status: 404 },
      );
    }

    if (!transactionIsFresh(transaction)) {
      return NextResponse.json(
        { error: "Solana memo claim is expired" },
        { status: 401 },
      );
    }

    if (!signerIncludesWallet(transaction, walletAddress)) {
      return NextResponse.json(
        { error: "Memo transaction was not signed by this wallet" },
        { status: 401 },
      );
    }

    if (!transactionIncludesClaimMemo(transaction, code)) {
      return NextResponse.json(
        { error: "Memo transaction does not include the claim code" },
        { status: 401 },
      );
    }

    const holder = await getBearcoHolderProfile(walletAddress);
    const claim = await upsertHolderProfile({
      walletAddress,
      displayName,
      holderPercent: holder.holderPercent,
      tokenBalance: holder.effectiveBalance.uiAmountString,
    });

    return NextResponse.json({
      success: true,
      memoVerified: true,
      persisted: claim.persisted,
      sessionIssued: false,
      profile: claim.profile,
      holder: {
        holderPercent: holder.holderPercent,
        unlockedTiers: holder.unlockedTiers,
        highestTier: holder.highestTier,
      },
      proof: {
        issuedAt: claimIssuedAt(message),
        mintAddress: BEARCO_MINT_ADDRESS,
        transactionSignature,
      },
    });
  } catch (error) {
    const fallback =
      error instanceof Error ? error.message : "Unable to verify memo claim";
    const status = fallback.includes("rate limiting") ? 429 : 500;
    return NextResponse.json({ error: fallback }, { status });
  }
}
