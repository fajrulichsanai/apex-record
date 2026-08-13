'use client';

import { useRouter } from 'next/navigation';
import './renew-subscription-popup.css';

interface RenewSubscriptionPopupProps {
  isOpen: boolean;
  reason: 'initial' | 'mutation';
  onClose: () => void;
}

export default function RenewSubscriptionPopup({ isOpen, reason, onClose }: RenewSubscriptionPopupProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleRenew = () => {
    onClose();
    router.push('/langganan');
  };

  return (
    <>
      <div className="renew-popup-overlay" onClick={onClose} />
      <div className="renew-popup" role="dialog" aria-modal="true" aria-label="Langganan berakhir">
        <button type="button" className="renew-popup-close" onClick={onClose} aria-label="Tutup">
          &times;
        </button>
        <div className="renew-popup-icon">⏰</div>
        <h2>Langganan Klinik Telah Berakhir</h2>
        <p>
          {reason === 'mutation'
            ? 'Untuk menambah, mengubah, atau menghapus data, klinik Anda perlu memperpanjang langganan terlebih dahulu.'
            : 'Anda masih bisa melihat data seperti biasa, namun perlu memperpanjang langganan untuk menambah, mengubah, atau menghapus data.'}
        </p>
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
