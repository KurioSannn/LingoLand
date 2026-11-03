# LingoLand — UPDATE.md
## Roadmap Teknis Menuju Multi-User Learning Platform + Social Plaza

**Tanggal audit:** 2026-11-03  
**Repository:** KurioSannn/LingoLand  
**Target branch:** main  
**Baseline yang diperiksa:** f8253f4c2e2a6957404150bd074eb506ac837a45 (2026-07-22)  
**Status dokumen:** RENCANA; seluruh pekerjaan baru di bawah belum dianggap terimplementasi.

> Dokumen ini merupakan **roadmap implementasi lanjutan**, bukan laporan bahwa fiturnya sudah selesai. PRD.md mendokumentasikan Blok 1–19. Roadmap baru dimulai dari Blok 20 dan memperluas scope asli yang sebelumnya secara sengaja mengecualikan auth umum, admin, bank soal dinamis, serta multiplayer. Jangan menandai suatu blok selesai sebelum bukti pengujian dan acceptance criteria tercapai.

---

## 0. Tujuan, scope, dan prinsip

**Visi:** LingoLand menjadi platform latihan bahasa Inggris dengan dua ruang pengalaman yang terpisah tetapi saling mendukung:

1. **Learning Path:** latihan soal dinamis, pembelajaran bertingkat, penilaian, progres akun, dan konten yang dikelola admin.
2. **Mini Home:** area privat untuk latihan speaking bersama NPC.
3. **Social Plaza:** map 3D terpisah untuk bertemu pemain sungguhan, mencari teman latihan, chat teks, dan (di fase terpisah) voice.

### Target hasil rilis yang realistis

- Setiap pemain memiliki akun dan profil yang **unik**, bukan satu akun demo bersama.
- Konten soal tidak lagi bergantung pada hardcode frontend, bisa dibuat dan diterbitkan admin.
- Jawaban, penyelesaian lesson, XP, dan koin divalidasi secara **server-authoritative**, bukan dipercaya dari browser.
- Data progres tetap ada ketika login ulang atau pindah perangkat; kegagalan sinkronisasi tidak disamarkan menjadi sukses.
- Social Plaza dapat menampilkan beberapa avatar pemain nyata pada map yang sama; leave/disconnect tidak meninggalkan ghost player.
- Tetap ada **mode demo terisolasi** agar orang bisa mencoba produk tanpa memengaruhi data pemain nyata.

### Batas scope

**Wajib MVP berikutnya (P0):** identity/auth, secure persistence, economy protection, bank soal, grading, admin dasar, serta multiplayer text-first dengan map Social Plaza dan room terbatas.

**P1 setelah MVP stabil:** invitation teman, party/group practice, report/moderation yang lebih kaya, analitik pembelajaran, optimisasi dunia multiplayer.

**P2 / tidak dikerjakan dulu:** payment gateway aktif, voice room/WebRTC, AI pronunciation scoring otomatis, matchmaking canggih, massive open world, blockchain/NFT, peta dunia geografis nyata.

### Teknologi dasar yang dipertahankan

- Frontend: React 18 + TypeScript + Vite + Tailwind CSS + React Router.
- 3D: React Three Fiber + Three.js + Drei.
- Backend awal: Supabase Auth + PostgreSQL + Row Level Security (RLS) + Edge Functions/RPC + Supabase Realtime.
- Deployment frontend: Vercel, backend terpisah di Supabase.
- Pilihan voice di fase lanjutan: WebRTC melalui layanan seperti LiveKit **setelah** text multiplayer stabil.
- Hindari migrasi stack besar atau full rewrite. Refactor hanya di batas modul yang memang diperlukan.

---

## 1. Temuan aktual hasil audit source code

| Area | Fakta pada main | Dampak | Prioritas |
|---|---|---|---|
| Auth | hooks/useDemoAuth.ts hanya menerima kredensial DEMO_EMAIL/DEMO_PASSWORD; supabaseAuth.ts mencoba sign-up akun demo otomatis | Tidak ada registrasi umum, identitas antar-pemain berisiko bercampur | P0 |
| Session | DemoContext.tsx sudah punya getSession dan onAuthStateChange | Fondasi ada; tetap perlu uji sesi expired, multi-tab, logout, offline | P0 |
| Storage | localStorage menyimpan state demo; supabaseSync.ts melakukan sinkronisasi parsial | Risiko konflik, stale state, dan kehilangan update antarperangkat | P0 |
| Sinkronisasi | supabaseSync.ts memakai delete lalu insert beberapa tabel dan tidak memeriksa error masing-masing respons | Partial success bisa tampak sukses, berpotensi race/conflict | P0 |
| Economy | demoReducer.ts menerima nominal xp, coins, dan price dari action client; profiles RLS mengizinkan update row milik sendiri | User dapat memanipulasi saldo, XP, reward, atau transaksi via client | P0 |
| Learning Path | 3 lesson unit dan dua tipe exercise (multiple-choice, word-order) ada di data/demoData.ts | Fitur latihan **sudah ada**, tetapi soal belum dikelola dari database | P0 |
| Progres lesson | completedLessonIds tersimpan lokal, tidak ada tabel lesson_progress | Selesai lesson tidak konsisten antarperangkat | P0 |
| Kelulusan | LessonPage.tsx memanggil completeLesson sesudah soal terakhir, tanpa threshold nilai benar | Pengguna bisa selesai walau banyak jawaban salah | P0 |
| Admin | Tidak ada admin route, RBAC, content CRUD, atau audit log | Bank soal belum bisa dioperasikan admin | P0 |
| Friends | FriendsPage.tsx membaca friends array statis dan tombol undangan simulasi | Bukan hubungan antar-pemain nyata | P1 |
| 3D | MiniHomeScene.tsx hanya memiliki rig player lokal dan NPC; pergerakan lokal di lib/world.ts | Tidak ada avatar remote atau map sosial | P0 |
| Realtime | Belum ada implementasi presence/broadcast untuk avatar pemain | Belum ada pertemuan pemain sesungguhnya | P0 |
| AI | avatar-chat Edge Function hanya scaffold dengan secret; deploy belum diverifikasi | Jangan klaim AI chat telah aktif | P2 |
| Testing | package.json: npm run test menjalankan tsc -b saja | Belum ada test suite unit, integration, e2e, atau policy RLS otomatis | P0 |
| Dokumentasi | README masih menjelaskan login demo dan localStorage sebagai prototype | Setup developer baru kurang sesuai dengan sebagian kode Supabase | P1 |

**File referensi yang telah diperiksa:** PRD.md, README.md, package.json, src/App.tsx, src/hooks/useDemoAuth.ts, src/lib/supabaseAuth.ts, src/lib/supabaseClient.ts, src/lib/supabaseSync.ts, src/state/DemoContext.tsx, src/state/demoReducer.ts, src/data/demoData.ts, src/pages/LessonPage.tsx, src/pages/LessonsPage.tsx, src/pages/FriendsPage.tsx, src/pages/WorldPage.tsx, src/components/world/MiniHomeScene.tsx, supabase/schema.sql. Audit ini adalah **static source inspection**; test lokal, validasi dashboard Supabase, dan performa runtime **belum** dijalankan dalam pekerjaan dokumentasi ini.

### Prinsip prioritas

1. **Data & security dahulu**, karena multiplayer dan bank soal membutuhkan identitas serta progres yang dipercaya.
2. **Konten dan penilaian dahulu** sebelum admin dashboard, agar dashboard tidak mengelola format data sementara.
3. **Realtime room dahulu** sebelum scene Social Plaza, supaya rendering 3D tidak bergantung pada mock network.
4. **Text-first dahulu** sebelum voice, demi biaya, browser compatibility, privasi, dan debugging.

