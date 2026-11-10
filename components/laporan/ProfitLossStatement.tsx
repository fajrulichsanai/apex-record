'use client';

import type { LabaRugi } from '@/lib/reports';
import './ProfitLossStatement.css';

const rp = (n: number) => {
  const v = Math.round(n || 0);
  const s = `Rp ${Math.abs(v).toLocaleString('id-ID')}`;
  return v < 0 ? `(${s})` : s;
};
const minus = (n: number) => (n ? `(${rp(n)})` : rp(0));

function Row({ label, value, indent, strong }: { label: string; value: string; indent?: boolean; strong?: boolean }) {
  return (
    <div className={`pl-row${indent ? ' indent' : ''}${strong ? ' strong' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/** Laba rugi ringkas — angka sama persis dengan PDF Laporan Keuangan. */
export default function ProfitLossStatement({ data }: { data: LabaRugi }) {
  return (
    <div className="panel pl-panel">
      <div className="panel-header">
        <h2>Laba Rugi</h2>
        <span className="pl-sub">Sama dengan PDF Laporan Keuangan</span>
      </div>
      <div className="pl-grid">
        <div className="pl-statement">
          <div className="pl-head">Pendapatan</div>
          <Row indent label="Pendapatan tindakan" value={rp(data.pendapatan.tindakanBruto)} />
          <Row indent label="Diskon (tindakan + tagihan)" value={minus(data.pendapatan.diskonTindakan + data.pendapatan.diskonTagihan)} />
          {data.pendapatan.biayaTambahan > 0 && <Row indent label="Biaya tambahan" value={rp(data.pendapatan.biayaTambahan)} />}
          <Row strong label="Pendapatan bersih" value={rp(data.pendapatan.bersih)} />
          <div className="pl-head">Harga pokok tindakan</div>
          <Row indent label="Modal bahan (BMHP)" value={minus(data.hpp.modalBahan)} />
          <Row indent label="Biaya lab" value={minus(data.hpp.biayaLab)} />
          <Row strong label="Laba kotor" value={rp(data.labaKotor)} />
          <div className="pl-head">Beban</div>
          <Row indent label="Share fee dokter" value={minus(data.beban.shareFeeDokter)} />
          <Row indent label="Gaji & honor" value={minus(data.beban.gaji)} />
          {data.beban.operasional.map((o) => (
            <Row key={o.kategori} indent label={o.label} value={minus(o.total)} />
          ))}
          <div className={`pl-total ${data.labaBersih < 0 ? 'neg' : ''}`}>
            <span>Laba bersih · margin {data.marginPersen}%</span>
            <span>{rp(data.labaBersih)}</span>
          </div>
        </div>
        <div className="pl-side">
          <div className="pl-head">Share fee per dokter</div>
          {data.dokter.length === 0 ? (
            <p className="pl-empty">Belum ada share fee.</p>
          ) : (
            data.dokter.map((d) => (
              <Row key={d.practitionerId} label={`${d.nama} · ${d.tindakan} tindakan`} value={rp(d.shareFee)} />
            ))
          )}
          <div className="pl-head">Arus kas</div>
          <Row label="Kas masuk" value={rp(data.kas.masuk)} />
          <Row label="Piutang pasien" value={rp(data.kas.piutang)} />
          <Row label="Belanja bahan/alat (bukan beban)" value={minus(data.belanja.total)} />
          <p className="pl-note">
            Belanja bahan tidak dihitung sebagai beban karena bahan sudah masuk modal per tindakan saat dipakai.
          </p>
        </div>
      </div>
    </div>
  );
}
