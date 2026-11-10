'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiLink } from 'react-icons/fi';
import { useAuth } from '@/lib/auth-context';
import { clinicLinksApi, CLINIC_LINKS_CHANGED, type ClinicLinkRequest } from '@/lib/clinic-links';

/**
 * Menu "Persetujuan" for a clinic's own owner (PRD PS-01). Shown only when
 * there is something to see — most clinics are never asked — with a badge
 * while a request waits for an answer.
 */
export default function ApprovalNavItem({ pathname, onClick }: { pathname: string; onClick: () => void }) {
  const { user, branch } = useAuth();
  const [requests, setRequests] = useState<ClinicLinkRequest[] | null>(null);
  const isClinicOwner = user?.role === 'owner' && !branch;

  useEffect(() => {
    if (!isClinicOwner) return;
    let active = true;
    const load = () =>
      clinicLinksApi
        .list()
        .then((rows) => {
          if (active) setRequests(Array.isArray(rows) ? rows : []);
        })
        .catch(() => {
          /* supplementary menu — stay hidden on error */
        });
    void load();
    window.addEventListener(CLINIC_LINKS_CHANGED, load);
    return () => {
      active = false;
      window.removeEventListener(CLINIC_LINKS_CHANGED, load);
    };
  }, [isClinicOwner]);

  if (!isClinicOwner || !requests || requests.length === 0) return null;
  const pending = requests.filter((r) => r.status === 'pending').length;

  return (
    <Link
      href="/persetujuan"
      className={`nav-item ${pathname === '/persetujuan' ? 'active' : ''}`}
      onClick={onClick}
      title="Persetujuan multiklinik"
    >
      <div className="nav-item-left">
        <span className="nav-icon">
          <FiLink />
        </span>
        <span className="nav-label">Persetujuan</span>
      </div>
      {pending > 0 && (
        <span className="nav-badge" aria-label={`${pending} permintaan menunggu`}>
          {pending}
        </span>
      )}
    </Link>
  );
}
