# Changelog

Format: per blok roadmap (`update.md`). Tanggal 2026-11-03 kecuali disebut lain.

## Post-Implementation Critical Security & Demo Readiness Audit (2026-11-03)

### Migrasi korektif forward-only (`000010`–`000013`) & sinkronisasi frontend
- **Phase 1 — Penghapusan bypass reward lesson (`20261103000010_fix_lesson_reward_security.sql`):**
  - Mencabut hak eksekusi dan menghapus fungsi lama `public.complete_lesson_atomic(text, integer)` yang mempercayai skor dari klien.
  - Memperkuat `public.grade_lesson_attempt_atomic(text, jsonb)` sebagai satu-satunya jalur resmi kelulusan dan pemberian XP lesson (row lock `FOR UPDATE` pada `profiles`, penolakan otomatis jika lesson memiliki 0 soal `published`, pengembalian `current_xp`, `current_level`, dan `completion_status`).
  - Menghapus pemanggilan ganda `completeLessonReward` setelah `submitLessonAttempt` pada `useDemoStorage.ts` dan `LessonPage.tsx`.
- **Phase 2 — Perlindungan `lesson_progress` & state ekonomi dari penulisan langsung klien (`20261103000011_fix_lesson_progress_permissions.sql`):**
  - Menghapus policy `INSERT`/`UPDATE`/`DELETE` langsung oleh learner pada `lesson_progress`, `claimed_rewards`, `inventory_items`, `mission_progress`, dan `lesson_attempts` (hanya `SELECT` untuk pemilik/admin; seluruh mutasi melalui RPC `SECURITY DEFINER`).
  - Memperluas trigger `protect_profile_economy_fields` ke `BEFORE INSERT OR UPDATE ON public.profiles` dan menambahkan trigger `validate_avatar_config_ownership` pada `public.avatar_configs`.
  - Merefaktor `pushRemoteState()` di `src/lib/supabaseSync.ts` agar hanya menyinkronkan metadata profil non-ekonomi (`name`, `username`, `display_name`) dan konfigurasi avatar yang tervalidasi kepemilikannya.
- **Phase 3 — Perbaikan rekursi RLS `room_memberships` & penegakan join room (`20261103000012_fix_room_membership_rls.sql`):**
  - Mengganti policy rekursif `room_memberships_select_room` dan `world_rooms_select_accessible` dengan fungsi helper `SECURITY DEFINER STABLE` (`get_my_active_room_id()`, `is_public_active_room()`).
  - Menambahkan row lock `FOR UPDATE` pada `join_world_room` untuk mencegah kondisi balapan kapasitas room.
  - Memperbaiki `useMultiplayerRoom.ts` agar memeriksa hasil `joinWorldRoom`; jika `ok === false`, klien tidak melakukan subscribe channel, tidak mengirim presence, dan tidak mem-broadcast gerakan.
  - Memperketat `isValidMovementPayload` di `protocol.ts` (validasi kecocokan `roomId`, angka finite, batas koordinat dunia `[-50, 50]`, dan nomor urut `seq >= 1`).
- **Phase 4 & 5 — Integrasi bank soal dinamis & penanganan error grading jujur:**
  - Menghubungkan `fetchCurriculumUnits` ke `curriculum_lessons`, `curriculum_questions`, dan `curriculum_question_options` tanpa membocorkan kunci jawaban dan tanpa menyuntikkan soal hardcode ketika lesson database memiliki 0 soal aktif.
  - Menghapus fallback kelulusan palsu pada blok `catch` di `LessonPage.tsx`; kegagalan RPC menampilkan status `failed` dan tombol coba kirim ulang tanpa memberikan XP palsu.
- **Phase 6 — Siklus hidup channel chat & status pengiriman (`useRoomChat.ts`):**
  - Menggunakan channel terdedikasi `room-chat:<roomId>` dengan pembersihan deterministik `supabase.removeChannel` saat pindah room atau unmount.
  - Menambahkan pelacakan status pesan (`pending` | `sent` | `failed`) dan pencocokan identitas pengirim terhadap daftar presence pemain di room.
- **Phase 7 — Verifikasi objektif misi di server (`20261103000013_harden_mission_reward_validation.sql`):**
  - Menambahkan tabel `mission_objective_definitions` dan RPC `verify_mission_objective_atomic`.
  - Memperketat `claim_mission_reward_atomic` agar menolak klaim hadiah jika seluruh objektif misi belum terverifikasi selesai di `mission_progress`.

---

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
- Pesan chat menggunakan Supabase Realtime Broadcast dengan verifikasi silang terhadap presence room di sisi klien, namun belum dipersist ke tabel database pesan.
- Tes otomatis di CI memakai mock; verifikasi RLS/RPC pada PostgreSQL nyata dan uji multi-browser Realtime dilakukan pada environment Supabase proyek (lihat `docs/QA_CHECKLIST.md`).
- Beban 20 pemain/room diuji secara sintetis di unit test, belum diuji beban jaringan nyata terhadap Supabase Realtime.
- Belum ada fitur suspend akun langsung di UI aplikasi (prosedur manual tersedia di `docs/SOP_MODERATION.md`).
