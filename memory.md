# ApexRecord — Project Memory (FE + BE)

Ringkasan struktur dan keputusan arsitektur, supaya prompt berikutnya tidak perlu re-explore codebase dari nol. Update file ini kalau ada perubahan besar pada arsitektur/RBAC/endpoint.

## Lokasi repo
- Frontend: `/Users/fajrulichsankamil/Desktop/Project/apex-record` (Next.js 16 App Router, React 19, TS strict)
- Backend: `/Users/fajrulichsankamil/Desktop/Project/Satu Sehat Integration ` (perhatikan **trailing space** di nama folder — wajib pakai quote di shell) — NestJS + TypeORM + MySQL

## Role & RBAC model (Backend)
File: `src/enums/user-role.enum.ts`

```
UserRole: SUPER_ADMIN | OWNER | ADMIN | DOKTER | PENDING
ROLE_LEVEL (lower = lebih privileged): SUPER_ADMIN=0, OWNER=1, ADMIN=2, DOKTER=3, PENDING=99
```

- **SUPER_ADMIN**: `clinic_id = null`, akses semua klinik & semua user, satu-satunya yang bisa assign role OWNER/SUPER_ADMIN, satu-satunya yang bisa `GET /clinics` (list semua klinik).
- **OWNER**: dibatasi `clinicId` sendiri (cross-clinic → 404 lewat `assertCanManage`), hanya bisa assign role di bawah levelnya (ADMIN/DOKTER), tidak bisa manage user dengan role level ≤ levelnya sendiri (OWNER lain/SUPER_ADMIN).
- Enforcement ada di `src/modules/users/users.service.ts`:
  - `assertCanManage(currentUser, targetUser)` — cross-clinic + role-level check sebelum manage user manapun.
  - `assertCanAssignRole(currentUser, newRole)` — cek role baru tidak ≥ level currentUser.
- `ClinicContextGuard` (`src/modules/auth/guards/clinic-context.guard.ts`) di-patch supaya SUPER_ADMIN (clinicId null) tetap lolos, bukan kena `NO_CLINIC_ASSIGNED`.

## Endpoint Users (`src/modules/users/`)
Semua butuh `@Roles(OWNER, SUPER_ADMIN)` kecuali disebutkan beda.

| Method | Route | Keterangan |
|---|---|---|
| GET | `/users` | Owner: klinik sendiri. SuperAdmin: semua. |
| GET | `/users/roles` | List role yang BOLEH di-assign oleh caller (dynamic, sudah exclude role ≥ level caller). |
| GET | `/users/pending/list` | Owner: klinik sendiri (bug lama sudah diperbaiki — dulu tidak filter clinicId). |
| GET | `/users/:id` | — |
| **POST** | **`/users/invite`** | Endpoint baru — create user langsung (bukan lewat self-registration/owner-code). Generate temporary password (bcrypt hash), `isActive=true`. SuperAdmin **wajib** kirim `clinicId` (kecuali role=SUPER_ADMIN). Owner tidak boleh override clinicId, otomatis pakai clinic sendiri. |
| **PATCH** | **`/users/:id`** | Endpoint baru — update name/email. |
| POST | `/users/:id/activate` | — |
| POST | `/users/:id/deactivate` | Tidak bisa deactivate OWNER/SUPER_ADMIN. |
| DELETE | `/users/:id` | Diperluas — sekarang bisa hapus user aktif (dulu cuma PENDING). Tidak bisa hapus diri sendiri. |
| PATCH | `/users/:id/role` | Untuk user PENDING → role aktif. |
| PATCH | `/users/:id/assign-role` | Untuk user aktif, ganti role. |

`GET /clinics` (baru, `ClinicsListController` di `src/modules/clinics/clinics.controller.ts`) — **SUPER_ADMIN only**, untuk dropdown pilih klinik saat invite.

## Entity
- `User` (`src/modules/users/entities/user.entity.ts`): `clinicId` nullable many-to-one ke `Clinic` (single clinic per user — **bukan** many-to-many, by design/keputusan user supaya tidak ubah arsitektur).
- `Clinic` (`src/modules/clinics/entities/clinic.entity.ts`): tidak ada reverse `@OneToMany` ke User.

