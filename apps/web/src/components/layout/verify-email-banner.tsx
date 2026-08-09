'use client';

import { useState } from 'react';
import { resendVerification } from '@/lib/api';

export function VerifyEmailBanner() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleResend() {
    setSending(true);
    try {
      await resendVerification();
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-status-declared/30 bg-status-declared/10 px-6 py-2 text-sm text-status-declared">
      <span>Please confirm your email address to secure your account.</span>
      {sent ? (
        <span className="font-medium">Email sent — check your inbox.</span>
      ) : (
        <button
          onClick={handleResend}
          disabled={sending}
          className="font-semibold underline underline-offset-2 disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Resend email'}
        </button>
      )}
    </div>
  );
}
