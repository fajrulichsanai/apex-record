'use client';

import { useRouter } from 'next/navigation';
import './renew-subscription-popup.css';

interface RenewSubscriptionPopupProps {
  isOpen: boolean;
  reason: 'initial' | 'mutation' | 'warning';
  daysUntilExpiry?: number | null;
  onClose: () => void;
}

export default function RenewSubscriptionPopup({ isOpen, reason, daysUntilExpiry, onClose }: RenewSubscriptionPopupProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleRenew = () => {
    onClose();
    router.push('/langganan');
  };

  const isWarning = reason === 'warning';

  const title = isWarning ? 'Langganan Akan Segera Berakhir' : 'Langganan Klinik Telah Berakhir';

  const message = isWarning
    ? `Langganan klinik Anda akan berakhir dalam ${daysUntilExpiry ?? 0} hari. Perpanjang sekarang agar tidak terganggu.`
    : reason === 'mutation'
      ? 'Untuk menambah, mengubah, atau menghapus data, klinik Anda perlu memperpanjang langganan terlebih dahulu.'
      : 'Anda masih bisa melihat data seperti biasa, namun perlu memperpanjang langganan untuk menambah, mengubah, atau menghapus data.';

  return (
    <>
      <div className="renew-popup-overlay" onClick={onClose} />
      <div className="renew-popup" role="dialog" aria-modal="true" aria-label={title}>
        <button type="button" className="renew-popup-close" onClick={onClose} aria-label="Tutup">
          &times;
        </button>
        <div className="renew-popup-icon">{isWarning ? '⏳' : '⏰'}</div>
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="renew-popup-actions">
          <button type="button" className="btn-outline" onClick={onClose}>
            Nanti Saja
          </button>
          <button type="button" className="btn-primary" onClick={handleRenew}>
            Perpanjang Sekarang
          </button>
        </div>
      </div>
    </>
  );
}
