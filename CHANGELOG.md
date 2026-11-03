# Changelog

Format: per blok roadmap (`update.md`). Tanggal 2026-11-03 kecuali disebut lain.

## Post-MVP (Blok 20–34)

### Blok 34 — Dokumentasi & release gate
- Tambah `docs/`: DEPLOYMENT, ARCHITECTURE (+ERD), QA_CHECKLIST, ADMIN_ONBOARDING, SOP_MODERATION, ROLLBACK.
- README diperbarui sesuai fitur aktual.

### Blok 33 — QA, keamanan, beban
- `src/lib/observability.ts` (audit ID, redaksi data sensitif).
- Tes: security review, alur learner E2E (level reducer/lib), load sintetis 20 klien, konkurensi.

### Blok 32 — Interaksi pemain
- Chat room (broadcast), undangan latihan duo, mute/block/report.
- Migrasi `…000009`: `moderation_reports`, `user_mutes` + RPC.

### Blok 31 — Social Plaza
- Map 3D `/app/plaza`, remote player + interpolasi, daftar room, persetujuan pedoman komunitas.

### Blok 30 — Multiplayer room backend
- `world_definitions`, `world_rooms`, `room_memberships`; protokol movement; hook realtime. Migrasi `…000008`.

### Blok 29 — Friends & privasi
- Friendships/requests/blocks, `presence_privacy`. Migrasi `…000007`.

### Blok 22–28
- RBAC & RLS, progres lesson, ledger ekonomi & RPC, bank soal, grading server, admin CMS + audit log (migrasi `…000001`–`…000006`).

## Known limitations (saat rilis dokumentasi ini)

- Belum ada feature flag di kode (lihat `docs/DEPLOYMENT.md` §8).
- Chat tidak dipersist dan pengirim tidak diverifikasi server.
- Tes otomatis memakai mock; RLS/RPC belum diuji otomatis pada DB nyata; E2E multi-akun masih manual (`docs/QA_CHECKLIST.md`).
- Beban 20 pemain/room hanya diuji sintetis, belum terhadap Supabase Realtime.
- Belum ada fitur suspend akun di aplikasi (prosedur manual di SOP).
