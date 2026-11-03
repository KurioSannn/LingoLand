# Lingoland

Lingoland adalah aplikasi web untuk latihan speaking bahasa Inggris berbasis avatar dan dunia virtual 3D. Pengguna belajar lewat Learning Path dinamis, mengumpulkan XP/koin yang divalidasi di server, mengatur avatar, berlatih bersama NPC di **Mini Home**, dan berinteraksi secara real-time dengan pemain lain di **Social Plaza**.

Tagline: **Berani Bicara, Satu Percakapan Sekaligus.**

## Mode penggunaan

| Mode | Syarat | Perilaku |
|---|---|---|
| **Akun nyata** | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` terisi | Auth Supabase, progres/koin/teman server-authoritative di database, multiplayer realtime |
| **Tamu (Lokal)** | env kosong atau tombol *Coba Mode Tamu (Lokal)* | Progres tersimpan lokal di `localStorage` (`lingoland_app_state_v2`), terisolasi dari data server |

## Fitur

- Auth (register/login/lupa password), protected route, role admin (`/admin`).
- Learning Path & bank soal dinamis dengan grading server-authoritative (`grade_lesson_attempt_atomic`); reward XP/koin lewat ledger transaksional.
- Avatar customizer dengan validasi kepemilikan item, store, dan inventory.
- **Mini Home** (`/app/world`): ruang privat 3D, NPC interaktif, verifikasi objektif misi server-side (`verify_mission_objective_atomic`), dan speech recognition opsional.
- **Social Plaza** (`/app/plaza`): map 3D outdoor multiplayer, sinkronisasi posisi avatar real-time, daftar room dengan penegakan kapasitas server, dan papan topik harian.
- Teman: request, terima/tolak, block, privasi presence.
- Interaksi pemain: chat room dengan status pengiriman (`pending`/`sent`/`failed`), undangan latihan duo, mute/block/report.
- Admin: CMS kurikulum & bank soal + audit log.

## Belum tersedia

- Voice room / WebRTC, AI pronunciation scoring, payment gateway nyata.
- Feature flag di kode, suspend akun dari UI, persistensi riwayat chat di tabel database (lihat `CHANGELOG.md` → Known limitations).

## Menjalankan

```bash
npm install
cp .env.example .env   # isi URL & anon key Supabase; tanpa ini app berjalan dalam mode tamu lokal
npm run dev
```

Script: `dev`, `build`, `lint`, `typecheck`, `test` (vitest), `test:watch`.

Verifikasi sebelum merge/deploy:

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

CI GitHub Actions menjalankan urutan yang sama pada setiap push/PR ke `main`.

## Database (Supabase)

Migrasi berada di `supabase/migrations/` (`000000` s/d `000013`, lihat urutan lengkap di `docs/DEPLOYMENT.md`), atau dapat dijalankan sekaligus melalui bundel lengkap `supabase/schema.sql` di Supabase SQL Editor:

```bash
supabase link --project-ref <ref>
supabase db push
```

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | env, urutan migrasi 0–13, Vercel, smoke test, rollout |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | arsitektur, prinsip keamanan server-authoritative, rute, ERD, batasan |
| [docs/QA_CHECKLIST.md](docs/QA_CHECKLIST.md) | checklist rilis & verifikasi multi-user |
| [docs/ADMIN_ONBOARDING.md](docs/ADMIN_ONBOARDING.md) | role admin, CMS, laporan |
| [docs/SOP_MODERATION.md](docs/SOP_MODERATION.md) | moderasi, pemulihan akun, retensi |
| [docs/ROLLBACK.md](docs/ROLLBACK.md) | rollback, disable fitur, kembali ke mode tamu |
| [CHANGELOG.md](CHANGELOG.md) | riwayat perubahan & known limitations |
| `PRD.md`, `update.md` | produk, roadmap blok, dan laporan audit pasca-implementasi |

## Keamanan

- Hanya anon/publishable key yang boleh digunakan di frontend. **Jangan** pernah menaruh `service_role` di `VITE_*`.
- Secret Edge Function (mis. `GEMINI_API_KEY`) diset via `supabase secrets set`.
- `.env` di-ignore oleh git.

## Struktur

```text
src/
  components/ (layout, missions, navigation, three, ui, world)
  data/  hooks/  lib/ (realtime/, repositories)  pages/ (admin/)  state/
supabase/ (migrations/, schema.sql, functions/avatar-chat)
tests/unit/
docs/
```

## Browser

Gunakan browser modern dengan dukungan WebGL. Tanpa WebGL, scene menampilkan fallback secara aman.
