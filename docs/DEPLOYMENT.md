# Deployment & Release Guide

Dokumen ini menjelaskan cara men-deploy Lingoland (Vite SPA + Supabase) dan menjaga staging/production tidak tercampur.

## 1. Environment

| Environment | Frontend (Vercel) | Supabase project | Catatan |
|---|---|---|---|
| Local dev | `npm run dev` | project dev / kosong (mode tamu) | Tanpa env → app jalan mode tamu lokal |
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

Migrasi ada di `supabase/migrations/` dan **harus diterapkan berurutan** (atau sekaligus melalui bundel lengkap `supabase/schema.sql` di Supabase SQL Editor):

| # | File | Isi |
|---|---|---|
| 0 | `20260722000000_baseline_schema.sql` | profiles, avatar, inventory, mission progress, claimed rewards |
| 1 | `20261103000001_block22_rbac_profiles_rls.sql` | `user_roles`, `is_admin`, RLS granular |
| 2 | `20261103000002_block23_lesson_progress.sql` | `lesson_progress` |
| 3 | `20261103000003_block24_economy_ledger_rpc.sql` | wallet ledger, RPC ekonomi |
| 4 | `20261103000004_block25_curriculum_question_bank.sql` | kurikulum, bank soal, attempts |
| 5 | `20261103000005_block26_server_grading_engine.sql` | grading server-side awal |
| 6 | `20261103000006_block27_admin_audit_cms.sql` | audit log admin, CMS |
| 7 | `20261103000007_block29_friends_social_privacy.sql` | friends, requests, blocks, privasi |
| 8 | `20261103000008_block30_multiplayer_rooms.sql` | world/room/membership |
| 9 | `20261103000009_block32_player_chat_moderation_practice.sql` | reports, mutes |
| 10 | `20261103000010_fix_lesson_reward_security.sql` | cabut/hapus `complete_lesson_atomic`, perketat `grade_lesson_attempt_atomic` (0-question guard, row lock, authoritative XP return) |
| 11 | `20261103000011_fix_lesson_progress_permissions.sql` | cabut direct write RLS pada `lesson_progress`, `claimed_rewards`, `inventory_items`, `mission_progress`; validasi kepemilikan avatar |
| 12 | `20261103000012_fix_room_membership_rls.sql` | hapus rekursi RLS `room_memberships` dengan helper `SECURITY DEFINER`, kunci `world_rooms` `FOR UPDATE` saat join |
| 13 | `20261103000013_harden_mission_reward_validation.sql` | tabel `mission_objective_definitions`, RPC `verify_mission_objective_atomic`, wajib selesai objektif sebelum `claim_mission_reward_atomic` |

Terapkan via Supabase CLI:

```bash
supabase link --project-ref <staging-ref>
supabase db push          # staging dulu
# verifikasi smoke test (bagian 6), baru:
supabase link --project-ref <prod-ref>
supabase db push
```

Atau melalui **Supabase SQL Editor**:
- Jika database baru atau baru memiliki sebagian tabel, jalankan seluruh isi `supabase/schema.sql` (idempotent, mencakup migrasi `0`–`13`).
- Jika migrasi `0`–`9` sudah pernah dijalankan sebelumnya, jalankan migrasi `10`–`13` secara berurutan di SQL Editor.

### Backup & rollback

- **Sebelum** `db push` ke prod: ambil backup (Supabase Dashboard → Database → Backups, atau `supabase db dump -f backup.sql`).
- Migrasi menggunakan strategi **forward-only** (jangan menulis ulang migrasi yang sudah diterapkan di prod).

## 4. Edge Function

```bash
supabase functions deploy avatar-chat --project-ref <ref>
```

Pastikan `GEMINI_API_KEY` sudah diset. Tanpa secret, fungsi gagal aman dan frontend menggunakan respons fallback lokal.

## 5. Deploy frontend (Vercel)

- Build command: `npm run build`, output: `dist`.
- `vercel.json` sudah memiliki SPA rewrite `/(.*) → /index.html`, sehingga deep-link berikut valid:
  `/app/world`, `/app/plaza`, `/app/plaza/:roomId`, `/app/friends`, `/admin`.
- CI (`.github/workflows/ci.yml`): lint → typecheck → vitest → build pada setiap push/PR ke `main`.

## 6. Smoke test pasca-deploy (2–5 pemain nyata)

1. Buka `/`, registrasi/login akun nyata A dan B di dua browser berbeda.
2. Selesaikan 1 lesson di `/app/lessons` → skor dihitung oleh `grade_lesson_attempt_atomic`, XP bertambah satu kali; ulangi lesson yang sama → tidak ada XP ganda.
3. Selesaikan percakapan NPC di `/app/world` → objektif diverifikasi oleh `verify_mission_objective_atomic` dan klaim hadiah berhasil satu kali.
4. Beli 1 item di `/app/store` → saldo berkurang dan item dapat dipasang di `/app/avatar`.
5. A kirim friend request ke username B di `/app/friends`, B terima.
6. A & B masuk `/app/plaza` (setujui pedoman) → `join_world_room` sukses, kedua avatar saling terlihat dan bergerak secara real-time, kirim pesan chat, lalu keluar → avatar hilang ≤ ~8 detik.
7. Akun admin: buka `/admin` → tambah/ubah soal dan verifikasi soal tampil di Learning Path.
8. Cek bundle: `grep -r "service_role" dist/` harus kosong.

## 7. Staged rollout

Internal (tim) → demo 2–5 pemain → tester terbatas → publik. Pantau error auth, kegagalan RPC, dan koneksi Realtime.

## 8. Feature flags — status jujur

Saat ini **belum ada** sistem feature flag di kode. Mekanisme penonaktifan yang tersedia:

| Fitur | Cara menonaktifkan sekarang |
|---|---|
| Plaza / chat | Nonaktifkan status room di `world_rooms` (`status = 'closed'`) atau hapus route `plaza` di `src/App.tsx` |
| Admin | Cabut role admin di `user_roles`; route `/admin` dilindungi `AdminRoute` |
| Seluruh backend | Hapus env `VITE_SUPABASE_*` di Vercel → app kembali ke mode tamu lokal (lihat `ROLLBACK.md`) |
