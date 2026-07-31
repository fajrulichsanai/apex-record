'use client';

import { ReservationItem } from '@/lib/reservations';
import { waLink } from '@/lib/utils/whatsapp';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function statusLabel(status: ReservationItem['status']) {
  if (status === 'pending') return 'Menunggu Konfirmasi';
  if (status === 'confirmed') return 'Terkonfirmasi';
  if (status === 'completed') return 'Selesai';
  return 'Dibatalkan';
}

function sourceLabel(source: string) {
  if (source === 'website') return 'Website';
  if (source === 'phone') return 'Telepon';
  return 'Dashboard';
}

interface ReservationCardProps {
  reservation: ReservationItem;
  busy: boolean;
  onConfirm: (id: number) => void;
  onCancel: (id: number) => void;
  onCheckIn: (r: ReservationItem) => void;
  onDelete: (id: number) => void;
  onEdit: (r: ReservationItem) => void;
}

export default function ReservationCard({
  reservation: r,
  busy,
  onConfirm,
  onCancel,
  onCheckIn,
  onDelete,
  onEdit,
}: ReservationCardProps) {
  const [, dm, dd] = r.reservationDate.slice(0, 10).split('-').map(Number);

  return (
    <div className="reservation-card">
      <div className="reservation-card-top">
        <div className="reservation-date-block">
          <div className="reservation-date-day">{dd}</div>
          <div className="reservation-date-month">{MONTHS[dm - 1]}</div>
          {r.jamSlot && <div className="reservation-time">{r.jamSlot.slice(0, 5)}</div>}
        </div>
        <div className="reservation-tags">
          <span className="reservation-source-tag">{sourceLabel(r.source)}</span>
          <span className={`reservation-status-tag ${r.status}`}>{statusLabel(r.status)}</span>
        </div>
      </div>

      <div className="reservation-card-info">
        <div className="reservation-patient-name">{r.patientName}</div>
        <div className="reservation-meta">
          {r.patientPhone && <span>{r.patientPhone}</span>}
          {r.practitioner?.name && <span>· {r.practitioner.name}</span>}
        </div>
        {r.notes && <div className="reservation-card-notes">{r.notes}</div>}
      </div>

      <div className="reservation-card-actions">
        {r.patientPhone && (
          <button
            className="btn-row-action wa"
            onClick={() => window.open(waLink(r.patientPhone), '_blank', 'noopener,noreferrer')}
            aria-label="Hubungi via WhatsApp"
            title="Hubungi via WhatsApp"
          >
            <span className="material-symbols-rounded">chat</span>
            WA
          </button>
        )}
        {(r.status === 'pending' || r.status === 'confirmed') && (
          <button
            className="btn-row-action"
            disabled={busy}
            onClick={() => onEdit(r)}
            aria-label="Ubah jadwal"
            title="Ubah jadwal"
          >
            <span className="material-symbols-rounded">event_repeat</span>
            Ubah Jadwal
          </button>
        )}
        {r.status === 'pending' && (
          <>
            <button className="btn-row-action confirm" disabled={busy} onClick={() => onConfirm(r.id)}>
              <span className="material-symbols-rounded">check</span>
              Konfirmasi
            </button>
            <button className="btn-row-action cancel" disabled={busy} onClick={() => onCancel(r.id)}>
              <span className="material-symbols-rounded">close</span>
              Tolak
            </button>
          </>
        )}
        {r.status === 'confirmed' && (
          <>
            <button
              className="btn-row-action complete"
              disabled={busy}
              onClick={() => onCheckIn(r)}
              title="Check-in pasien dan buat kunjungan"
            >
              <span className="material-symbols-rounded">task_alt</span>
              Check-in
            </button>
            <button className="btn-row-action cancel" disabled={busy} onClick={() => onCancel(r.id)}>
              <span className="material-symbols-rounded">close</span>
              Batalkan
            </button>
          </>
        )}
        <button
          className="btn-row-action delete"
          disabled={busy}
          onClick={() => onDelete(r.id)}
          aria-label="Hapus reservasi"
          title="Hapus reservasi"
        >
          <span className="material-symbols-rounded">delete</span>
        </button>
      </div>
    </div>
  );
}
