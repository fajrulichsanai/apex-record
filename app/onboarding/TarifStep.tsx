'use client';

import TarifBulkForm from '@/components/tarif/TarifBulkForm';

/** Langkah onboarding "Tarif Layanan" — form tarif per kategori bidang. */
export default function TarifStep({
  existingCount,
  onBack,
  onSaved,
}: {
  existingCount: number;
  onBack: () => void;
  onSaved: (added: number) => void;
}) {
  return (
    <div className="onboarding-step-body">
      <h2>Tarif Layanan</h2>
      <p className="onboarding-step-desc">
        Pilih kategori bidang dulu, lalu isi tindakan di dalamnya. Bisa dilengkapi lagi nanti di menu Tarif.
        {existingCount > 0 && ` Saat ini sudah ada ${existingCount} tarif.`}
      </p>
      <TarifBulkForm
        cancelLabel="Kembali"
        submitLabel="Simpan & Lanjut"
        allowEmptySubmit={existingCount > 0}
        onCancel={onBack}
        onSaved={onSaved}
      />
    </div>
  );
}
