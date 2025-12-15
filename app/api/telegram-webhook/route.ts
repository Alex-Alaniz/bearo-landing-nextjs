import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const WEBHOOK_SECRET = 'bearo-tg-secret-2024';
const TELEGRAM_BOT_TOKEN = '8435995676:AAEDCj65v2PwABxzPD-OHQRVyoZs0XXTqe8';
const THIRDWEB_SECRET_KEY = process.env.THIRDWEB_SECRET_KEY || '';
const TREASURY_WALLET = '5WYCBnCjscrxzS9uDxhi5S9f4R4qwCGnnUvDU2vUeU3s';
const BEARCO_TOKEN = 'FdFUGJSzJXDCZemQbkBwYs3tZEvixyEc8cZfRqJrpump';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEX_SUPABASE_SERVICE_KEY || ''
  );
}

async function answerCallback(id: string, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: id, text }),
  });
}

async function editMessage(chatId: string, messageId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML' }),
  });
}

async function sendTokens(to: string, amount: string): Promise<{success: boolean; error?: string}> {
  try {
    const res = await fetch('https://api.thirdweb.com/v1/solana/tokens/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-secret-key': THIRDWEB_SECRET_KEY },
      body: JSON.stringify({
        from: TREASURY_WALLET,
        to,
        amount,
        tokenAddress: BEARCO_TOKEN,
        chainId: 'solana:mainnet'
      }),
    });
    if (!res.ok) return { success: false, error: await res.text() };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');

  // Verify secret token
  if (secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const update = await req.json();
    if (!update.callback_query) return NextResponse.json({ ok: true });

    const cb = update.callback_query;
    const [action, airdropId] = cb.data.split(':');
    const chatId = cb.message.chat.id.toString();
    const msgId = cb.message.message_id;

    const supabase = getSupabase();

    const { data: airdrop } = await supabase
      .from('airdrop_queue')
      .select('*')
      .eq('id', airdropId)
      .single();

    if (!airdrop) {
      await answerCallback(cb.id, '\u274c Not found');
      return NextResponse.json({ ok: true });
    }
    if (airdrop.status !== 'pending') {
      await answerCallback(cb.id, `Already: ${airdrop.status}`);
      return NextResponse.json({ ok: true });
    }

    // Get codes for display
    const { data: refCode } = await supabase
      .from('waitlist')
      .select('referral_code')
      .eq('email', airdrop.referrer_email)
      .single();
    const { data: refeeCode } = await supabase
      .from('waitlist')
      .select('referral_code')
      .eq('email', airdrop.referee_email)
      .single();
    const amt = (parseInt(airdrop.amount) / 1_000_000).toFixed(0);

    if (action === 'approve') {
      await supabase
        .from('airdrop_queue')
        .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: 'telegram' })
        .eq('id', airdropId);

      const result = await sendTokens(airdrop.referrer_wallet, airdrop.amount);

      if (result.success) {
        await supabase
          .from('airdrop_queue')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', airdropId);
        await editMessage(chatId, msgId,
          `\u2705 <b>APPROVED & SENT</b>\n\n` +
          `<b>Referrer:</b> ${airdrop.referrer_email}\n` +
          `<b>Code:</b> <code>${refCode?.referral_code || 'N/A'}</code>\n` +
          `<b>Wallet:</b> <code>${airdrop.referrer_wallet.substring(0,12)}...</code>\n\n` +
          `<b>Referee:</b> ${airdrop.referee_email}\n` +
          `<b>Code:</b> <code>${refeeCode?.referral_code || 'N/A'}</code>\n\n` +
          `<b>Amount:</b> ${amt} $BEARCO\n\n` +
          `\ud83d\ude80 <a href="https://solscan.io/account/${airdrop.referrer_wallet}">View on Solscan</a>`
        );
        await answerCallback(cb.id, '\u2705 Sent!');
      } else {
        await supabase
          .from('airdrop_queue')
          .update({ status: 'failed', error_message: result.error })
          .eq('id', airdropId);
        await editMessage(chatId, msgId, `\u26a0\ufe0f <b>SEND FAILED</b>\n\n${result.error?.substring(0,100)}`);
        await answerCallback(cb.id, '\u26a0\ufe0f Failed');
      }
    } else if (action === 'reject') {
      await supabase
        .from('airdrop_queue')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'telegram',
          rejection_reason: 'Rejected via Telegram'
        })
        .eq('id', airdropId);
      await editMessage(chatId, msgId,
        `\u274c <b>REJECTED</b>\n\n` +
        `<b>Referrer:</b> ${airdrop.referrer_email}\n` +
        `<b>Referee:</b> ${airdrop.referee_email}\n` +
        `<b>Amount:</b> ${amt} $BEARCO`
      );
      await answerCallback(cb.id, '\u274c Rejected');
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Webhook error:', e);
    return NextResponse.json({ ok: true });
  }
}
