'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api-client';
import { authApi } from '@/lib/auth-api';
import { useAuth } from '@/lib/auth-context';
import { defaultRouteForRole } from '@/lib/permissions';
import { useToast } from '@/lib/toast-context';
import { Modal } from './ui';

export const IMPERSONATION_EXPIRES_KEY = 'impersonation_expires_at';

/** "Login sebagai" wajib diberi alasan (tercatat di audit log), sesi 30 menit (PRD UP-02). */
export default function LoginAsModal({
  target,
  onClose,
}: {
  target: { id: number; name: string; email: string };
  onClose: () => void;
}) {
  const router = useRouter();
  const { startImpersonation } = useAuth();
  const { success, error: showError } = useToast();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const valid = reason.trim().length >= 5;

  async function submit() {
    if (!valid) return;
    setBusy(true);
    try {
      const { user, expiresAt } = await authApi.impersonate(target.id, reason.trim());
      try {
        sessionStorage.setItem(
          IMPERSONATION_EXPIRES_KEY,
          expiresAt ?? new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        );
      } catch {
        // storage unavailable — the banner just won't show a countdown
      }
      startImpersonation(user);
      success(`Masuk sebagai ${target.name} (30 menit)`);
      router.push(defaultRouteForRole(user.role));
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal login sebagai pengguna ini');
      setBusy(false);
    }
  }

  return (
    <Modal
      title={`Login sebagai ${target.name}`}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose} disabled={busy}>
            Batal
          </button>
          <button type="button" className="btn-primary" onClick={submit} disabled={!valid || busy}>
            {busy ? 'Memproses...' : 'Login sebagai'}
          </button>
        </>
      }
    >
      <p className="text-sub">
        Anda akan melihat ApexRecord sebagai <strong>{target.email}</strong>. Sesi berakhir otomatis setelah 30 menit dan
        alasan di bawah dicatat di log aktivitas klinik.
      </p>
      <div className="sa-field">
        <label htmlFor="login-as-reason">Alasan (wajib)</label>
        <textarea
          id="login-as-reason"
          rows={3}
          maxLength={255}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="mis. Membantu owner memeriksa laporan keuangan (tiket WA 14 Okt)"
        />
      </div>
    </Modal>
  );
}
