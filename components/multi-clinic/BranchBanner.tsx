'use client';

import { FiArrowLeft } from 'react-icons/fi';
import { useAuth } from '@/lib/auth-context';

/**
 * Di mode Cabang aktif, sidebar klinik biasa diberi nama cabang di atasnya
 * dan tombol kembali ke semua cabang (PRD Multi-Klinik, frontend).
 */
export default function BranchBanner() {
  const { branch, exitBranch } = useAuth();
  if (!branch) return null;
  return (
    <div className="branch-banner" role="status">
      <span className="branch-banner-label">Cabang aktif</span>
      <span className="branch-banner-name" title={branch.name}>
        {branch.name || `Cabang #${branch.id}`}
      </span>
      <button type="button" className="branch-banner-back" onClick={() => exitBranch()} title="Kembali ke semua cabang">
        <FiArrowLeft aria-hidden="true" />
        <span>Semua cabang</span>
      </button>
    </div>
  );
}
