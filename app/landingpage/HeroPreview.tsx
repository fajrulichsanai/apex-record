'use client';

import { useState } from 'react';
import { useCountUp } from './useCountUp';

type Tone = 'ok' | 'warn' | 'info';
type TabKey = 'kunjungan' | 'transaksi' | 'laporan';

interface QueueItem { name: string; note: string; status: string; tone: Tone }
interface InvoiceItem { who: string; item: string; amt: string; status: string; tone: Tone }

const TABS: { key: TabKey; label: string }[] = [
  { key: 'kunjungan', label: 'Kunjungan' },
  { key: 'transaksi', label: 'Transaksi' },
  { key: 'laporan', label: 'Laporan Pro' },
];

const QUEUE: QueueItem[] = [
  { name: 'Sari W.', note: 'Kontrol rutin · Dr. Amelia', status: 'Menunggu', tone: 'warn' },
  { name: 'Budi H.', note: 'Scaling gigi · Dr. Rangga', status: 'Diperiksa', tone: 'info' },
  { name: 'Nadia R.', note: 'Konsultasi umum · Dr. Amelia', status: 'Selesai', tone: 'ok' },
];

const INVOICES: InvoiceItem[] = [
  { who: 'Sari W.', item: 'Konsultasi Umum', amt: 'Rp 150rb', status: 'Lunas', tone: 'ok' },
  { who: 'Budi H.', item: 'Scaling + Tindakan', amt: 'Rp 420rb', status: 'Menunggu', tone: 'warn' },
  { who: 'Fajar T.', item: 'Tambal Gigi', amt: 'Rp 275rb', status: 'Lunas', tone: 'ok' },
];

const BARS = [38, 52, 46, 64, 58, 88];
const RAIL_ICONS = ['grid', 'users', 'wallet', 'chart', 'gear'];

export default function HeroPreview() {
  const [tab, setTab] = useState<TabKey>('kunjungan');
  const revenue = useCountUp(428, true, 1000);
  const visits = useCountUp(24, true, 800);
  const retention = useCountUp(62, true, 1100);

  return (
    <div className="preview-shell">
      <div className="preview-rail">
        {RAIL_ICONS.map((icon, i) => (
          <span key={icon} className={`rail-dot ${i === 0 ? 'is-active' : ''}`} />
        ))}
      </div>

      <div className="preview-panel">
        <div className="preview-topbar">
          <span className="preview-dot" />
          <span className="preview-dot" />
          <span className="preview-dot" />
          <span className="preview-title">apexrecord.my.id</span>
        </div>

        <div className="tabs-row">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`tab-btn ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="preview-body" key={tab}>
          {tab === 'kunjungan' && (
            <>
              <div className="preview-kpis">
                <div className="preview-kpi"><div className="k">Kunjungan Hari Ini</div><div className="v">{visits}</div></div>
                <div className="preview-kpi"><div className="k">Menunggu</div><div className="v">3</div></div>
                <div className="preview-kpi"><div className="k">Rata Tunggu</div><div className="v">9m</div></div>
              </div>
              <div className="preview-table">
                {QUEUE.map((p) => (
                  <div className="preview-row" key={p.name}>
                    <span className="who">{p.name}<em>{p.note}</em></span>
                    <span className={`badge badge-${p.tone}`}>{p.status}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'transaksi' && (
            <>
              <div className="preview-kpis">
                <div className="preview-kpi"><div className="k">Pendapatan</div><div className="v">Rp {revenue}rb</div></div>
                <div className="preview-kpi"><div className="k">Tertagih</div><div className="v">Rp 300rb</div></div>
                <div className="preview-kpi"><div className="k">Belum Lunas</div><div className="v">1</div></div>
              </div>
              <div className="preview-table">
                {INVOICES.map((inv) => (
                  <div className="preview-row" key={inv.who}>
                    <span className="who">{inv.who}<em>{inv.item}</em></span>
                    <span className="amt">{inv.amt}</span>
                    <span className={`badge badge-${inv.tone}`}>{inv.status}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'laporan' && (
            <>
              <div className="preview-kpis">
                <div className="preview-kpi"><div className="k">Retensi Pasien</div><div className="v">{retention}%</div></div>
                <div className="preview-kpi"><div className="k">LTV : CAC</div><div className="v">4.1x</div></div>
                <div className="preview-kpi"><div className="k">Pasien Baru</div><div className="v">37</div></div>
              </div>
              <div className="preview-chart">
                {BARS.map((h, i) => (
                  <i key={i} style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="preview-banner">
                62% pasien lama kembali sebelum 90 hari — retensi klinik Anda di atas rata-rata industri.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
