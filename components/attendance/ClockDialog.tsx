'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { useEscapeKey } from '@/lib/a11y';
import {
  attendanceApi,
  formatDistance,
  formatTime,
  STATUS_META,
  type ClockResult,
} from '@/lib/attendance';

type Kind = 'in' | 'out';
type Step = 'consent' | 'camera' | 'sending' | 'done';

interface Position {
  latitude: number;
  longitude: number;
  accuracy: number;
}

type LocationState =
  | { state: 'locating' }
  | { state: 'ok'; position: Position }
  | { state: 'failed'; reason: string };

const CONSENT_KEY = 'apex.attendance.consent.v1';
const MAX_SIDE = 480;

function hasConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'yes';
  } catch {
    return false;
  }
}

function saveConsent() {
  try {
    localStorage.setItem(CONSENT_KEY, 'yes');
  } catch {
    // Penyimpanan diblokir: persetujuan ditanya lagi lain kali
  }
}

function cameraErrorMessage(err: unknown): string {
  const name = (err as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Izin kamera ditolak. Buka pengaturan situs di browser (ikon gembok di bilah alamat), izinkan Kamera, lalu coba lagi.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'Kamera tidak ditemukan di perangkat ini. Gunakan HP atau perangkat yang punya kamera depan.';
  }
  if (name === 'NotReadableError') {
    return 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu, lalu coba lagi.';
  }
  return 'Kamera tidak bisa dibuka. Pastikan aplikasi dibuka lewat https dan izin kamera diberikan.';
}

function locationErrorMessage(err: GeolocationPositionError | null): string {
  if (!err) return 'Perangkat ini tidak mendukung lokasi';
  if (err.code === err.PERMISSION_DENIED) return 'Izin lokasi ditolak';
  if (err.code === err.TIMEOUT) return 'Lokasi terlalu lama didapat';
  return 'Lokasi tidak tersedia';
}

/** Foto dari video, diperkecil & dikompres supaya ringan (~50–120 KB) */
function captureFrame(video: HTMLVideoElement): Promise<Blob> {
  const scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Foto tidak bisa diambil'));
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Foto tidak bisa diambil'))), 'image/jpeg', 0.72),
  );
}