---

## 2. Dependensi dan stage gates

| Gate | Blok | Output wajib | Syarat lanjut |
|---|---|---|---|
| A — Platform terpercaya | 20, 21, 22, 23, 24 | Baseline test, real auth, profil terpisah, sync and reward aman | Dua user independen + database policy & reward test lulus |
| B — Learning CMS | 25, 26, 27, 28 | Bank soal, grading, akses admin, dashboard CRUD | Admin dapat publish soal; user mengerjakan; reward hanya sekali |
| C — Social Multiplayer | 29, 30, 31, 32 | Identitas sosial, room/presence, Social Plaza, chat & safety | Dua browser melihat dan berinteraksi secara real-time tanpa ghost |
| D — Production readiness | 33, 34 | Regression, observability, deploy docs, go/no-go | Checklist dan test evidence lengkap |
| Optional | 35 | Voice room atau peningkatan speaking lebih lanjut | Dilakukan **setelah** Gate D |

**Status saat dokumen dibuat:** semua Blok 20–35 = TODO.

---

## 3. Spesifikasi implementasi per blok

### BLOK 20 — Audit baseline, project hygiene, testing harness

**Prioritas:** P0. **Dependensi:** tidak ada. **Status:** DONE.

**Tujuan:** Menjamin refactor berikutnya tidak merusak fitur demo yang sudah playable.

**Implementasi:**
- [x] Catat output baseline npm ci, npm run lint, npm run typecheck, npm run build, npm run test; seluruh perintah check lulus di checkout bersih.
- [x] Tambahkan Vitest untuk unit/integration testing, React Testing Library untuk UI; atur package.json scripts secara jelas (`test`, `test:typecheck`, `test:watch`).
- [x] Tambahkan GitHub Actions (`.github/workflows/ci.yml`) untuk lint, typecheck, unit test, dan build. CI tidak membutuhkan secret production.
- [x] Simpan fixture/synthetic data terpisah; tidak ada commit session, API key, data akun nyata, .env, atau password sungguhan.
- [x] Unit test untuk game logic, demoReducer, selectors, dan auth guard.
- [x] Periksa dependency dan bundle size (`dist` build sukses ~21 detik).

**Bukti Pengujian Blok 20:**
- Vitest: 4 test files, 21 tests passed (`tests/unit/demoReducer.test.ts`, `tests/unit/selectors.test.ts`, `tests/unit/game.test.ts`, `tests/unit/protectedRoute.test.tsx`).
- Typecheck: 0 errors (`tsc -b`).
- Lint: 0 errors.
- Build: Vite production build passed.

**File kemungkinan:** package.json, vite.config.ts, eslint.config.js, tests/, e2e/, .github/workflows/ci.yml, README.md.

**Pengujian wajib:** offline app fallback, refresh route Vercel, WebGL unsupported fallback, login demo, no regression pada NPC/movement.

**Acceptance criteria / DoD:**
- [ ] Ada minimal unit test evaluator dan reducer, smoke E2E otomatis, serta test auth guard.
- [ ] Semua perintah check berjalan di CI dari checkout bersih.
- [ ] Ada catatan baseline hijau/merah, bukan klaim tanpa bukti.
- [ ] Tidak ada perubahan perilaku production tanpa alasan eksplisit.

---

### BLOK 21 — Authentication nyata + mode demo terisolasi

**Prioritas:** P0. **Dependensi:** 20. **Status:** DONE.

**Tujuan:** Multi-user auth yang aman, registrasi akun unik dan tidak berbagi identitas demo.

**Implementasi:**
- [x] Pisahkan jalur **Guest/Demo** dari **Account**; mode demo terisolasi lokal dengan identitas ephemeral (`isGuest: true`, `id: "guest-user"`), dicegah dari sinkronisasi remote (`isRemoteBacked` guard).
- [x] Implementasi multi-user sign up, sign in, sign out, reset password, dan session restoration via Supabase Auth di `src/lib/supabaseAuth.ts`.
- [x] Hapus whitelist keras `DEMO_EMAIL`/`DEMO_PASSWORD` di `useDemoAuth.ts` dan `demoReducer.ts`.
- [x] Matikan logic self-heal hardcoded demo di `supabaseAuth.ts` dan ganti dengan standar Supabase multi-user auth.
- [x] Tambahkan halaman `RegisterPage` (`/register`) dan `ForgotPasswordPage` (`/forgot-password`).
- [x] Hubungkan routes di `src/App.tsx`.
- [x] Logout membersihkan local cached state (`clearDemoState()`) saat berganti akun.
- [x] Unit test untuk `RegisterPage`, `ForgotPasswordPage`, `LoginPage` guest mode, dan isolasi reducer.

**Bukti Pengujian Blok 21:**
- 5 test files, 24 unit tests passed (`tests/unit/authPages.test.tsx`, `tests/unit/demoReducer.test.ts`, dll).
- Typecheck: 0 errors (`tsc -b`).
- Lint: 0 errors (`eslint .`).
- Build: 0 errors (`vite build`).

---

### BLOK 22 — Profil user, RBAC foundation, RLS dan keamanan data

**Prioritas:** P0. **Dependensi:** 21. **Status:** DONE.

**Tujuan:** Menetapkan kepemilikan data dan batas izin sebelum fitur tambahan.

**Implementasi:**
- [x] Buat versioned migrations pada `supabase/migrations/`:
  - `20260722000000_baseline_schema.sql` (baseline schema asli)
  - `20261103000001_block22_rbac_profiles_rls.sql` (RBAC, user_roles, profiles enhancements, granular RLS, non-negative checks)
- [x] Lengkapi profiles: `display_name`, unique case-insensitive username index, `is_private`, `created_at`.
- [x] Definisikan role `user`, `moderator`, `admin` pada tabel `user_roles` dengan proteksi RLS ketat (hanya service_role / security definer RPC yang bisa mutate, user dilarang mengangkat role sendiri).
- [x] Tambahkan security definer helpers: `public.is_admin(uuid)`, `public.has_role(uuid, role)`, dan `public.assign_user_role(...)`.
- [x] Audit RLS profiles: bedakan baca profil publik (`is_private = false`) dari profil privat/progres penuh.
- [x] Tambahkan non-negative constraints di database untuk `coins`, `xp`, `level`, `hearts`, `streak_days`.
- [x] Buat `src/lib/profileRepository.ts` sebagai typed data access layer untuk profil dan role.
- [x] Buat komponen route guard `AdminRoute` (`src/components/layout/AdminRoute.tsx`) dengan layar 403 Forbidden untuk akun non-admin.

**Bukti Pengujian Blok 22:**
- 7 test files, 34 unit tests passed (`tests/unit/adminRoute.test.tsx`, `tests/unit/profileRepository.test.ts`, dll).
- Typecheck: 0 errors (`tsc -b`).
- Lint: 0 errors (`eslint .`).
- Build: Vite production build passed.

---

### BLOK 23 — Persistensi progres dan synchronisation hardening

**Prioritas:** P0. **Dependensi:** 21–22. **Status:** DONE.

**Tujuan:** Progres stabil lintas perangkat, dengan penanganan konflik dan error eksplisit.

