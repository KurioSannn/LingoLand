# Deployment & Release Guide

Dokumen ini menjelaskan cara men-deploy Lingoland (Vite SPA + Supabase) dan menjaga staging/production tidak tercampur.

## 1. Environment

| Environment | Frontend (Vercel) | Supabase project | Catatan |
|---|---|---|---|
| Local dev | `npm run dev` | project dev / kosong (mode demo) | Tanpa env → app jalan mode demo/tamu |
| Preview / Staging | Vercel Preview | project **staging** terpisah | Dipakai untuk uji migrasi + E2E manual |
| Production | Vercel Production | project **prod** | Jangan dipakai untuk automated test |

Aturan: **satu Supabase project per environment**. Jangan arahkan test otomatis ke DB produksi.

## 2. Variabel environment

Hanya dua variabel yang boleh ada di frontend (lihat `.env.example`):

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=   # anon / publishable key SAJA
```

- **Dilarang** memasang `service_role` key atau secret backend apa pun ke variabel `VITE_*` (semua `VITE_*` masuk ke bundle publik).
- Secret Edge Function (mis. `GEMINI_API_KEY` untuk `avatar-chat`) diset lewat Supabase, bukan di repo:
  ```bash
  supabase secrets set GEMINI_API_KEY=... --project-ref <ref>
  ```
- `.env` sudah di `.gitignore`. Set env di Vercel: Project → Settings → Environment Variables (pisahkan scope Preview vs Production).

## 3. Urutan migrasi database

Migrasi ada di `supabase/migrations/` dan **harus diterapkan berurutan** pada DB bersih:

| # | File | Isi |
|---|---|---|
| 0 | `20260722000000_baseline_schema.sql` | profiles, avatar, inventory, mission progress, claimed rewards |
| 1 | `20261103000001_block22_rbac_profiles_rls.sql` | `user_roles`, `is_admin`, RLS granular |
| 2 | `20261103000002_block23_lesson_progress.sql` | `lesson_progress` |
| 3 | `20261103000003_block24_economy_ledger_rpc.sql` | wallet ledger, RPC ekonomi |
| 4 | `20261103000004_block25_curriculum_question_bank.sql` | kurikulum, bank soal, attempts |
| 5 | `20261103000005_block26_server_grading_engine.sql` | grading server-side |
| 6 | `20261103000006_block27_admin_audit_cms.sql` | audit log admin, CMS |
| 7 | `20261103000007_block29_friends_social_privacy.sql` | friends, requests, blocks, privasi |
| 8 | `20261103000008_block30_multiplayer_rooms.sql` | world/room/membership |
| 9 | `20261103000009_block32_player_chat_moderation_practice.sql` | reports, mutes |

Terapkan:

```bash
supabase link --project-ref <staging-ref>
supabase db push          # staging dulu
# verifikasi smoke test (bagian 6), baru:
supabase link --project-ref <prod-ref>
supabase db push
```

### Backup & rollback

- **Sebelum** `db push` ke prod: ambil backup (Supabase Dashboard → Database → Backups, atau `supabase db dump -f backup.sql`).
- Migrasi ini **tidak otomatis reversible**. Strategi: *forward-fix* (migrasi baru yang memperbaiki) atau restore backup. Jangan edit file migrasi yang sudah diterapkan.
- Latih restore ke project staging minimal sekali sebelum rilis besar.

## 4. Edge Function

```bash
supabase functions deploy avatar-chat --project-ref <ref>
```

Pastikan `GEMINI_API_KEY` sudah diset. Tanpa secret, fungsi harus gagal aman (frontend punya fallback).

## 5. Deploy frontend (Vercel)

- Build command: `npm run build`, output: `dist`.
- `vercel.json` sudah memiliki SPA rewrite `/(.*) → /index.html`, sehingga deep-link berikut valid:
  `/app/world`, `/app/plaza`, `/app/plaza/:roomId`, `/app/friends`, `/admin`.
- CI (`.github/workflows/ci.yml`): lint → typecheck → vitest → build pada setiap push/PR ke `main`. Merge hanya jika hijau.

## 6. Smoke test pasca-deploy

1. Buka `/`, login akun test A dan B (2 browser/profil berbeda).
2. Selesaikan 1 lesson → XP/koin berubah; refresh → data tetap.
3. Beli 1 item → saldo berkurang, item ada di avatar.
4. A kirim friend request, B terima.
5. A & B masuk `/app/plaza` (setujui pedoman) → saling melihat avatar; kirim chat; keluar → avatar hilang ≤ ~8 detik.
6. Akun admin: buka `/admin` → akses diterima; akun biasa → ditolak.
7. Deep-link refresh pada `/app/plaza` dan `/admin` tidak 404.
8. Cek bundle: `grep -r "service_role" dist/` harus kosong.

## 7. Staged rollout

Internal (tim) → tester terbatas → publik. Pantau di tiap tahap: error auth, kegagalan write, anomali reward/koin, pemakaian Realtime (koneksi & pesan), jumlah laporan moderasi.

## 8. Feature flags — status jujur

Saat ini **belum ada** sistem feature flag di kode. Mekanisme penonaktifan yang tersedia:

| Fitur | Cara menonaktifkan sekarang |
|---|---|
| Plaza / chat | Hapus route `plaza` di `src/App.tsx` + redeploy (atau revert commit Blok 31–32) |
| Admin | Cabut role admin di `user_roles`; route `/admin` dilindungi `AdminRoute` |
| Seluruh backend | Hapus env `VITE_SUPABASE_*` di Vercel → app kembali ke mode demo (lihat `ROLLBACK.md`) |

Rekomendasi lanjutan: tambah flag `VITE_FEATURE_PLAZA`, `VITE_FEATURE_CHAT`, dll. (default off di prod). Ini item backlog, bukan klaim yang sudah selesai.