## Auth flow
- Login: `POST /auth/login` di `src/modules/auth/auth.service.ts` → response `{ accessToken, user: {id,email,name,role,clinicId,practitionerId,isActive} }`.
- Self-registration pakai owner-code → role OWNER langsung aktif, atau role PENDING kalau tanpa code. Ini **flow terpisah** dari `/users/invite` (admin-direct-create) — keduanya sengaja dipertahankan.
- Seed Super Admin: `src/database/seeds/super-admin.seed.ts`, env `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD` (fallback dev only).

## Bug yang ditemukan & belum diperbaiki
- `/(kunjungan)/list-kunjungan/page.tsx` (FE) — `useSearchParams()` tanpa Suspense boundary, bikin `next build` gagal di production build. **Belum diperbaiki**, di luar scope.

## Bug yang sudah diperbaiki
- `src/database/seeds/owner-code.seed.ts` → `seedOwnerCodes()` dulu lempar `TypeError: target.split is not a function` saat `npm run seed`. Root cause: `queryRunner.createTable()` di TypeORM `^1.0.0` butuh instance `Table`, bukan plain object (kode lama pakai `as any` cast). **Fixed**: import `Table` dari `typeorm`, wrap definisi tabel dengan `new Table({...})`. Sudah diverifikasi jalan — `npm run seed` berhasil seed APEX001-005.

## Frontend wiring
- `lib/auth-context.tsx` — `AuthProvider`/`useAuth()`. Hydrate dari `localStorage` (`token`, `user`) **di dalam `useEffect`** (sengaja, bukan lazy `useState` initializer) supaya tidak ada SSR/hydration mismatch.
- `lib/api-client.ts` — wrapper `fetch` ke `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`), auto-attach `Authorization: Bearer <token>` dari localStorage, throw `ApiError` kalau `!success`.
- **Token disimpan di localStorage, bukan cookie** (keputusan user) → `middleware.ts` tetap no-op, RBAC route-guard di frontend cuma soft-guard di level komponen (`Sidebar` sembunyikan link "User Management" kalau role bukan owner/super_admin), bukan hard block di edge middleware.
- `app/page.tsx` (login) sekarang benar-benar simpan token+user lewat `login()` dan redirect ke `/dashboard` (dulu cuma TODO comment, tidak menyimpan apa pun).
- `app/user-management/page.tsx` — tab "User & Akses" sudah full terhubung ke API nyata (list/create/edit-role/activate/deactivate/delete). Tab "Tenaga Kesehatan" (SATUSEHAT search) **masih mock**, backend untuk practitioner search belum ada — jangan asumsikan itu sudah jalan.
- Pola fetch yang **dipakai nyata** di app adalah fetch langsung ke backend (`NEXT_PUBLIC_API_URL`), BUKAN lewat `app/api/*` BFF proxy routes — route-route di `app/api/auth/*` itu mock/dead code yang tidak dipanggil dari UI manapun. Kalau nambah fitur baru, ikuti pola `lib/api-client.ts` langsung ke backend, jangan bikin BFF proxy baru kecuali diminta.
- `lib/cors.ts` ada bug TypeScript yang tadinya bikin `next build` gagal total — sudah diperbaiki (return type `Record<string,string>` dengan fallback default).

## Catatan keputusan desain (jangan diulang tanya ke user)
- Single clinic per user dipertahankan (tidak bikin tabel join many-to-many) — SUPER_ADMIN = clinicId null = akses semua klinik.
- "Create user" diimplementasi sebagai direct-create (`/users/invite`) dengan temporary password di response, **bukan** lewat flow pending-activation lama (meski awalnya user pilih opsi "reuse pending flow", pada implementasi nyata yang dipakai adalah create-langsung supaya fitur "create" di UI benar-benar berfungsi).
- Middleware tetap no-op (token di localStorage, bukan cookie) — RBAC route protection di frontend hanya soft-guard di komponen, bukan di edge middleware.