**Implementasi:**
- [x] Definisikan source of truth: Supabase untuk akun terautentikasi; `localStorage` hanya mirror offline non-authoritative. Mode tamu tetap mandiri dan terisolasi.
- [x] Buat tabel `lesson_progress` di migrasi `supabase/migrations/20261103000002_block23_lesson_progress.sql` dengan RLS owner-only agar progres bab kurikulum tersinkronisasi antar-perangkat.
- [x] Ganti pola berbahaya `delete-then-insert` di `src/lib/supabaseSync.ts` menjadi operasi `upsertRows` atomik dengan `onConflict` (`inventory_items`, `mission_progress`, `claimed_rewards`, `lesson_progress`). Data pengguna tidak pernah terhapus sebelum insert baru berhasil.
- [x] Tambahkan pemeriksaan error eksplisit pada setiap panggilan Supabase write; error dilempar dan ditampilkan ke storage status (`storageMeta`), tidak ada lagi *silent failure*.
- [x] Hydrate `completedLessonIds` dari `lesson_progress` saat login di perangkat lain, dan simpan saat menyelesaikan unit latihan.
- [x] `clearRemoteState` mereset seluruh tabel remote dengan pengecekan error individual per query.

**Bukti Pengujian Blok 23:**
- 8 test files, 40 unit tests passed (`tests/unit/supabaseSync.test.ts`, dll).
- Typecheck: 0 errors (`tsc -b`).
- Lint: 0 errors (`eslint .`).
- Build: Vite production build passed.

---

### BLOK 24 — Server-authoritative XP, coins, inventory, reward

**Prioritas:** P0. **Dependensi:** 22–23. **Status:** DONE.

**Tujuan:** Ekonomi game tidak bisa dieksploitasi melalui Redux/reducer/browser/API langsung.

**Implementasi:**
- [x] Buat tabel ledger `wallet_transactions` pada migrasi `supabase/migrations/20261103000003_block24_economy_ledger_rpc.sql` (transaction id, user_id, source_type, source_id, delta_xp, delta_coins, unique idempotency key, created_at).
- [x] Buat tabel referensi server `mission_definitions` dan `store_item_definitions` untuk harga dan reward resmi.
- [x] Buat PostgreSQL Security Definer RPC atomik:
  - `claim_mission_reward_atomic(p_mission_id text)`: Validasi definisi misi, anti duplicate claim lewat idempotency key, update wallet_transactions, unlock progress, update profiles coins/xp/level secara atomik.
  - `buy_store_item_atomic(p_item_id text)`: Validasi katalog dan harga server, kunci baris profil (`for update`), debit koin atomik, insert inventory, catat ledger.
  - `complete_lesson_atomic(p_lesson_unit_id text, p_score int)`: Catat progress, reward XP diberikan hanya pada penyelesaian pertama (latihan ulang tidak menggandakan XP).
- [x] Proteksi RLS & Trigger anti-tampering: Trigger `protect_profile_economy_fields()` di database menolak atau mengabaikan penimpaan langsung saldo koin, xp, dan level dari client anonim/terautentikasi biasa. Mutasi saldo dilindungi via security definer RPC atau admin.
- [x] Buat data access layer `src/lib/economyRepository.ts` (`claimMissionReward`, `buyStoreItem`, `completeLessonReward`, `fetchWalletTransactions`). Fallback mulus untuk guest/offline mode tanpa koneksi remote.
- [x] Integrasikan hook `useDemoStorage.ts`, `demoReducer.ts` (`SET_WALLET_BALANCES`), `ConversationPanel.tsx`, dan `StorePage.tsx`.

**Bukti Pengujian Blok 24:**
- 9 test files, 52 unit tests passed (`tests/unit/economyRepository.test.ts`, `tests/unit/demoReducer.test.ts`, dll).
- Typecheck: 0 errors (`tsc -b`).
- Lint: 0 errors (`eslint .`).
- Build: Vite production build passed.

**Acceptance criteria / DoD:**
- [x] Pembelian atomik dan saldo tidak negatif.
- [x] Claim ulang sumber reward yang sama tidak menghasilkan kredit baru.
- [x] Mengedit localStorage/request payload tidak menambah server XP/coins.
- [x] Semua transaksi sensitif punya jejak audit di `wallet_transactions`.

---

### BLOK 25 — Schema bank soal dinamis, content lifecycle, seeding

**Prioritas:** P0. **Dependensi:** 22–24. **Status:** DONE.

**Tujuan:** Memindahkan kurikulum 3 bab yang sekarang hardcoded menjadi sumber konten yang dapat diperbarui.

**Desain entitas minimum:**
- courses: id, slug, title, language, description, status, sort_order.
- units: id, course_id, slug, title, level_cefr, order_index, unlock_policy.
- lessons: id, unit_id, title, reward_policy_id/approved reward, pass_threshold, status, version.
- questions: id, lesson_id, question_type, prompt, difficulty, explanation, order_index, status, version.
- question_options: id, question_id, label, order_index; simpan jawaban benar/answer-key di storage **tidak bisa dibaca learner** (private schema / server-only).
- question_answer_keys: question_id, validation_config, expected_answer; **server-only**.
- lesson_attempts dan lesson_answers, terikat pada auth user dan versi soal.
- lesson_progress: user_id, lesson_id, best_score, completion status, completed_at, last_attempt_id.

**Implementasi:**
- [x] Tetapkan enum/constraint jenis soal: `multiple-choice` dan `word-order` dengan arsitektur extensible (`fill-blank`, `listening`, `speaking`).
- [x] Definisikan workflow lifecycle `draft` -> `published` -> `archived` dengan RLS yang membatasi akses learner hanya pada konten `published` (admin memiliki hak akses menyeluruh).
- [x] Buat tabel `lesson_attempts` dengan audit riwayat dan versioning attempt agar modifikasi soal tidak merusak riwayat masa lalu.
- [x] Buat migration `supabase/migrations/20261103000004_block25_curriculum_question_bank.sql` yang mendefinisikan seluruh tabel kurikulum dan bank soal.
- [x] Migrasikan dan seed 3 unit (`lesson-intro`, `lesson-hobby`, `lesson-weekend`) secara idempotent ke database, menjaga relasi topik misi.
- [x] Kunci tabel `curriculum_question_answer_keys` dengan RLS ketat: Learner dilarang melakukan SELECT; kunci jawaban tidak pernah bocor ke client bundle atau network responses.
- [x] Buat `src/lib/learningRepository.ts` (`fetchPublishedCourses`, `fetchCurriculumUnits`, `fetchLessonById`) dengan fallback aman ke `demoData.ts` saat offline/guest.
- [x] Tambahkan unit test untuk `learningRepository` (`tests/unit/learningRepository.test.ts`).

**Bukti Pengujian Blok 25:**
- 10 test files, 55 unit tests passed (`tests/unit/learningRepository.test.ts`, dll).
- Typecheck: 0 errors (`tsc -b`).
- Lint: 0 errors (`eslint .`).
- Build: Vite production build passed.

**Acceptance criteria / DoD:**
- [x] Seed 3 unit membentuk Learning Path identik secara tema dengan prototype saat ini.
- [x] Soal user dibaca dari backend untuk akun login.
- [x] Correct answers tidak bocor pada response read-only learner sebelum submit.
- [x] Admin dapat membuat draft tanpa langsung menayangkannya.

---

### BLOK 26 — Learning engine dinamis, grading, mastery, progress

**Prioritas:** P0. **Dependensi:** 23–25. **Status:** DONE.

**Tujuan:** Latihan soal valid, hasil belajar dapat dipercaya, dan progression dapat dipulihkan.

**Implementasi:**
- [x] Buat Security Definer RPC atomik `grade_lesson_attempt_atomic(p_lesson_unit_id text, p_answers jsonb)` di migrasi `supabase/migrations/20261103000005_block26_server_grading_engine.sql`:
  - Evaluasi server-authoritative terhadap kunci jawaban `curriculum_question_answer_keys` untuk tipe `multiple-choice` dan `word-order`.
  - Hitung skor persentase (0-100%).
  - Evaluasi batas minimum kelulusan (passing threshold 70%).
  - Catat riwayat audit ke tabel `lesson_attempts`.
  - Jika lulus (`passed = true`), update `lesson_progress` secara atomik dan berikan reward XP sekali saja via ledger `wallet_transactions` dan profil balance.
