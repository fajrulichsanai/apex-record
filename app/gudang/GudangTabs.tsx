'use client';

import Link from 'next/link';

interface GudangTabsProps {
  active: 'dashboard' | 'barang' | 'transaksi';
}

export default function GudangTabs({ active }: GudangTabsProps) {
  const tabs = [
    { key: 'dashboard', label: 'Dashboard', href: '/gudang' },
    { key: 'barang', label: 'Master Barang', href: '/gudang/barang' },
    { key: 'transaksi', label: 'Transaksi Stok', href: '/gudang/transaksi' },
  ] as const;

  return (
    <div className="gudang-tabs">
      {tabs.map((tab) => (
        <Link key={tab.key} href={tab.href} className={`gudang-tab${active === tab.key ? ' active' : ''}`}>
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
