'use client';

import { useState } from 'react';

/**
 * Developer documentation for the public API. It lives only on this page
 * (behind login) by design — there is no public docs site.
 */

const PLANS = [
  { plan: 'Starter', perDay: '1.000', perMinute: '60' },
  { plan: 'Pro', perDay: '10.000', perMinute: '300' },
  { plan: 'Multi Klinik', perDay: '1.000.000', perMinute: '2.000' },
];

interface Endpoint {
  method: 'GET' | 'POST';
  path: string;
  desc: string;
  params?: { name: string; desc: string }[];
  response: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: 'GET',
    path: '/clinic',
    desc: 'Profil klinik dan jam operasional.',
    response: `{
  "id": 1, "name": "Klinik Gigi Sehat", "address": "Jl. Merdeka 10",
  "city": "Bandung", "phone": "0221234567", "logoUrl": "https://…",
  "operationalHours": { "senin": "08:00-16:00", …, "minggu": "Tutup" }
}`,
  },
  {
    method: 'GET',
    path: '/practitioners',
    desc: 'Dokter aktif: nama, spesialisasi, foto, dan jadwal praktik. jadwalPraktik = null berarti mengikuti jam klinik.',
    response: `[
  { "id": 3, "name": "drg. Anisa Putri", "specialization": "Dokter Gigi Umum",
    "photoUrl": "https://…", "jadwalPraktik": { "senin": "09:00-15:00", "selasa": "Tutup", … } }
]`,
  },
  {
    method: 'GET',
    path: '/services',
    desc: 'Layanan/tindakan aktif beserta harganya.',
    response: `[
  { "id": 2, "name": "Scaling", "kategori": "Perawatan", "deskripsi": "…", "hargaJual": 250000 }
]`,
  },
  {
    method: 'GET',
    path: '/slots',
    desc: 'Slot reservasi yang masih kosong pada tanggal tertentu.',
    params: [
      { name: 'date', desc: 'wajib, YYYY-MM-DD' },
      { name: 'practitionerId', desc: 'opsional, slot untuk dokter tertentu (mengikuti jadwalnya)' },
    ],
    response: `{ "date": "2026-10-01", "isOpen": true, "slots": ["09:00", "09:30", "10:00"] }`,
  },
  {
    method: 'POST',
    path: '/reservations',
    desc: 'Buat reservasi. Status awal "pending" sampai dikonfirmasi klinik. Simpan token untuk cek status/batal.',
    params: [
      { name: 'patientName', desc: 'wajib' },
      { name: 'patientPhone', desc: 'wajib' },
      { name: 'reservationDate', desc: 'wajib, YYYY-MM-DD' },
      { name: 'jamSlot', desc: 'opsional, HH:MM dari /slots' },
      { name: 'practitionerId', desc: 'opsional' },
      { name: 'patientNik', desc: 'opsional, 16 digit' },
      { name: 'notes', desc: 'opsional, maks. 500 karakter' },
    ],
    response: `{ "token": "8f2c…", "status": "pending", "reservationDate": "2026-10-01",
  "jamSlot": "10:00", "practitionerId": 3, "patientName": "Budi Santoso" }`,
  },
  {
    method: 'POST',
    path: '/reservations/lookup',
    desc: 'Cari reservasi aktif pasien tanpa token: nomor HP dan nama harus cocok dengan saat reservasi. Maks. 5 percobaan gagal per nomor per 15 menit.',
    params: [
      { name: 'patientPhone', desc: 'wajib; format 08…, 62…, atau +62… sama saja' },
      { name: 'patientName', desc: 'wajib; huruf besar/kecil dan tanda baca diabaikan' },
    ],
    response: `[
  { "token": "8f2c…", "status": "pending", "reservationDate": "2026-10-01",
    "jamSlot": "10:00", "patientName": "Budi Santoso", "practitionerName": "drg. Anisa Putri" }
]`,
  },
  {
    method: 'GET',
    path: '/reservations/{token}',
    desc: 'Cek status reservasi: pending, confirmed, cancelled, atau completed.',
    response: `{ "token": "8f2c…", "status": "confirmed", "reservationDate": "2026-10-01",
  "jamSlot": "10:00", "patientName": "Budi Santoso", "practitionerName": "drg. Anisa Putri" }`,
  },
  {
    method: 'POST',
    path: '/reservations/{token}/cancel',
    desc: 'Batalkan reservasi yang masih pending/confirmed.',
    response: `{ "token": "8f2c…", "status": "cancelled" }`,
  },
];

