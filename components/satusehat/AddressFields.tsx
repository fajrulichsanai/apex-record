'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { masterDataApi, type WilayahItem } from '@/lib/master-data';
import type { SatusehatAddress } from '@/lib/satusehat';

type Level = 'province' | 'city' | 'district' | 'village';

const LEVELS: { key: Level; label: string; load: (parent?: string) => Promise<WilayahItem[]> }[] = [
  { key: 'province', label: 'Provinsi', load: () => masterDataApi.getProvinces() },
  { key: 'city', label: 'Kabupaten/Kota', load: (p) => masterDataApi.getCities(p!) },
  { key: 'district', label: 'Kecamatan', load: (p) => masterDataApi.getDistricts(p!) },
  { key: 'village', label: 'Kelurahan/Desa', load: (p) => masterDataApi.getSubDistricts(p!) },
];

/** Muat satu tingkat wilayah setiap kali kode induknya berubah. */
function useWilayah(
  index: number,
  level: Level,
  parent: string | undefined,
  setOptions: Dispatch<SetStateAction<Partial<Record<Level, WilayahItem[]>>>>,
  setError: (e: string) => void,
) {
  useEffect(() => {
    let alive = true;
    if (index > 0 && !parent) {
      setOptions((o) => ({ ...o, [level]: [] }));
      return;
    }
    LEVELS[index]
      .load(parent)
      .then((items) => alive && setOptions((o) => ({ ...o, [level]: items })))
      .catch((err) => alive && setError(err instanceof Error ? err.message : 'Gagal memuat data wilayah'));
    return () => {
      alive = false;
    };
  }, [index, level, parent, setOptions, setError]);
}

const codeOf = (a: SatusehatAddress, l: Level) => a[`${l}Code`] ?? '';

/**
 * Alamat + wilayah administratif (master data wilayah SATUSEHAT). Kode
 * wilayah dikirim sebagai extension administrativeCode di Organization dan
 * Location.
 */
export function AddressFields({
  value,
  onChange,
  disabled,
}: {
  value: SatusehatAddress;
  onChange: (next: SatusehatAddress) => void;
  disabled?: boolean;
}) {
  const [options, setOptions] = useState<Partial<Record<Level, WilayahItem[]>>>({});
  const [error, setError] = useState<string | null>(null);

  const province = value.provinceCode ?? '';
  const city = value.cityCode ?? '';
  const district = value.districtCode ?? '';

  useWilayah(0, 'province', undefined, setOptions, setError);
  useWilayah(1, 'city', province, setOptions, setError);
  useWilayah(2, 'district', city, setOptions, setError);
  useWilayah(3, 'village', district, setOptions, setError);

  function pick(index: number, code: string) {
    const level = LEVELS[index].key;
    const item = options[level]?.find((o) => o.code === code);
    const next: SatusehatAddress = { ...value, [`${level}Code`]: code || null, [`${level}Name`]: item?.name ?? null };
    // Pilihan di bawahnya direset
    for (const l of LEVELS.slice(index + 1)) {
      next[`${l.key}Code`] = null;
      next[`${l.key}Name`] = null;
    }
    onChange(next);
  }

  const set = (k: keyof SatusehatAddress, v: string) => onChange({ ...value, [k]: v });

  return (
    <div className="ss-address">
      <label className="ss-span-2">
        Alamat
        <input
          className="ss-input"
          value={value.line ?? ''}
          disabled={disabled}
          maxLength={255}
          onChange={(e) => set('line', e.target.value)}
          placeholder="Nama jalan, nomor, blok"
        />
      </label>
      {LEVELS.map((l, i) => {
        const parentMissing = i > 0 && !codeOf(value, LEVELS[i - 1].key);
        return (
          <label key={l.key}>
            {l.label}
            <select
              className="ss-input"
              aria-label={l.label}
              value={codeOf(value, l.key)}
              disabled={disabled || parentMissing}
              onChange={(e) => pick(i, e.target.value)}
            >
              <option value="">{parentMissing ? `Pilih ${LEVELS[i - 1].label.toLowerCase()} dulu` : `Pilih ${l.label.toLowerCase()}`}</option>
              {/* Nilai tersimpan tetap tampil sebelum daftar selesai dimuat */}
              {codeOf(value, l.key) && !options[l.key]?.some((o) => o.code === codeOf(value, l.key)) && (
                <option value={codeOf(value, l.key)}>{value[`${l.key}Name`] ?? codeOf(value, l.key)}</option>
              )}
              {options[l.key]?.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
        );
      })}
      <label>
        RT
        <input
          className="ss-input"
          inputMode="numeric"
          maxLength={3}
          value={value.rt ?? ''}
          disabled={disabled}
          onChange={(e) => set('rt', e.target.value.replace(/\D/g, ''))}
          placeholder="mis. 1"
        />
      </label>
      <label>
        RW
        <input
          className="ss-input"
          inputMode="numeric"
          maxLength={3}
          value={value.rw ?? ''}
          disabled={disabled}
          onChange={(e) => set('rw', e.target.value.replace(/\D/g, ''))}
          placeholder="mis. 2"
        />
      </label>
      <label>
        Kode pos
        <input
          className="ss-input"
          inputMode="numeric"
          maxLength={5}
          value={value.postalCode ?? ''}
          disabled={disabled}
          onChange={(e) => set('postalCode', e.target.value.replace(/\D/g, ''))}
        />
      </label>
      {error && <div className="ss-notice warn ss-span-2">{error}</div>}
    </div>
  );
}

const ADDRESS_KEYS: (keyof SatusehatAddress)[] = [
  'line',
  'provinceCode',
  'provinceName',
  'cityCode',
  'cityName',
  'districtCode',
  'districtName',
  'villageCode',
  'villageName',
  'rt',
  'rw',
  'postalCode',
];

/** Hanya field alamat, string kosong dibuang — siap dikirim ke API. */
export function cleanAddress(a: SatusehatAddress | null | undefined): SatusehatAddress | null {
  if (!a) return null;
  const out: SatusehatAddress = {};
  for (const k of ADDRESS_KEYS) {
    const v = a[k];
    const t = typeof v === 'string' ? v.trim() : v;
    if (t) (out as Record<string, unknown>)[k] = t;
  }
  return Object.keys(out).length ? out : null;
}

/** Field alamat wajib sebelum Organization/Location dikirim. */
export function missingAddress(a: SatusehatAddress | null | undefined): string[] {
  const out: string[] = [];
  if (!a?.line?.trim()) out.push('alamat');
  if (!a?.provinceCode) out.push('provinsi');
  if (!a?.cityCode) out.push('kabupaten/kota');
  if (!a?.districtCode) out.push('kecamatan');
  if (!a?.villageCode) out.push('kelurahan/desa');
  return out;
}
