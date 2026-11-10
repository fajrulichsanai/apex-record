/**
 * Mode Cabang aktif untuk Multi-Klinik Owner (PRD Multi-Klinik MK-01).
 *
 * The chosen branch lives in two places:
 * - a plain cookie (`active_branch`, the clinic id) that the /api/backend
 *   proxy turns into the X-Clinic-Id header on every request, and that
 *   middleware.ts reads to decide whether clinic pages may open;
 * - localStorage (id + name) so the header can show the branch name.
 *
 * Neither is a security boundary: the backend checks on every request that
 * the branch is linked to this account and approved.
 */

export interface ActiveBranch {
  id: number;
  name: string;
}

export const BRANCH_COOKIE = 'active_branch';
const STORAGE_KEY = 'active_branch';

/** Routes a multi-klinik owner may open without choosing a branch first. */
const ROUTES_WITHOUT_BRANCH = [
  '/multi-klinik',
  '/tampilan',
  '/ganti-password',
  '/landingpage',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/demo',
  '/v1',
  '/files',
  '/api',
  '/kebijakan-privasi',
  '/kebijakan-refund',
  '/syarat-ketentuan',
  '/super-admin',
  '/kuitansi',
];

export function routeNeedsBranch(pathname: string): boolean {
  if (pathname === '/') return false;
  return !ROUTES_WITHOUT_BRANCH.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function readActiveBranch(): ActiveBranch | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveBranch;
    const cookieId = document.cookie
      .split('; ')
      .find((c) => c.startsWith(`${BRANCH_COOKIE}=`))
      ?.split('=')[1];
    // Both must agree — a lone half (cleared cookie, old tab) means "no branch".
    if (!parsed?.id || String(parsed.id) !== cookieId) return null;
    return { id: Number(parsed.id), name: String(parsed.name ?? '') };
  } catch {
    return null;
  }
}

export function writeActiveBranch(branch: ActiveBranch | null) {
  if (typeof window === 'undefined') return;
  try {
    if (branch) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(branch));
      document.cookie = `${BRANCH_COOKIE}=${branch.id}; path=/; max-age=86400; samesite=lax`;
    } else {
      localStorage.removeItem(STORAGE_KEY);
      document.cookie = `${BRANCH_COOKIE}=; path=/; max-age=0; samesite=lax`;
    }
  } catch {
    /* storage blocked — the cookie alone still drives the proxy */
  }
}