const ERRORS = [
  { status: 401, code: 'API_KEY_MISSING', desc: 'Header X-Api-Key tidak dikirim.' },
  { status: 401, code: 'API_KEY_INVALID', desc: 'Key salah, sudah dicabut, atau sudah dirotasi.' },
  { status: 403, code: 'ORIGIN_NOT_ALLOWED', desc: 'Domain website tidak terdaftar pada publishable key.' },
  { status: 403, code: 'SECRET_KEY_IN_BROWSER', desc: 'Secret key dipakai dari browser. Pakai publishable key.' },
  { status: 403, code: 'SUBSCRIPTION_INACTIVE', desc: 'Langganan klinik habis; API berhenti sementara.' },
  { status: 429, code: 'RATE_LIMITED', desc: 'Melebihi batas per menit. Tunggu lalu ulangi.' },
  { status: 429, code: 'QUOTA_EXCEEDED', desc: 'Kuota harian habis. Direset 00:00 WIB.' },
  { status: 429, code: 'LOOKUP_LIMITED', desc: 'Terlalu banyak pencarian reservasi yang gagal. Coba lagi 15 menit.' },
  { status: 404, code: 'RESERVATION_NOT_FOUND', desc: 'Tidak ada reservasi aktif dengan nomor HP + nama itu.' },
  { status: 400, code: '—', desc: 'Data tidak valid (mis. tanggal/jam salah format). Lihat error.message.' },
  { status: 404, code: '—', desc: 'Dokter/reservasi tidak ditemukan di klinik ini.' },
];

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="api-code">
      <button
        type="button"
        className="api-code-copy"
        onClick={() => {
          navigator.clipboard.writeText(code).then(
            () => setCopied(true),
            () => {},
          );
          window.setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? 'Tersalin ✓' : 'Salin'}
      </button>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function ApiDocs({
  baseUrl,
  plan,
  limitPerDay,
  limitPerMinute,
}: {
  baseUrl: string;
  plan?: string;
  limitPerDay?: number;
  limitPerMinute?: number;
}) {
  const [lang, setLang] = useState<'js' | 'curl'>('js');

  const jsExample = `const API = '${baseUrl}';
const KEY = 'apx_pk_…'; // publishable key untuk website

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: { 'X-Api-Key': KEY, 'Content-Type': 'application/json', ...options.headers },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error?.message || 'Gagal memanggil API');
  return body.data;
}

// Contoh: tampilkan dokter & slot kosong, lalu buat reservasi
const dokter = await api('/practitioners');
const { slots } = await api('/slots?date=2026-10-01&practitionerId=' + dokter[0].id);
const reservasi = await api('/reservations', {
  method: 'POST',
  body: JSON.stringify({
    patientName: 'Budi Santoso',
    patientPhone: '08123456789',
    reservationDate: '2026-10-01',
    jamSlot: slots[0],
    practitionerId: dokter[0].id,
  }),
});
console.log('Simpan token ini:', reservasi.token);`;

  const curlExample = `# Secret key — hanya dari server
curl ${baseUrl}/clinic \\
  -H "X-Api-Key: apx_sk_…"

curl "${baseUrl}/slots?date=2026-10-01" \\
  -H "X-Api-Key: apx_sk_…"

curl -X POST ${baseUrl}/reservations \\
  -H "X-Api-Key: apx_sk_…" \\
  -H "Content-Type: application/json" \\
  -d '{"patientName":"Budi Santoso","patientPhone":"08123456789","reservationDate":"2026-10-01","jamSlot":"10:00"}'`;

  return (
    <div className="panel api-docs">
      <div className="panel-header">
        <div>
          <h2>Dokumentasi</h2>
          <p className="panel-sub">Untuk tim IT atau developer website Anda.</p>
        </div>
      </div>

      <section>
        <h3>Base URL</h3>
        <CodeBlock code={baseUrl} />
        <p>
          Semua request memakai header <code>X-Api-Key: &lt;key&gt;</code> (atau <code>Authorization: Bearer &lt;key&gt;</code>). Respons
          selalu JSON: <code>{'{ "success": true, "data": … }'}</code> atau{' '}
          <code>{'{ "success": false, "error": { "code", "message" } }'}</code>. Semua data otomatis hanya milik klinik pemilik key.
        </p>
      </section>

      <section>
        <h3>Jenis key</h3>
        <ul className="api-list">
          <li>
            <strong>Publishable</strong> (<code>apx_pk_…</code>) — untuk website. Boleh ada di kode JavaScript karena hanya diterima dari
            domain yang Anda daftarkan.
          </li>
          <li>
            <strong>Secret</strong> (<code>apx_sk_…</code>) — untuk server/backend. Jangan pernah ditaruh di website atau aplikasi; request
            dari browser dengan secret key otomatis ditolak.
          </li>
        </ul>
      </section>

      <section>
        <h3>Batas pemakaian</h3>
        <div className="api-table-wrap">
          <table className="api-table compact">
            <thead>
              <tr>
                <th>Paket</th>
                <th>Request / hari (per klinik)</th>
                <th>Request / menit (per key)</th>
              </tr>
            </thead>
            <tbody>
              {PLANS.map((p) => (
                <tr key={p.plan} className={p.plan === plan ? 'current' : ''}>
                  <td>
                    {p.plan}
                    {p.plan === plan && <span className="api-badge ok">Paket Anda</span>}
                  </td>
                  <td>{p.perDay}</td>
                  <td>{p.perMinute}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Setiap respons menyertakan header <code>X-RateLimit-Limit</code>, <code>X-RateLimit-Remaining</code> (per menit),{' '}
          <code>X-Quota-Limit</code>, dan <code>X-Quota-Remaining</code> (per hari)
          {limitPerDay && limitPerMinute
            ? ` — untuk klinik ini ${limitPerMinute.toLocaleString('id-ID')}/menit dan ${limitPerDay.toLocaleString('id-ID')}/hari`
            : ''}
          . Kuota harian direset pukul 00:00 WIB. Simpan data yang jarang berubah (profil klinik, dokter, layanan) di cache website Anda
          beberapa menit agar hemat kuota.
        </p>
      </section>

      <section>
        <h3>Endpoint</h3>
        <div className="api-endpoints">
          {ENDPOINTS.map((ep) => (
            <details key={`${ep.method} ${ep.path}`} className="api-endpoint">
              <summary>
                <span className={`api-method ${ep.method.toLowerCase()}`}>{ep.method}</span>
                <code>{ep.path}</code>
                <span className="api-endpoint-desc">{ep.desc}</span>
              </summary>
              <div className="api-endpoint-body">
                {ep.params && (
                  <>
                    <h4>{ep.method === 'GET' ? 'Query' : 'Body (JSON)'}</h4>
                    <ul className="api-params">
                      {ep.params.map((p) => (
                        <li key={p.name}>
                          <code>{p.name}</code> — {p.desc}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <h4>Contoh data</h4>
                <CodeBlock code={ep.response} />
              </div>
            </details>
          ))}
        </div>
      </section>

      <section>
        <h3>Contoh kode</h3>
        <div className="api-lang-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={lang === 'js'}
            className={lang === 'js' ? 'active' : ''}
            onClick={() => setLang('js')}
          >
            JavaScript (website)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={lang === 'curl'}
            className={lang === 'curl' ? 'active' : ''}
            onClick={() => setLang('curl')}
          >
            cURL (server)
          </button>
        </div>
        <CodeBlock code={lang === 'js' ? jsExample : curlExample} />
      </section>

      <section>
        <h3>Kode error</h3>
        <div className="api-table-wrap">
          <table className="api-table compact">
            <thead>
              <tr>
                <th>HTTP</th>
                <th>error.code</th>
                <th>Arti</th>
              </tr>
            </thead>
            <tbody>
              {ERRORS.map((e) => (
                <tr key={`${e.status}-${e.code}`}>
                  <td>{e.status}</td>
                  <td>
                    <code>{e.code}</code>
                  </td>
                  <td>{e.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
