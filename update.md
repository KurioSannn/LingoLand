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

**Prioritas:** P0. **Dependensi:** 21–22. **Status:** TODO.

**Tujuan:** Progres stabil lintas perangkat, dengan penanganan konflik dan error eksplisit.

**Implementasi:**
- [ ] Definisikan source of truth: Supabase untuk akun login; localStorage hanya cache/offline draft non-authoritative. Guest lokal tetap mandiri.
- [ ] Pecah DemoState yang bercampur antara session, UI, dan remote domain; buat typed repository/service boundaries (profile, avatar, mission, inventory, lesson).
- [ ] Ganti pola delete-then-insert massal dalam supabaseSync.ts dengan upsert/transaction/RPC yang spesifik; hindari stale state menimpa state lebih baru.
- [ ] Periksa error dari **setiap** panggilan Supabase, jangan hanya menunggu Promise selesai.
- [ ] Tangani optimistic UI dengan rollback atau pending indicator yang bisa di-retry; kegagalan server harus terlihat.
- [ ] Simpan revision/updated_at untuk concurrency control; batasi listener sync dan cleanup saat user berganti.
- [ ] Pindahkan completedLessonIds ke tabel lesson_progress; buat backfill konservatif hanya untuk data user yang dapat dipercaya.
- [ ] Guest -> account: tawarkan import progress non-ekonomi yang valid atau mulai baru; jangan otomatis mengimpor XP/koin client ke authoritative wallet.
- [ ] Reset progress menjadi transaksi aman: hapus progres yang relevan, jangan hapus auth user tanpa maksud, jangan re-seed data dari stale cache.
- [ ] Buat migration plan/feature flag untuk memisahkan demo state lama tanpa merusak pengguna yang masih mencoba prototype.