export default function ClockDialog({
  kind,
  onClose,
  onDone,
}: {
  kind: Kind;
  onClose: () => void;
  onDone: (result: ClockResult) => void;
}) {
  const [step, setStep] = useState<Step>(() => (hasConsent() ? 'camera' : 'consent'));
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [location, setLocation] = useState<LocationState>({ state: 'locating' });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClockResult | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEscapeKey(onClose, step !== 'sending');

  // Kamera & lokasi dimulai bersamaan begitu masuk layar kamera
  useEffect(() => {
    if (step !== 'camera') return;
    let cancelled = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Browser ini tidak bisa membuka kamera. Gunakan Chrome, Safari, atau Edge versi terbaru lewat https.');
    } else {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } }, audio: false })
        .then((stream) => {
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            void videoRef.current.play().catch(() => undefined);
          }
        })
        .catch((err: unknown) => !cancelled && setCameraError(cameraErrorMessage(err)));
    }

    if (!navigator.geolocation) {
      setLocation({ state: 'failed', reason: locationErrorMessage(null) });
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          !cancelled &&
          setLocation({
            state: 'ok',
            position: { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy },
          }),
        (err) => !cancelled && setLocation({ state: 'failed', reason: locationErrorMessage(err) }),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    }

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [step, stopCamera]);

  async function submit() {
    const video = videoRef.current;
    if (!video || !cameraReady) return;
    setError(null);
    let photo: Blob;
    try {
      photo = await captureFrame(video);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Foto tidak bisa diambil');
      return;
    }
    setStep('sending');
    stopCamera();
    const position = location.state === 'ok' ? location.position : null;
    try {
      const payload = { photo, ...(position ?? {}) };
      const res = kind === 'in' ? await attendanceApi.clockIn(payload) : await attendanceApi.clockOut(payload);
      setResult(res);
      setStep('done');
      onDone(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Absen gagal dikirim. Periksa koneksi internet, lalu coba lagi.');
      setCameraReady(false);
      setStep('camera');
    }
  }

  const title = kind === 'in' ? 'Absen Masuk' : 'Absen Pulang';
  const waitingLocation = location.state === 'locating';

  return (
    <div className="ab-overlay" role="dialog" aria-modal="true" aria-labelledby="ab-dialog-title">
      <div className="ab-dialog">
        <div className="ab-dialog-head">
          <h2 id="ab-dialog-title">{title}</h2>
          {step !== 'sending' && (
            <button type="button" className="ab-close" onClick={onClose} aria-label="Tutup">
              ×
            </button>
          )}
        </div>

        {step === 'consent' && (
          <div className="ab-dialog-body ab-consent">
            <p>Untuk absen, aplikasi memakai:</p>
            <ul>
              <li>
                <strong>Kamera depan</strong> untuk selfie saat absen. Foto <strong>tidak disimpan</strong>; hanya
                memastikan Anda sendiri yang absen.
              </li>
              <li>
                <strong>Lokasi</strong> untuk menghitung jarak Anda ke klinik. Yang disimpan hanya jaraknya, bukan
                titik lokasi Anda.
              </li>
              <li>
                <strong>Nama perangkat</strong> (mis. Android · Chrome) supaya owner tahu absen dilakukan dari perangkat
                mana.
              </li>
            </ul>
            <p className="ab-hint">Owner dan admin klinik bisa melihat jam, jarak, dan perangkat absen Anda.</p>
            <div className="ab-dialog-actions">
              <button type="button" className="ab-btn ghost" onClick={onClose}>
                Batal
              </button>
              <button
                type="button"
                className="ab-btn primary"
                onClick={() => {
                  saveConsent();
                  setStep('camera');
                }}
              >
                Setuju &amp; lanjutkan
              </button>
            </div>
          </div>
        )}

        {(step === 'camera' || step === 'sending') && (
          <div className="ab-dialog-body">
            {cameraError ? (
              <div className="ab-alert bad" role="alert">
                {cameraError}
              </div>
            ) : (
              <div className="ab-camera">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  onLoadedData={() => setCameraReady(true)}
                  aria-label="Pratinjau kamera depan"
                />
                {!cameraReady && <span className="ab-camera-wait">Membuka kamera…</span>}
                {step === 'sending' && <span className="ab-camera-wait">Mengirim absen…</span>}
              </div>
            )}

            <div className={`ab-locate ${location.state}`} aria-live="polite">
              {location.state === 'locating' && 'Mengambil lokasi…'}
              {location.state === 'ok' && `Lokasi didapat · akurasi ±${formatDistance(Math.round(location.position.accuracy))}`}
              {location.state === 'failed' &&
                `${location.reason}. Absen tetap bisa dikirim, dengan tanda "Lokasi tidak diketahui".`}
            </div>

            {error && (
              <div className="ab-alert bad" role="alert">
                {error}
              </div>
            )}

            <div className="ab-dialog-actions">
              <button type="button" className="ab-btn ghost" onClick={onClose} disabled={step === 'sending'}>
                Batal
              </button>
              <button
                type="button"
                className="ab-btn primary"
                onClick={submit}
                disabled={!!cameraError || !cameraReady || step === 'sending'}
              >
                {step === 'sending' ? 'Mengirim…' : waitingLocation ? 'Ambil foto & absen (tanpa menunggu lokasi)' : 'Ambil foto & absen'}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && result && <ClockResultView kind={kind} result={result} onClose={onClose} />}
      </div>
    </div>
  );
}

function ClockResultView({ kind, result, onClose }: { kind: Kind; result: ClockResult; onClose: () => void }) {
  const side = kind === 'in' ? result.day.clockIn : result.day.clockOut;
  const status = STATUS_META[result.day.status];
  const { location } = result;
  const notes: { tone: 'warn' | 'muted'; text: string }[] = [];
  if (location.status === 'outside') {
    notes.push({
      tone: 'warn',
      text: `Anda berjarak ${formatDistance(location.distanceM)} dari klinik. Absen tetap dicatat dengan tanda di luar lokasi.`,
    });
  } else if (location.status === 'inaccurate') {
    notes.push({
      tone: 'muted',
      text: `Sinyal GPS kurang akurat (±${formatDistance(location.accuracyM)}). Absen dicatat dengan tanda lokasi kurang akurat.`,
    });
  } else if (location.status === 'unknown') {
    notes.push({ tone: 'warn', text: 'Lokasi tidak bisa diambil. Absen tetap dicatat dengan tanda lokasi tidak diketahui.' });
  } else if (location.status === 'clinic_unset') {
    notes.push({ tone: 'muted', text: 'Titik lokasi klinik belum diatur owner, jadi jarak belum bisa dihitung.' });
  }
  if (result.deviceStatus === 'new') {
    notes.push({
      tone: 'warn',
      text: 'Perangkat ini belum terdaftar. Absen tetap dicatat, dan owner akan melihat tandanya.',
    });
  }

  return (
    <div className="ab-dialog-body ab-result">
      <div className="ab-result-time">{formatTime(side?.at)}</div>
      <div className="ab-result-label">
        {kind === 'in' ? 'Absen masuk tercatat' : 'Absen pulang tercatat'}
        {kind === 'in' && result.day.lateMinutes > 0 && (
          <span className="ab-pill warn">Terlambat {result.day.lateMinutes} menit</span>
        )}
        {kind === 'out' && result.day.earlyMinutes > 0 && (
          <span className="ab-pill warn">Pulang cepat {result.day.earlyMinutes} menit</span>
        )}
        {kind === 'in' && result.day.lateMinutes === 0 && <span className={`ab-pill ${status.tone}`}>{status.label}</span>}
      </div>
      {location.status === 'inside' && (
        <p className="ab-hint">Di lokasi klinik · {formatDistance(location.distanceM)} dari titik klinik</p>
      )}
      {notes.map((n) => (
        <div key={n.text} className={`ab-alert ${n.tone}`}>
          {n.text}
        </div>
      ))}
      <div className="ab-dialog-actions">
        <button type="button" className="ab-btn primary" onClick={onClose}>
          Selesai
        </button>
      </div>
    </div>
  );
}