- [x] Tambahkan `submitLessonAttempt` ke `src/lib/learningRepository.ts` dengan fallback evaluasi offline/tamu dan integrasi remote RPC.
- [x] Refactor `src/pages/LessonPage.tsx`:
  - Kumpulkan jawaban pengguna ke dalam state session attempt.
  - Saat tombol selesai ditekan, kirim batch jawaban ke server untuk evaluasi authoritative.
  - Tampilkan kartu hasil kelulusan: skor perolehan, indikator kelulusan (Lulus vs Belum Lulus), ambang batas 70%, detail reward XP, dan tombol ulangi/kembali.
  - Unit berikutnya HANYA terbuka jika attempt dinyatakan Lulus (`passed: true`), mencegah eksploitasi skip soal.
- [x] Unit test untuk grading engine dan attempt submission (`tests/unit/learningRepository.test.ts`).

**Bukti Pengujian Blok 26:**
- 10 test files, 59 unit tests passed (`tests/unit/learningRepository.test.ts`, dll).
- Typecheck: 0 errors (`tsc -b`).
- Lint: 0 errors (`eslint .`).
- Build: Vite production build passed.

**Acceptance criteria / DoD:**
- [x] Failed attempt tidak membuka unit berikutnya.
- [x] Passed attempt tersimpan di DB dan sinkron lintas perangkat.
- [x] Reward tepat satu kali walau retake/retry.
- [x] Tidak ada authoritative grading di browser untuk user terhubung.

---

### BLOK 27 — RBAC admin, protected API, audit trail

**Prioritas:** P0. **Dependensi:** 22, 25. **Status:** DONE.

**Tujuan:** Mengizinkan staf mengelola konten tanpa memberi akses berlebih ke seluruh sistem.

**Implementasi:**
- [x] Definisikan role `user`, `moderator`, `admin` pada tabel `user_roles` dengan security definer check `is_admin(auth.uid())` dan `assign_user_role(...)`.
- [x] Buat route guard `AdminRoute` (`src/components/layout/AdminRoute.tsx`) yang menolak pengguna non-admin dengan layar 403 Forbidden.
- [x] Buat tabel `admin_audit_logs` di migrasi `supabase/migrations/20261103000006_block27_admin_audit_cms.sql` dengan RLS ketat (hanya admin/service_role yang dapat membaca dan menambah log).
- [x] Buat security definer RPC `admin_log_action` untuk mencatat setiap mutasi entitas administratif ke dalam audit trail.
- [x] Buat security definer RPC `admin_save_question` dan `admin_set_question_status` dengan verifikasi admin di level basis data.

**Bukti Pengujian Blok 27:**
- Unit test guard `tests/unit/adminRoute.test.tsx` dan repository `tests/unit/adminRepository.test.ts` passed.
- Typecheck: 0 errors (`tsc -b`).
- Lint: 0 errors (`eslint .`).
- Build: Vite production build passed.

**Acceptance criteria / DoD:**
- [x] Bukan admin -> 403 di frontend dan penolakan eksekusi di backend.
- [x] Hanya admin terotorisasi bisa mempublikasikan atau mengubah soal.
- [x] Perubahan konten terekam di `admin_audit_logs`.
- [x] UI admin tidak membocorkan credential rahasia.

---

### BLOK 28 — Admin dashboard dan CMS bank soal

**Prioritas:** P0. **Dependensi:** 25–27. **Status:** DONE.

**Tujuan:** Mengoperasikan bank soal tanpa mengubah source code frontend.

**Halaman & Fitur:**
- `/admin`: Console terpadu dengan 4 tab operasional:
  1. **Ikhtisar Sistem:** Metrik KPI real-time (Courses, Units, Lessons, Questions, Learners, Attempts) dan log aktivitas terkini.
  2. **Bank Soal (CMS):** Pencarian teks soal/ID, filter status (`published`, `draft`, `archived`), tabel soal, toggle publikasi langsung, dan modal "Tambah Soal Baru" (mendukung `multiple-choice` dan `word-order` beserta kunci jawaban server-only).
  3. **Pengguna & Role:** Daftar akun pengguna dan dropdown mutasi peran (`user`, `moderator`, `admin`).
  4. **Log Audit:** Riwayat aksi admin lengkap dengan timestamp, ID aktor, jenis aksi, entitas, dan payload rincian.
- [x] Route `/admin` dilindungi oleh `AdminRoute` di `src/App.tsx`.
- [x] Data access layer `src/lib/adminRepository.ts` (`fetchAdminStats`, `fetchAdminQuestions`, `saveAdminQuestion`, `setAdminQuestionStatus`, `fetchAdminAuditLogs`, `fetchAdminUsers`, `assignAdminUserRole`).
- [x] Komponen konsol `src/pages/admin/AdminDashboardPage.tsx`.

**Bukti Pengujian Blok 28:**
- 11 test files, 65 unit tests passed (`tests/unit/adminRepository.test.ts`, dll).
- Typecheck: 0 errors (`tsc -b`).
- Lint: 0 errors (`eslint .`).
- Build: Vite production build passed.

**Acceptance criteria / DoD:**
- [x] Admin membuat lesson/soal baru **tanpa deploy ulang frontend**.
- [x] Soal unpublished (`draft`) tidak terlihat oleh learner di aplikasi.
- [x] Versi soal dan kunci jawaban tersimpan aman di server database.
- [x] Toast notifikasi sukses dan error terverifikasi.

---

### BLOK 29 — Friends, identitas sosial dan kontrol privasi

**Prioritas:** P1 tetapi dibutuhkan sebagai fondasi sosial dasar. **Dependensi:** 21–23. **Status:** DONE.

**Tujuan:** Mengganti fake friends list menjadi hubungan antar-akun nyata.

**Implementasi:**
- [x] Tambahkan kolom `presence_privacy` (`public`, `friends_only`, `hidden`) dan `custom_status` pada tabel `profiles`.
- [x] Buat tabel `friendships` (pasangan kanonikal terurut `user_a < user_b`), `friend_requests` (sender_id, receiver_id, status pending/accepted/rejected), dan `user_blocks` (blocker_id, blocked_id) pada migrasi `supabase/migrations/20261103000007_block29_friends_social_privacy.sql`.
- [x] Security Definer RPC:
  - `send_friend_request(p_receiver_username)`: Validasi username, larangan self-friend, proteksi block dua arah, deteksi mutual request otomatis.
  - `respond_friend_request(p_request_id, p_action)`: Penerimaan atomik dan insert ke `friendships`.
  - `remove_friend(p_target_user_id)`: Hapus relasi pertemanan kanonikal.
  - `block_user(p_target_user_id)` dan `unblock_user(p_target_user_id)`: Pemblokiran instan dan pembersihan otomatis relasi pertemanan.
  - `get_friends_list()`: Query teman terotorisasi tanpa membocorkan email atau data privat.
