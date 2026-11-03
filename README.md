# Lingoland

Lingoland adalah aplikasi web untuk latihan speaking bahasa Inggris berbasis avatar dan dunia virtual 3D. Pengguna belajar lewat lesson, mengumpulkan XP/koin, mengatur avatar, berlatih dengan NPC di **Mini Home**, dan bertemu pemain lain di **Social Plaza**.

Tagline: **Berani Bicara, Satu Percakapan Sekaligus.**

## Mode penggunaan

| Mode | Syarat | Perilaku |
|---|---|---|
| **Akun nyata** | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` terisi | Auth Supabase, progres/koin/teman di database, multiplayer realtime |
| **Tamu / demo** | env kosong atau tombol *Masuk sebagai Demo* | Progres di `localStorage` (`lingoland_demo_v1`), fitur sosial hanya simulasi |

## Fitur

- Auth (register/login/lupa password), protected route, role admin (`/admin`).
- Lesson & bank soal dinamis dengan grading di server; reward XP/koin lewat ledger.
- Avatar customizer, store, inventory.
- **Mini Home** (`/app/world`): ruang privat, NPC interaktif, misi, speech recognition opsional.
- **Social Plaza** (`/app/plaza`): map 3D outdoor, pemain lain secara realtime, daftar room, papan topik.
- Teman: request, terima/tolak, block, privasi presence.
- Interaksi pemain: chat room, undangan latihan duo, mute/block/report.
- Admin: CMS kurikulum + audit log.

## Belum tersedia

- Voice room / WebRTC, AI pronunciation scoring, payment gateway nyata.
- Feature flag di kode, suspend akun dari UI, persistensi chat (lihat `CHANGELOG.md` → Known limitations).

## Menjalankan

```bash
npm install
cp .env.example .env   # opsional; tanpa ini app berjalan mode demo
npm run dev
```

Script: `dev`, `build`, `lint`, `typecheck`, `test` (vitest), `test:watch`.

Verifikasi sebelum merge:

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

CI GitHub Actions menjalankan urutan yang sama pada push/PR ke `main`.

## Database

Migrasi di `supabase/migrations/` (urutan wajib, lihat `docs/DEPLOYMENT.md`):

```bash
supabase link --project-ref <ref>
supabase db push
```

Akun demo lokal: `demo@lingoland.app` / `Demo123!` (hanya simulasi lokal, bukan akun server).

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | env, migrasi, Vercel, smoke test, rollout |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | arsitektur, rute, ERD, batasan |
| [docs/QA_CHECKLIST.md](docs/QA_CHECKLIST.md) | checklist rilis/QA |
| [docs/ADMIN_ONBOARDING.md](docs/ADMIN_ONBOARDING.md) | role admin, CMS, laporan |
| [docs/SOP_MODERATION.md](docs/SOP_MODERATION.md) | moderasi, pemulihan akun, retensi |
| [docs/ROLLBACK.md](docs/ROLLBACK.md) | rollback, disable fitur, kembali ke mode demo |
| [CHANGELOG.md](CHANGELOG.md) | riwayat perubahan & known limitations |
| `PRD.md`, `update.md` | produk & roadmap blok |

## Keamanan

- Hanya anon/publishable key di frontend. **Jangan** memakai `service_role` di `VITE_*`.
- Secret Edge Function (mis. `GEMINI_API_KEY`) diset via `supabase secrets set`.
- `.env` di-ignore oleh git.

## Struktur

```text
src/
  components/ (layout, missions, navigation, three, ui, world)
  data/  hooks/  lib/ (realtime/, repositories)  pages/ (admin/)  state/
supabase/ (migrations/, functions/avatar-chat)
tests/unit/
docs/
```

## Browser

Gunakan browser modern dengan WebGL. Tanpa WebGL, scene menampilkan fallback.