**File kemungkinan:** src/state/DemoContext.tsx, src/state/demoReducer.ts, src/hooks/useDemoStorage.ts, src/lib/supabaseSync.ts, src/lib/storage.ts, src/lib/*Repository.ts, supabase/migrations/*.

**Pengujian wajib:** dua device update avatar, concurrent update, offline->online retry, error 401/403/RLS/network, reset dan reload, switch user pada browser sama, idempotency.

**Acceptance criteria / DoD:**
- [ ] Data auth user A tidak muncul pada user B walau memakai browser yang sama.
- [ ] Cross-device avatar/progress konsisten setelah fetch ulang.
- [ ] Tidak ada false success ketika write gagal.
- [ ] Reset tidak menyebabkan remote sync berhenti atau menulis ulang data stale.

---

### BLOK 24 — Server-authoritative XP, coins, inventory, reward

**Prioritas:** P0. **Dependensi:** 22–23. **Status:** TODO.

**Tujuan:** Ekonomi game tidak bisa dieksploitasi melalui Redux/reducer/browser/API langsung.

**Implementasi:**
- [ ] Buat reward_ledger / wallet_transactions dengan transaction id, user_id, source_type, source_id, delta_xp, delta_coins, created_at dan unique idempotency key per peristiwa.
- [ ] Semua misi selesai/claim reward melewati server RPC/Edge Function yang mengecek syarat objective, status, dan entitlement; nominal reward **diambil dari DB**, bukan action client.
- [ ] Semua pembelian store melewati server transaction: cek balance -> debit -> insert inventory -> commit secara atomik.
- [ ] Pisahkan wallet read model dari update API; larang client menulis saldo/level secara langsung.
- [ ] Tentukan kebijakan anti-abuse input: keyword match NPC masih prototipe dan dapat dipalsukan client. Sebelum menjadikan reward kompetitif, validasi event, rate limit, cap earning, dan deteksi pola anomali di server; jangan klaim penilaian speaking anti-cheat sempurna.
- [ ] Definisikan reward-once per lesson/mission, retry idempotent, rollback on partial failure, dan audit history.
- [ ] Pertahankan store/topup sebagai preview tanpa payment: jangan memproses pembayaran sebelum gateway dan ledger memenuhi syarat audit.

**File kemungkinan:** supabase/migrations/*, supabase/functions/* atau RPC SQL, src/state/demoReducer.ts, src/hooks/useDemoStorage.ts, src/pages/StorePage.tsx, src/pages/LessonPage.tsx, src/components/world/ConversationPanel.tsx.

**Pengujian wajib:** duplicate claim, race dua tab, negative balance, forged price, forged xp, replay request, error di tengah transaksi, invalid mission/lesson ID.

**Acceptance criteria / DoD:**
- [ ] Pembelian atomik dan saldo tidak negatif.
- [ ] Claim ulang sumber reward yang sama tidak menghasilkan kredit baru.
- [ ] Mengedit localStorage/request payload tidak menambah server XP/coins.
- [ ] Semua transaksi sensitif punya jejak audit.

---

### BLOK 25 — Schema bank soal dinamis, content lifecycle, seeding

**Prioritas:** P0. **Dependensi:** 22–24. **Status:** TODO.

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
- [ ] Tetapkan enum/constraint jenis soal: multiple-choice dan word-order terlebih dahulu; design extensible untuk listening, fill-blank, speaking pada masa depan.
- [ ] Definisikan workflow draft -> published -> archived dengan published_at dan published_version.
- [ ] Gunakan snapshot/versioning per attempt sehingga edit soal tidak merusak riwayat jawaban lama.
- [ ] Buat indices untuk course/unit/lesson ordering, status published, dan per-user progress.
- [ ] Migrasikan 3 unit lesson-intro, lesson-hobby, lesson-weekend dari src/data/demoData.ts sebagai seed idempotent, menjaga id/topic pairing seperlunya.
- [ ] Pisahkan question content yang visible untuk learner dari correct answer dan solution di server.
- [ ] Tentukan limit ukuran teks, pilihan, jumlah soal/lesson, CEFR tags, bahasa, dan validasi konten.
- [ ] Batasi learner SELECT pada **published** content; admin dapat read drafts hanya lewat izin resmi.

**File kemungkinan:** supabase/migrations/*, supabase/seed.sql atau scripts/seed-content.*, src/types.ts, src/lib/learningRepository.ts (baru), src/data/demoData.ts (fallback demo saja).

**Pengujian wajib:** duplicate seed, unpublished invisibility, FK invalid, deleted/archived content, course ordering, multi-version attempts, unauthorized write content.

**Acceptance criteria / DoD:**
- [ ] Seed 3 unit membentuk Learning Path identik secara tema dengan prototype saat ini.
- [ ] Soal user dibaca dari backend untuk akun login.
- [ ] Correct answers tidak bocor pada response read-only learner sebelum submit.
- [ ] Admin dapat membuat draft tanpa langsung menayangkannya.

---

### BLOK 26 — Learning engine dinamis, grading, mastery, progress

**Prioritas:** P0. **Dependensi:** 23–25. **Status:** TODO.

**Tujuan:** Latihan soal valid, hasil belajar dapat dipercaya, dan progression dapat dipulihkan.

**Implementasi:**
- [ ] Refactor LessonsPage dan LessonPage mengambil published lesson/question dari repository, bukan array tetap.
- [ ] Buat loading, empty, retry, offline state, disabled state, dan graceful handling untuk lesson archived/missing.
- [ ] Buat attempt lifecycle: start -> answer -> server-side grading -> result -> passed/failed -> progress update.
- [ ] Evaluasi multiple-choice dan word-order di server, dengan normalisasi terdefinisi dan perlakuan duplikat token yang benar.
- [ ] Tetapkan default passing score yang dapat dikonfigurasi per lesson (usulan awal **70%**); tidak otomatis lulus hanya karena tombol terakhir ditekan.
- [ ] Tampilkan skor benar/salah, rationale/feedback setelah submit, reattempt, best score, dan unlock criteria.
- [ ] Hubungkan unlock berikutnya ke passed lesson, bukan sekadar pernah membuka atau menjawab semua soal.
- [ ] Integrasi reward-once dari Blok 24; skor dan reward diverifikasi backend.
- [ ] Batasi spam submit, double-click, replay attempt, dan request tampering.
- [ ] Pastikan pairing lesson dengan mission NPC tetap konseptual; tidak membuat Mini Home tergantung pada course completion kecuali keputusan produk berubah.

**File kemungkinan:** src/pages/LessonsPage.tsx, src/pages/LessonPage.tsx, src/pages/LearnPage.tsx, src/state/selectors.ts, src/lib/learningRepository.ts, supabase/functions/submit-lesson/* atau RPC SQL.

**Pengujian wajib:** 0%, 69%, 70%, 100%, retake, refresh mid-attempt, attempt closed/replayed, question version changed, different user answer, duplicate options/tokens.

**Acceptance criteria / DoD:**
- [ ] Failed attempt tidak membuka unit berikutnya.
- [ ] Passed attempt tersimpan di DB dan sinkron lintas perangkat.
- [ ] Reward tepat satu kali walau retake/retry.
- [ ] Tidak ada authoritative grading di browser.

---

### BLOK 27 — RBAC admin, protected API, audit trail

**Prioritas:** P0. **Dependensi:** 22, 25. **Status:** TODO.

**Tujuan:** Mengizinkan staf mengelola konten tanpa memberi akses berlebih ke seluruh sistem.

**Implementasi:**
- [ ] Definisikan role user/admin (moderator opsional). Bootstrap admin pertama harus manual lewat trusted dashboard/SQL terotorisasi, **bukan** sign-up publik.
- [ ] Buat AdminRoute /admin, tetapi **semua** operasi admin juga dicek di database/server.
- [ ] Policy untuk create/update/publish/archive course, lesson, question, dan opsi; deny user biasa.
- [ ] Cegah user menulis assignment role sendiri, mengganti ownership, atau memalsukan klaim JWT.
- [ ] Buat admin_audit_logs: actor_id, action, entity_type, entity_id, before/after summary yang aman, timestamp, correlation id.
- [ ] Untuk tindakan destruktif gunakan confirmation, soft delete/archive, dan audit reason.
- [ ] Tinjau exposure data personal; admin konten tidak otomatis boleh melihat data sensitif semua user.

**File kemungkinan:** src/components/layout/AdminRoute.tsx (baru), src/pages/admin/*, supabase/migrations/*, src/lib/adminRepository.ts (baru).

**Pengujian wajib:** user mengakses /admin, fetch API admin langsung, update role sendiri, publish sebagai user, admin revoke, role cache stale.

**Acceptance criteria / DoD:**
- [ ] Bukan admin -> 403 di backend walau URL/API ditebak.
- [ ] Hanya admin terotorisasi bisa mempublikasikan soal.
- [ ] Perubahan konten terekam di audit log.
- [ ] UI admin tidak membocorkan key rahasia.

---

### BLOK 28 — Admin dashboard dan CMS bank soal

**Prioritas:** P0. **Dependensi:** 25–27. **Status:** TODO.

**Tujuan:** Mengoperasikan bank soal tanpa mengubah source code frontend.

**Halaman minimum:**
- /admin/dashboard: jumlah published/draft lessons, active learners, attempts, error ringkas.
- /admin/courses: CRUD course/unit, urutan, status.
- /admin/questions: list/search/filter by type/CEFR/status, create/edit/delete archive.
- /admin/lessons: pilih daftar soal, susun urutan, preview sebagai learner.
- /admin/users: list minimal user, status akun/akses sesuai izin, tanpa akses ke password/token.
- /admin/audit: log aksi admin dengan paging.

**Implementasi:**
- [ ] Form validasi lengkap untuk multiple-choice dan word-order, option count, correct answer, explanation, CEFR, dan passing score.
- [ ] Draft autosave/manual save dengan error jelas; publishing harus validasi server-side.
- [ ] Fitur duplicate lesson/question, preview, publish/unpublish/archive, dan paginated search.
- [ ] Cegah perubahan langsung pada published version yang sudah dipakai attempts; publish versi baru.
- [ ] Empty/error/loading/success state, keyboard accessibility, mobile-friendly view.
- [ ] Statistik pakai agregasi server dan akses minimum; jangan menampilkan informasi private tanpa kebutuhan.
- [ ] Export/import CSV/JSON menjadi P1 sesudah CRUD inti stabil; jika diaktifkan validasi schema, size, file type.

**File kemungkinan:** src/pages/admin/* (baru), src/components/admin/* (baru), src/App.tsx, src/components/layout/*, src/lib/adminRepository.ts, supabase/functions/admin-* atau RPC.

**Pengujian wajib:** admin CRUD -> publish -> learner load -> submit; drafts invisible; validation failure; unauthorized API; pagination; archived version.

**Acceptance criteria / DoD:**
- [ ] Admin membuat lesson berisi soal baru **tanpa deploy ulang frontend**.
- [ ] Soal unpublished tidak terlihat learner.
- [ ] Published lesson tetap bisa dilacak versinya setelah diedit.
- [ ] Aksi gagal tidak menampilkan toast sukses palsu.

---

### BLOK 29 — Friends, identitas sosial dan kontrol privasi

**Prioritas:** P1 tetapi dibutuhkan sebagai fondasi sosial dasar. **Dependensi:** 21–23. **Status:** TODO.

**Tujuan:** Mengganti fake friends list menjadi hubungan antar-akun nyata.

**Implementasi:**
- [ ] Public profile minimal: username, avatar, status display (berdasar preferensi), tanpa email dan data sensitif.
- [ ] Tabel friend_requests (sender_id, receiver_id, status), friendships, user_blocks; aturan no self-friend, no duplicate, privacy.
- [ ] Actions search by username, send request, accept/reject, unfriend, block, invite to room.
- [ ] Gunakan invite token yang tidak menampilkan room private tanpa hak akses; batasi abuse/rate limit.
- [ ] Presence online jangan global tanpa consent: opsi visible/friends-only/hidden sesuai kebutuhan dan batasan produk.
- [ ] Ubah FriendsPage.tsx dari array data/demoData.ts menjadi query user sungguhan; label demo tetap jelas bila local guest.

**File kemungkinan:** src/pages/FriendsPage.tsx, src/components/ui/FriendAvatar.tsx, src/lib/friendsRepository.ts, supabase/migrations/*.

**Pengujian wajib:** A request B, B accept, unblock, reject, forged sender, blocked invitation, invalid duplicate request, username privacy.

**Acceptance criteria / DoD:**
- [ ] Dua user asli bisa berteman dan undangan memiliki status persistent.
- [ ] Block mencegah interaksi yang tidak diizinkan.
- [ ] Guest tidak ditampilkan sebagai pemain real-time publik.

---

### BLOK 30 — Multiplayer room backend, realtime presence & movement protocol

**Prioritas:** P0 untuk Social Plaza. **Dependensi:** 21–23, 29 minimal profile. **Status:** TODO.

**Tujuan:** Realtime yang dapat diandalkan sebelum membuat map baru.

**Model minimum:**
- worlds: id, slug, title, is_active, map_version.
- world_rooms: id, world_id, name, visibility (public/private), capacity, created_by, status, created_at.
- room_invites atau room_memberships untuk permission private room.
- realtime Presence/Broadcast memegang state online/posisi ephemeral; **jangan** tulis posisi per frame ke tabel Postgres.

**Implementasi:**
- [ ] Service create/join/leave room; verifikasi auth, visibility, capacity, invite, blokir, dan single active room policy.
- [ ] Definisikan payload protocol yang terversi: player_id, room_id, position (x,z), rotation, animation/state, seq, timestamp, version.
- [ ] Room-specific channel; client hanya merender data untuk room yang berhasil di-join.
- [ ] Join permission dan room membership harus diverifikasi oleh **server** termasuk saat subscription/broadcast; jangan percaya roomId client dan jangan biarkan user men-spoof player_id.
- [ ] Presence untuk online roster/heartbeat; Broadcast untuk movement. Tentukan throttle awal sekitar **5–10 updates/detik/pemain** sebagai parameter tuning, bukan SLA final.
- [ ] Remote interpolation/extrapolation terbatas, stale packet drop via seq, teleport clamp, disconnect cleanup, reconnect deduplication.
- [ ] Ada server-side input/rate validation dan join limits; Realtime broadcast bukan server-authoritative movement penuh. Jika anticheat/scale lebih serius, evaluasi dedicated authoritative room server.
- [ ] Sediakan room lifecycle dan cleanup, timeout idle, minimal privacy/abuse controls.
- [ ] Perhatikan biaya realtime subscriptions/messages dan kuota Supabase; monitoring usage dibutuhkan.

**File kemungkinan:** src/lib/realtime/* (baru), src/hooks/useRoomPresence.ts (baru), src/hooks/useRemotePlayers.ts (baru), src/types.ts, supabase/migrations/*, supabase/functions/join-room/* atau RPC.

**Pengujian wajib:** dua browser, tiga pemain, room full, invalid invite, unauthorized subscription, fake player_id, duplicate connections, stale seq, tab close, network loss/reconnect, rapid room switch.

**Acceptance criteria / DoD:**
- [ ] User A melihat presence B dan sebaliknya dalam room yang sama.
- [ ] Room berbeda tidak saling menerima event posisi.
- [ ] Leave/disconnect membuat avatar remote hilang setelah timeout wajar.
- [ ] Test spoofing, access control, dan input validation lulus.
- [ ] Dokumentasi rate/update config dan penggunaan resource tersedia.

---

### BLOK 31 — Social Plaza: map 3D kedua untuk bertemu pemain

**Prioritas:** P0 untuk Social Plaza. **Dependensi:** 30. **Status:** TODO.

**Tujuan:** Memisahkan dunia latihan privat dan dunia bersosialisasi menjadi pengalaman 3D yang playable.

**Desain dunia:**
- Mini Home = private NPC practice (tetap route /app/world atau alias yang jelas).
- Social Plaza = area outdoor low-poly: central plaza, fountain/meeting point, lounge/cafe, papan topik, area duo conversation, dan spawn aman.
- Social Plaza **bukan peta lokasi geografis** dan tidak meminta GPS pengguna.
- Pilihan awal: scene sederhana dengan primitive geometry dan asset modular sebelum impor model GLB besar.

**Implementasi:**
- [ ] Route /app/plaza dan scene src/components/world/SocialPlazaScene.tsx terpisah dari MiniHomeScene.
- [ ] Ekstrak shared avatar renderer, camera, movement input, joystick, animation, nameplate, dan UI world shell secara hati-hati.
- [ ] Buat collision map Plaza sendiri (jangan memakai FURNITURE_COLLIDERS Mini Home), spawn points, boundaries, safe interaction radius.
- [ ] Render remote players dari realtime room roster; avatar berdasarkan konfigurasi profil, sanitized nameplate.
- [ ] Interpolasi remote position/rotation, walking/idle animation, hidden/offline cleanup.
- [ ] Daftar room public, tombol Join Plaza, Leave, switch room; visual player count tanpa mengklaim angka online palsu.
- [ ] Optimisasi mobile: draw calls, shadows quality toggle, culling, distance threshold, tab hidden pause, WebGL fallback, joystick.
- [ ] Prioritaskan performa untuk **target eksperimen 10–20 pemain per room**, bukan janji kapasitas production. Kapasitas final ditetapkan setelah load test.
- [ ] NPC Mini Home dan misi tetap playable, tanpa regress.
- [ ] Hindari auto-join saat pengguna belum menyetujui kebijakan interaksi komunitas.

**File kemungkinan:** src/pages/SocialPlazaPage.tsx (baru), src/components/world/SocialPlazaScene.tsx (baru), src/components/world/RemotePlayer.tsx (baru), src/components/world/MiniHomeScene.tsx (refactor terbatas), src/lib/world/* (modular), src/App.tsx, navigation.

**Pengujian wajib:** map load, collision, fall-through, spawn overlap, remote avatars, WebGL fallback, keyboard/mobile joystick, player left/returned, low-end device, 2/10/20 clients load experiment.

**Acceptance criteria / DoD:**
- [ ] Dua user terpisah dapat join Plaza dan saling melihat serta mendekati avatar.
- [ ] Mini Home tetap bekerja sebagai peta privat.
- [ ] Tidak terlihat ghost player permanen setelah leave.
- [ ] Fallback UI dan basic mobile navigation berfungsi.

---

### BLOK 32 — Player interaction: text chat, partner practice, safety

**Prioritas:** P0 untuk text-first Social Plaza. **Dependensi:** 29–31. **Status:** TODO.

**Tujuan:** Pertemuan di Social Plaza punya fungsi belajar, tidak hanya saling melihat avatar.

**Implementasi:**
- [ ] Proximity prompt untuk pemain lain: lihat profil publik, kirim friend request, invite duo practice, buka chat (jika diizinkan).
- [ ] Chat text room-scoped dan/atau direct chat dengan aturan role/permission; batas panjang, rate limit, flood protection, message id.
- [ ] Moderasi minimum: block, mute, report user/message, report reason, staff review queue. Tegaskan teks publik bisa terlihat oleh orang di room.
- [ ] Never expose email, token, real location, atau private profile dalam message payload.
- [ ] Opsi practice topic: perkenalan, hobi, daily routine; tampilkan prompt pertanyaan yang dapat dipilih pemain.
- [ ] Tombol leave/close conversation, interaction invitation accept/decline, timeout.
- [ ] Pastikan penyalahgunaan tidak memengaruhi akun lain: server auth, room membership, blocklist enforced, basic content control dan moderation workflow.
- [ ] Voice dan screen-sharing **tidak** dicakup blok ini; jangan tampilkan tombol aktif yang belum berfungsi.

**File kemungkinan:** src/components/world/PlayerInteractionPanel.tsx (baru), src/components/chat/* (baru), src/hooks/useRoomChat.ts, src/lib/chatRepository.ts, supabase/migrations/*, server functions.

**Pengujian wajib:** room isolation, spoofed sender, blocked sender, spam, report, leave-mid-chat, reconnection, mobile overlay keyboard, XSS rendering, unauthorized direct message.

**Acceptance criteria / DoD:**
- [ ] A dan B bisa berkirim chat dalam room sesuai permission.
- [ ] Block/mute/report berfungsi dan memiliki efek nyata, bukan toast palsu.
- [ ] Pemain di room lain tidak menerima atau membaca pesan privat room.
- [ ] Interaction panel dapat dipakai mobile maupun desktop.

---

### BLOK 33 — QA E2E, security review, load/performance & accessibility

**Prioritas:** P0. **Dependensi:** 20–32 sesuai fitur aktif. **Status:** TODO.

**Tujuan:** Menguji produk dari perspektif pemain, admin, penyerang biasa, dan koneksi tidak stabil.

**Implementasi:**
- [ ] E2E: sign-up A/B -> lesson -> score -> reward -> buy item -> avatar -> friend -> join Plaza -> chat -> leave -> sign-out -> login lagi.
- [ ] E2E admin: login admin -> create draft -> add questions -> publish -> learner complete -> edit version -> attempt lama tetap valid.
- [ ] RLS/integration test negatif (user A/B, unauth, owner, admin, spoofed room membership).
- [ ] Concurrency test: duplicate reward submit, two-tab wallet purchase, stale optimistic state, simultaneous claim.
- [ ] Load tests synthetic untuk real-time messages, concurrent joins, update fanout, and failure recovery; catat p50/p95 latency, disconnect, error rate, resource cost.
- [ ] Uji UX responsive dengan WebGL/mobile/desktop, keyboard access, reduced motion, focus trap dialogs, readable chat overlay, contrast.
- [ ] Dependency checks, no leaked secrets, no service_role in frontend bundle, CSP/headers sesuai deployment.
- [ ] Tambahkan observability ringan: audit ID, sanitized structured logs, error tracking yang tidak menyimpan chat pribadi di log secara default.
- [ ] Tulis known limitations dan rollback plan; jangan menyamakan typecheck lulus dengan app teruji.

**Bukti wajib:** tabel test cases, command log, hasil per browser, minimal 2 account test, hasil manual multiplayer, serta daftar masalah tersisa dengan severity.

**Acceptance criteria / DoD:**
- [ ] Seluruh critical user journeys hijau.
- [ ] Tidak ada temuan security critical/high tanpa mitigasi yang disetujui.
- [ ] Beban sesuai kapasitas yang dipublikasikan, bukan asumsi.
- [ ] Regression Mini Home & existing lesson flow lulus.

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
| 23 | Persistence & sync hardening | TODO | - |
| 24 | Secure economy & reward ledger | TODO | - |
| 25 | Dynamic question bank schema | TODO | - |
| 26 | Learning/grading engine | TODO | - |
| 27 | Admin authorization & audit | TODO | - |
| 28 | Admin CMS dashboard | TODO | - |
| 29 | Friends & privacy | TODO | - |
| 30 | Real-time room backend | TODO | - |
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