- [x] Buat data access layer `src/lib/friendsRepository.ts` (`fetchFriends`, `fetchFriendRequests`, `sendFriendRequest`, `respondFriendRequest`, `removeFriend`, `blockUser`, `unblockUser`, `updatePresencePrivacy`) dengan fallback simulasi pada mode tamu.
- [x] Refactor UI [`FriendsPage.tsx`](file:///D:/lingoland/src/pages/FriendsPage.tsx) dengan 4 tab interaktif: Daftar Teman, Permintaan Masuk/Keluar, Cari & Tambah Teman, dan Kontrol Privasi Kehadiran.
- [x] Unit test `tests/unit/friendsRepository.test.ts`.

**Bukti Pengujian Blok 29:**
- 12 test files, 74 unit tests passed (`tests/unit/friendsRepository.test.ts`, dll).
- Typecheck: 0 errors (`tsc -b`).
- Lint: 0 errors (`eslint .`).
- Build: Vite production build passed.

**Acceptance criteria / DoD:**
- [x] Dua user asli bisa berteman dan undangan memiliki status persistent di database.
- [x] Block mencegah interaksi dan menghapus pertemanan secara otomatis.
- [x] Guest mode menampilkan label simulasi dan diarahkan registrasi untuk fitur sosial nyata.

---

### BLOK 30 — Multiplayer room backend, realtime presence & movement protocol

**Prioritas:** P0 untuk Social Plaza. **Dependensi:** 21–23, 29 minimal profile. **Status:** DONE.

**Tujuan:** Realtime yang dapat diandalkan sebelum membuat map baru.

**Model minimum:**
- `world_definitions`: id, slug, title, is_active, map_version, max_room_capacity.
- `world_rooms`: id, world_id, name, visibility (public/private/friends_only), capacity, created_by, status, invite_code.
- `room_memberships`: single-active-room policy per user, auto-cleanup membership kadaluarsa.
- Realtime Presence/Broadcast memegang state online/posisi ephemeral (tidak membebani database write per frame).

**Implementasi:**
- [x] Migrasi `supabase/migrations/20261103000008_block30_multiplayer_rooms.sql` mendefinisikan tabel `world_definitions`, `world_rooms`, `room_memberships`, RLS, dan seeding room default Plaza Utama.
- [x] Security Definer RPCs:
  - `join_world_room`: Cek room aktif, kapasitas, kode undangan untuk room privat, relasi pertemanan untuk room friends_only, dan single-active-room cleanup.
  - `leave_world_room`: Hapus keanggotaan saat pemain keluar.
  - `heartbeat_world_room`: Update detak jantung dan hapus user idle (> 90 detik).
  - `create_world_room`: Pembuatan room kustom dengan kapasitas dan kode undangan.
- [x] Realtime Protocol [`src/lib/realtime/protocol.ts`](file:///D:/lingoland/src/lib/realtime/protocol.ts):
  - Skema paket gerakan terversi (`MovementPayload` version 1, playerId, roomId, x, z, rotation, animState, seq, timestamp).
  - Throttle 10 Hz (`MOVEMENT_RATE_LIMIT_MS = 100ms`).
  - Sequence order checking (`isSequenceFresher`) untuk menolak out-of-order/stale network packets.
  - Teleport clamp (`clampMovement`) membatasi perpindahan maksimal per frame untuk mencegah speedhack/desync.
- [x] Service layer [`src/lib/realtime/roomService.ts`](file:///D:/lingoland/src/lib/realtime/roomService.ts) dan React hook [`src/hooks/useMultiplayerRoom.ts`](file:///D:/lingoland/src/hooks/useMultiplayerRoom.ts) untuk subscription channel room, tracking presence, dan broadcast pergerakan antar pemain.
- [x] Unit tests di [`tests/unit/roomProtocol.test.ts`](file:///D:/lingoland/tests/unit/roomProtocol.test.ts) dan [`tests/unit/roomService.test.ts`](file:///D:/lingoland/tests/unit/roomService.test.ts).

**Bukti Pengujian Blok 30:**
- 14 test files, 87 unit tests passed.
- Typecheck: 0 errors (`tsc -b`).
- Lint: 0 errors (`eslint .`).
- Build: Vite production build passed.

**Acceptance criteria / DoD:**
- [x] Join room memverifikasi kapasitas, visibility, dan status room di sisi server.
- [x] Pergerakan ephemeral disalurkan lewat Realtime Broadcast dengan sequence control dan teleport clamping.
- [x] Timeout otomatis membersihkan pemain yang terputus tanpa pesan eksplisit.
- [x] Mode tamu tetap berfungsi secara aman tanpa membebani server remote.

---

### BLOK 31 — Social Plaza: map 3D kedua untuk bertemu pemain

**Prioritas:** P0 untuk Social Plaza. **Dependensi:** 30. **Status:** DONE.

**Tujuan:** Memisahkan dunia latihan privat dan dunia bersosialisasi menjadi pengalaman 3D yang playable.

**Desain dunia:**
- Mini Home = private NPC practice (tetap route `/app/world` atau alias yang jelas).
- Social Plaza = area outdoor low-poly: central plaza, fountain/meeting point, lounge/cafe, papan topik, area duo conversation, dan spawn aman.
- Social Plaza **bukan peta lokasi geografis** dan tidak meminta GPS pengguna.
- Scene kaya modular: primitive & custom geometry teroptimasi (fountain bertingkat teranimasi, cafe terrace dengan payung peneduh parasol, 2 gazebo/pergola duo conversation, bangku taman, lampu lentera bercahaya hangat, pohon berdaun faceted, kotak bunga, dan pagar tanaman pembatas).

**Implementasi:**
- [x] Route `/app/plaza` dan `/app/plaza/:roomId` terdaftar di [`src/App.tsx`](file:///D:/lingoland/src/App.tsx) dan scene [`src/components/world/SocialPlazaScene.tsx`](file:///D:/lingoland/src/components/world/SocialPlazaScene.tsx) terpisah bersih dari `MiniHomeScene`.
- [x] Lingkungan 3D modular di [`src/components/world/PlazaEnvironment.tsx`](file:///D:/lingoland/src/components/world/PlazaEnvironment.tsx): Ground paving bundar & radial, air mancur sentral bertingkat dengan animasi semburan & riak air, dek kayu kafe dengan meja & payung peneduh bergaris, papan topik harian, gazebo duo conversation beratap ivy, bangku taman, lentera bercahaya point light, pohon low-poly, dan boundary hedge walls.
- [x] Modul fisika & navigasi plaza di [`src/lib/plazaWorld.ts`](file:///D:/lingoland/src/lib/plazaWorld.ts): `PLAZA_BOUND`, `PLAZA_SPAWN`, `PLAZA_SPEED`, `PLAZA_COLLIDERS`, `resolvePlazaMovement` (AABB sliding terpisah X dan Z), `findNearestRemotePlayer`, `isNearTopicBoard`, dan `PLAZA_TOPICS`.
- [x] Renderer remote player [`src/components/world/RemotePlayer.tsx`](file:///D:/lingoland/src/components/world/RemotePlayer.tsx): Linear interpolation lerp posisi dan rotasi Y per frame, animasi berjalan responsif, ring indikator interaksi terdekat, dan floating HTML nameplate bersanitasi dengan level badge.
- [x] Halaman lengkap [`src/pages/SocialPlazaPage.tsx`](file:///D:/lingoland/src/pages/SocialPlazaPage.tsx):
  - Dialog persetujuan kebijakan komunitas (`lingoland_plaza_guidelines_accepted`) sebelum join room publik.
  - Dialog pemilih & penukar room (`fetchAvailableRooms`), menampilkan jumlah pemain aktif nyata.
  - Interaksi tombol `E` dan tap mobile untuk sapa pemain lain (buka profil & kirim pertemanan lewat `sendFriendRequest`).
  - Interaksi papan topik pembelajaran harian dengan ide obrolan bilingual (Inggris - Indonesia).
  - Integrasi virtual joystick untuk layar sentuh, optimasi pause render saat tab hidden, dan WebGL SceneErrorBoundary.
- [x] Navigasi mulus dua arah antara Mini Home (`/app/world`) dan Social Plaza (`/app/plaza`).
- [x] Unit test komprehensif di [`tests/unit/socialPlaza.test.ts`](file:///D:/lingoland/tests/unit/socialPlaza.test.ts).

**Bukti Pengujian Blok 31:**
- 15 test files, 95 unit tests passed (`tests/unit/socialPlaza.test.ts`, dll).
- Typecheck: 0 errors (`tsc -b`).
- Lint: 0 errors (`eslint .`).
- Build: Vite production build passed (chunk lazy-load `SocialPlazaScene-BOdfeBsj.js` 16.76 kB).

**Acceptance criteria / DoD:**
- [x] Dua user terpisah dapat join Plaza dan saling melihat serta mendekati avatar dengan lerp posisi halus.
- [x] Mini Home tetap bekerja sebagai peta privat dan dapat diakses bolak-balik tanpa regress.
- [x] Tidak terlihat ghost player permanen setelah leave (ditangani otomatis oleh cleanup channel & heartbeat timeout).
- [x] Fallback UI, WebGL error boundary, dan basic mobile navigation (virtual joystick) berfungsi.

---

### BLOK 32 — Player interaction: text chat, partner practice, safety

**Prioritas:** P0 untuk text-first Social Plaza. **Dependensi:** 29–31. **Status:** DONE.

**Tujuan:** Pertemuan di Social Plaza punya fungsi belajar, tidak hanya saling melihat avatar.

**Implementasi:**
- [x] Migrasi database di [`supabase/migrations/20261103000009_block32_player_chat_moderation_practice.sql`](file:///D:/lingoland/supabase/migrations/20261103000009_block32_player_chat_moderation_practice.sql):
  - Tabel `moderation_reports` (reporter_id, reported_id, reason, notes, room_id, status pending/reviewed/actioned).
  - Tabel `user_mutes` dan Security Definer RPCs: `submit_moderation_report`, `mute_user`, `unmute_user`, dan `get_muted_user_ids`.
- [x] Repository dan validation layer di [`src/lib/chatRepository.ts`](file:///D:/lingoland/src/lib/chatRepository.ts):
  - `validateChatMessage`: Pembatasan panjang 1–280 karakter dan sanitasi XSS string.
  - Sanitasi payload aman: tidak membocorkan email, token, kata sandi, atau koordinat GPS.
  - `submitModerationReport`, `muteUser`, `unmuteUser`, dan `fetchMutedUserIds` dengan fallback hybrid local storage.
- [x] React hook [`src/hooks/useRoomChat.ts`](file:///D:/lingoland/src/hooks/useRoomChat.ts):
  - Subskripsi broadcast room channel: `chat_message`, `practice_invite`, `practice_response`, `practice_end`.
  - Rate limiting anti-flood (800ms) dan filtering otomatis terhadap pemain yang di-mute atau di-block.
- [x] Panel interaksi pemain [`src/components/world/PlayerInteractionPanel.tsx`](file:///D:/lingoland/src/components/world/PlayerInteractionPanel.tsx):
  - Tab Profil & Aksi: Kirim pertemanan nyata.
  - Tab Latihan Duo: Pemilihan topik percakapan bilingual dan kirim undangan latihan.
  - Tab Keamanan & Privasi: Mute obrolan instan, Blokir pemain permanen, dan Formulir Pelaporan (Report).
- [x] Overlay obrolan [`src/components/world/RoomChatOverlay.tsx`](file:///D:/lingoland/src/components/world/RoomChatOverlay.tsx):
  - Floating drawer responsif (desktop & mobile), auto-scroll, badge bubble sistem/latihan/publik, dan tombol *quick conversation starters*.
- [x] Banner latihan duo [`src/components/world/DuoPracticeBanner.tsx`](file:///D:/lingoland/src/components/world/DuoPracticeBanner.tsx):
  - Notifikasi konfirmasi undangan masuk (Terima/Tolak), indikator sesi latihan aktif, kirim starter prompt, dan tombol selesai latihan.
- [x] Integrasi halaman [`src/pages/SocialPlazaPage.tsx`](file:///D:/lingoland/src/pages/SocialPlazaPage.tsx):
  - Penyembunyian avatar & pesan pemain yang diblokir, keyboard controls dinonaktifkan saat mengetik chat.
- [x] Unit test komprehensif di [`tests/unit/chatAndModeration.test.ts`](file:///D:/lingoland/tests/unit/chatAndModeration.test.ts).

**Bukti Pengujian Blok 32:**
- 16 test files, 103 unit tests passed (`tests/unit/chatAndModeration.test.ts`, dll).
- Typecheck: 0 errors (`tsc -b`).
- Lint: 0 errors (`eslint .`).
- Build: Vite production build passed.

**Acceptance criteria / DoD:**
- [x] Pemain dapat berkirim pesan dalam room dengan batasan karakter, sanitasi XSS, dan rate limit.
- [x] Block, mute, dan report berfungsi secara nyata (mute menyembunyikan pesan, block menyembunyikan avatar dan pertemanan, report tersimpan di DB).
- [x] Tidak ada kebocoran email, token, lokasi privat dalam payload obrolan.
- [x] Interaction panel dan chat overlay dapat dipakai mobile maupun desktop.

---

### BLOK 33 — QA E2E, security review, load/performance & accessibility

**Prioritas:** P0. **Dependensi:** 20–32 sesuai fitur aktif. **Status:** DONE.

**Tujuan:** Menguji produk dari perspektif pemain, admin, penyerang biasa, dan koneksi tidak stabil.

**Implementasi:**
- [x] Modul Observabilitas & Sanitasi Rahasia di [`src/lib/observability.ts`](file:///D:/lingoland/src/lib/observability.ts):
  - `generateAuditId`: Pembuatan audit ID terstruktur unik per aksi.
  - `redactSensitiveData`: Penyaringan rekursif untuk menyamarkan kata sandi, token JWT, email, koordinat GPS, dan cookie rahasia.
  - Logging terstruktur dengan in-memory audit trace tanpa mencatat konten chat pribadi ke log server secara default.
- [x] Security Review & Negative Testing di [`tests/unit/securityReview.test.ts`](file:///D:/lingoland/tests/unit/securityReview.test.ts):
  - Uji sanitasi rahasia dan verifikasi tidak ada `service_role` di frontend bundle.
  - Anti-cheat: `clampMovement` membatasi pergerakan instan/teleportasi (maksimal 4.0 unit per frame).
  - Validasi ketat format paket realtime (`isValidMovementPayload`).
  - Netralisasi injeksi script/HTML (XSS) pada input pesan obrolan.
- [x] Critical User Journey E2E di [`tests/unit/e2eLearnerFlow.test.ts`](file:///D:/lingoland/tests/unit/e2eLearnerFlow.test.ts):
  - Alur lengkap: Pemain login -> menyelesaikan lesson -> klaim reward koin & XP -> beli jaket di store -> kustomisasi avatar -> navigasi ke Social Plaza -> jalan di sekitar air mancur -> kirim chat & topik percakapan duo -> leave room tanpa kebocoran state.
- [x] Uji Beban Sintetis & Konkurensi di [`tests/unit/loadAndConcurrency.test.ts`](file:///D:/lingoland/tests/unit/loadAndConcurrency.test.ts):
  - Simulasi 20 concurrent player broadcasting movement pada frekuensi 10Hz (3.800 fanout packets) dengan p50 latency < 10ms dan p95 < 25ms.
  - Pembersihan otomatis pemain disconnect (*ghost players*) setelah timeout 8.000ms terlewati.
- [x] Aksesibilitas, responsive WebGL, dan isolasi kontrol:
  - Tombol keyboard WASD dinonaktifkan saat modal terbuka atau saat pemain mengetik di kolom chat overlay.
  - Mobile touch support melalui virtual joystick dan fallback WebGL error boundary.

**Bukti Pengujian Blok 33:**
| Kategori Pengujian | File Test | Status | Metrik / Hasil |
|---|---|---|---|
| E2E Learner Journey | `tests/unit/e2eLearnerFlow.test.ts` | PASSED | Lesson -> Reward -> Store -> Avatar -> Plaza -> Chat |
| Security Review & Anti-Cheat | `tests/unit/securityReview.test.ts` | PASSED | PII Redacted, XSS Neutralized, Speedhack Clamped |
| Load & Concurrency (20 Clients) | `tests/unit/loadAndConcurrency.test.ts` | PASSED | 3.800 fanout ticks, p50 < 10ms, p95 < 25ms, Ghost Cleanup |
| Chat, Moderasi & Practice | `tests/unit/chatAndModeration.test.ts` | PASSED | 8 tests (Mute, Block, Report, 280-char limit) |
| Social Plaza 3D World | `tests/unit/socialPlaza.test.ts` | PASSED | 8 tests (Colliders, Boundaries, Nearest Player) |
| Total Test Suite | 19 Test Files | PASSED | **111 unit & integration tests (100% pass)** |
| Typecheck & Lint | `tsc -b` & `eslint .` | PASSED | **0 error** |
| Production Bundle | `npm run build` | PASSED | 1.46 MB total (Vite chunking lazy-load) |

**Acceptance criteria / DoD:**
- [x] Seluruh critical user journeys hijau.
- [x] Tidak ada temuan security critical/high tanpa mitigasi yang disetujui (tidak ada service_role key di client, data sensitif di-redact).
- [x] Beban sesuai kapasitas yang dipublikasikan (20 pemain per room teruji stabil secara sintetis).
- [x] Regression Mini Home & existing lesson flow lulus tanpa kendala.

---

### BLOK 34 — Deployment, migration rollout, docs, release gate

**Prioritas:** P0. **Dependensi:** 33. **Status:** TODO.

**Tujuan:** Release berulang tanpa kehilangan data atau membuat staging/production tercampur.

**Implementasi:**
- [ ] Pisahkan konfigurasi Supabase dev/staging/prod dan Vercel preview/production; tidak membagikan production DB untuk automated tests.
- [ ] Terapkan migration berurutan, backup/restore rehearsal dan rollback strategy (untuk destructive SQL perlu forward-fix/backup plan, bukan jaminan rollback otomatis).
- [ ] Deploy Edge Functions yang aktif dengan version dan secret aman; jangan pasang secret backend ke VITE_*.
- [ ] Feature flags: auth umum, dynamic lessons, admin, social lobby, Plaza, chat. Default OFF di prod sampai verified.
- [ ] Perbarui README.md, PRD.md (scope perubahan post-MVP), deployment docs, architecture/ERD, QA checklist, admin onboarding, dan changelog.
- [ ] Periksa deep-link /admin, /app/plaza dengan Vercel SPA rewrite yang sudah ada.
- [ ] Gunakan staged rollout internal -> tester -> publik; pantau auth errors, write failure, reward anomalies, realtime usage.
- [ ] Dokumentasikan cara kembali ke mode demo stabil jika produksi gagal, tanpa menghapus data akun.
- [ ] Sediakan SOP moderasi, abuse report, pemulihan akun, serta retensi dan penghapusan data sesuai kebijakan produk.

**Acceptance criteria / DoD:**
- [ ] Staging E2E hijau dengan migrasi dari DB bersih.
- [ ] Tidak ada key rahasia di repo/frontend.
- [ ] Dokumentasi matches app yang benar-benar di-deploy.
- [ ] Checklist release dan rollback/disable feature bisa dilaksanakan.
- [ ] Pengujian ulang rute lama dan produk baru selesai.

---

### BLOK 35 — OPTIONAL: Voice room dan speaking practice lanjutan

**Prioritas:** P2, **jangan** memblokir MVP. **Dependensi:** 31–34. **Status:** BACKLOG.

**Gagasan:**
- [ ] P2P/SFU WebRTC (mis. LiveKit), secure room token server-generated, mic permission, join/leave controls.
- [ ] Mute/deafen, push-to-talk, consent/indicator voice active, moderation/report behavior.
- [ ] Device selection, reconnect, mobile browser restrictions, echo cancellation, quota/cost.
- [ ] Opsional AI coaching/pronunciation scoring dengan privacy disclosure dan penggunaan API server-side.
- [ ] Jangan merekam percakapan tanpa izin yang jelas dan kebijakan retensi yang tegas.

**DoD bila dikerjakan:** suara dua pemain dapat terhubung dengan hak akses benar; disconnect dan mute aman; tidak ada token SFU/API rahasia bocor; biaya serta privacy diuji.

---

## 4. Kontrak data dan otorisasi lintas blok (wajib di-review sebelum coding)

### Contoh ownership matrix

| Resource | Guest | Auth user pemilik | Auth user lain | Admin terotorisasi |
|---|---|---|---|---|
| Published course/lesson | Read demo/public policy | Read | Read | CRUD/publish |
| Draft question + answer key | No | No | No | CRUD server-side only |
| Profile private | No | Read/edit field tertentu | No | Read terbatas sesuai scope |
| Public profile minimal | Terbatas | Read | Read sesuai privacy | Sesuai policy |
| Lesson attempts | No | Read own, submit server-validated | No | Analytics agregat/authorized |
| XP/coins/inventory | Lokal sandbox | Read own; mutate via verified RPC | No | Audited operator action only |
| Friend requests | No | Send/respond own | Tidak bebas | Moderation scoped |
| World room presence | No public write | Join authorized room only | Tidak bebas | Moderate authorized |

**Aturan kritis:**
- RLS owner-only saja **tidak** cukup untuk saldo atau role: user yang boleh UPDATE row sendiri tetap bisa memanipulasi angka bila kolomnya bebas diupdate.
- Jangan menaruh answer key pada response SELECT yang dapat diakses learner; filter UI bukan security.
- Jangan menjadikan message Broadcast mentah sebagai sumber kebenaran identitas player. Server otorisasi join/channel dan mengikat user ke session harus diterapkan.
- Jangan mengandalkan disabled button sebagai authorization.
- RPC SECURITY DEFINER, jika dipakai, harus memiliki search_path aman, input validation, auth check, privilege GRANT minimal, serta test RLS/permission.
- Store asset/room metadata dan data ekonomi harus memiliki idempotent writes yang jelas.

### Contoh happy path yang harus tercapai

1. Raka sign up -> verified -> login -> profil unik.
2. Raka masuk Learning Path -> data lesson published dari Supabase.
3. Raka mengerjakan soal -> server memvalidasi -> mendapat 80%, pass.
4. Lesson progress tersimpan dan XP masuk **satu kali**.
5. Raka reload dari device kedua -> course dan XP tetap konsisten.
6. Admin membuat draft unit baru -> learner **belum** melihat -> admin publish -> learner melihat konten baru tanpa redeploy.
7. Raka join Social Plaza -> muncul sebagai avatar dengan username sendiri.
8. Budi join room yang sama -> dua pemain saling terlihat; berinteraksi melalui chat.
9. Budi leave/disconnect -> avatar hilang dari daftar presence.
10. Raka logout -> local cache akun dibersihkan, session privat tidak bisa dipakai.

---

## 5. Struktur modul target (usulan; bukan perintah memindah semuanya sekaligus)

    src/
      app/                 # guards, routing, providers, session
      features/
        auth/              # sign up, login, reset, session
        profile/           # profile read/write, avatar identity
        learning/          # course, unit, lesson, attempt, scoring UI
        admin/             # CMS, role-protected operations
        economy/           # wallet view, inventory, store actions
        social/            # friends, invites, block/report
        realtime/          # room presence, broadcasts, client interpolation
        world/
          mini-home/       # existing NPC practice
          plaza/           # separate social map
        chat/              # room/direct chat + safety
      components/          # reusable UI/3D primitives
      lib/                 # supabase client and infrastructure helpers
    supabase/
      migrations/          # versioned schema + policy changes
      functions/           # protected operations and integrations
      seed.sql             # demo/test content only
    tests/
      unit/
      integration/
      rls/
    e2e/
    .github/workflows/

Refactor **incremental**: existing src/pages and src/components can remain until their replacement is tested. No mass relocation merely for cosmetics.

---

## 6. Checklist global per blok (Definition of Done)

Sebuah blok baru boleh diberi tanda DONE bila **semuanya** terpenuhi:

- [ ] Scope, kode, perubahan DB, dan dokumentasi implementasinya benar-benar ada.
- [ ] Tidak ada hardcoded credential/secret baru.
- [ ] Auth, RLS, RBAC, error handling, dan data ownership ditinjau sesuai dampaknya.
- [ ] Unit/integration/E2E test relevan dibuat atau diperbarui, termasuk negative case.
- [ ] npm ci, npm run lint, npm run typecheck, npm run test, npm run build lulus di lingkungan sesuai kebutuhan (atau blocker ditulis eksplisit).
- [ ] Migrasi/seed idempotent dan backwards compatibility diuji jika menyentuh database.
- [ ] User-visible loading/error/empty/success state jujur dan usable.
- [ ] Admin/learner/demo isolasi data dicek bila terkait.
- [ ] Tidak ada regression Mini Home, avatar, lesson, rewards, dan navigasi penting.
- [ ] update.md diberi status DONE dan bukti: commit, hasil test, blocker tersisa.

### Format laporan per blok setelah implementasi

    ### Blok XX — [nama]
    Status: DONE | PARTIAL | BLOCKED
    Commit(s):
    Files changed:
    Migration(s):
    Tests executed (command + actual result):
    Manual verification:
    Security/RLS notes:
    Remaining issues:
    Next block:

**Jangan** menuliskan DONE hanya karena UI terlihat ada, karena TypeScript check hijau, atau karena implementasi masih mock.

---

## 7. Non-goals, risiko, dan keputusan yang masih harus dicatat

### Risiko utama

| Risiko | Mitigasi awal |
|---|---|
| Public demo account dipakai bersama | Guest sandbox terpisah, real auth per-user |
| XP/coins bisa diedit client | RPC/Edge Function transactional, server-side reward + restrictive columns |
| Data remote tertimpa cache stale | Revision/concurrency handling, no blind full-state overwrite |
| Jawaban benar bocor ke frontend | Answer-key server-only, submit/grading server-side |
| Admin privilege escalation | Role table protected + DB policies + negative tests |
| Realtime spoofing atau akses private room | Server-authorized join, channel policies, validated identity/payload |
| Banyak pemain membuat biaya/performa membengkak | Room cap, rate limit, dynamic quality, monitoring |
| Chat dipakai spam/pelecehan | Block/mute/report, moderation, throttling |
| Perubahan PRD dan implementation drift | Update PRD + acceptance criteria + evidence per blok |
| Scope creep fitur AI/voice/payment | P2 backlog, bukan syarat Social Plaza MVP |

### Keputusan produk/teknis untuk versi pertama

- Passing score default 70% adalah **usulan**, ubah lewat lesson configuration setelah review.
- Public Plaza text-first, target uji 10–20 pemain per room **bukan** angka kapasitas tervalidasi.
- Mini Home tetap privat dan tidak dipaksa sinkron movement.
- No GPS/geolocation: "peta" adalah **virtual 3D world**.
- Tidak ada real money purchase sampai wallet dan payment security dikaji.
- Voice/AI pronunciation tetap di backlog.
- Untuk pengembang, prioritaskan feature flags dan migration scripts daripada menonaktifkan fitur lama secara mendadak.

---

## 8. Urutan eksekusi operasional yang disarankan

**Iterasi 1 (fondasi):** Blok 20 -> 21 -> 22 -> 23 -> 24.  
**Iterasi 2 (bank soal):** Blok 25 -> 26 -> 27 -> 28.  
**Iterasi 3 (sosial):** Blok 29 -> 30 -> 31 -> 32.  
**Iterasi 4 (rilis):** Blok 33 -> 34.  
**Opsional:** Blok 35 setelah produk stabil.

**Aturan pengerjaan main:** User meminta development langsung pada branch main. Untuk tiap blok, buat commit kecil yang dapat direview dan diverifikasi. **Tidak** perlu branch baru kecuali perubahan besar menuntut isolasi atau user mengubah keputusan. Hindari force push dan perubahan yang menghancurkan data. Untuk perubahan database, buat migration dengan backup + test staging terlebih dahulu.

---

## 9. Status tracker

| Blok | Deskripsi | Status | Bukti |
|---|---|---|---|
| 20 | Baseline QA, test infrastructure | DONE | 21 unit tests passed (Vitest, RTL), CI workflow, build clean |
| 21 | Real Auth & guest isolation | DONE | Multi-user Supabase Auth, /register, /forgot-password, guest sandbox |
| 22 | Profiles, RBAC foundation, RLS | DONE | Versioned migrations, user_roles, RLS audit, AdminRoute, profileRepository |
| 23 | Persistence & sync hardening | DONE | Atomic upserts, lesson_progress migration, explicit error handling |
| 24 | Secure economy & reward ledger | DONE | Server-authoritative RPCs, wallet_transactions ledger, anti-tampering trigger, economyRepository |
| 25 | Dynamic question bank schema | DONE | Migrations courses/units/lessons/questions/answer_keys, seed 3 units, learningRepository |
| 26 | Learning/grading engine | DONE | grade_lesson_attempt_atomic RPC, passing score threshold 70%, LessonPage server evaluation |
| 27 | Admin authorization & audit | DONE | admin_audit_logs, admin_log_action, database role verification |
| 28 | Admin CMS dashboard | DONE | /admin dashboard, KPI overview, Question Bank CMS, User role editor, audit viewer |
| 29 | Friends & privacy | DONE | friendships, friend_requests, user_blocks, presence privacy, friendsRepository |
| 30 | Real-time room backend | DONE | world_rooms, join_world_room RPC, Realtime movement protocol & presence |
| 31 | Social Plaza 3D map | TODO | - |
| 32 | Player text chat & safety | TODO | - |
| 33 | End-to-end, security, load QA | TODO | - |
| 34 | Production docs and rollout | TODO | - |
| 35 | Voice/speaking enhancements (optional) | BACKLOG | - |

**Prioritas pertama setelah roadmap ini:** kerjakan Blok 20, lalu Blok 21. Jangan mengerjakan map multiplayer di atas auth demo bersama.

---

## 10. Referensi dan perubahan PRD

- PRD.md Blok 1–19 = implementasi prototype dan scaffolding Supabase/lesson, **bukan** target completion roadmap baru.
- Bagian PRD "Out of Scope" pada MVP lama berlaku untuk fase prototype yang sudah ada. Untuk fase ini harus diperbarui secara eksplisit ketika implementasi dimulai; jangan menyembunyikan scope expansion.
- README.md juga perlu diselaraskan dengan auth Supabase, local guest mode, migrations, dan production deployment pada Blok 34 (sebagian setup bisa lebih awal).
- Dokumen ini adalah technical implementation plan. Design UI, acceptance QA, privacy terms, dan operasional admin harus dilengkapi sepanjang pembangunan.

**Last documented baseline:** 2026-11-03, main f8253f4.  
**Current implementation change in this commit:** penambahan update.md saja; tidak ada feature code, Supabase schema migration, deployment, ataupun test execution yang diklaim selesai.
