# PRD — Lingoland MVP

## Implementasi Per Blok

Untuk pengerjaan MVP pertama, implementasi dibagi menjadi sepuluh blok kecil agar development bisa dicicil, diuji, dan direview tanpa harus langsung membuat seluruh produk final.

### Blok 1 — Project Foundation

- Scaffold React + TypeScript.
- Gunakan Tailwind CSS sebagai styling utama.
- Setup Vite, lint, typecheck, dan build script.
- Setup struktur folder awal.
- Setup routing dasar.
- Output blok: aplikasi bisa dijalankan dengan halaman placeholder.

### Blok 2 — Design System Dasar

- Tailwind theme untuk warna Lingoland.
- Komponen dasar: button, input, card, badge, progress bar.
- Layout responsive dasar.
- Focus state dan disabled state.
- Output blok: UI primitives siap dipakai semua halaman.

### Blok 3 — Demo Data dan Local State

- Data user demo.
- Data misi.
- Data avatar.
- Data store.
- Data friends preview.
- React Context + `useReducer`.
- Persistence ke `localStorage` dengan key `lingoland_demo_v1`.
- Output blok: state demo bisa dibaca, diubah, disimpan, dan di-reset.

### Blok 4 — Auth dan Route Guard

- Login demo dengan email/password.
- Tombol `Masuk sebagai Demo`.
- Protected route.
- Logout.
- Reset progress demo.
- Output blok: user bisa masuk dan keluar dari aplikasi lokal.

### Blok 5 — App Shell dan Navigasi

- Desktop navigation.
- Mobile top header.
- Mobile bottom navigation.
- Coin, heart, notification, avatar/profile action.
- Active route state.
- Output blok: semua protected page bisa dinavigasi dengan shell konsisten.

### Blok 6 — Product Pages Dasar

- Landing page.
- Dashboard home.
- Learning mission selector.
- Friends preview.
- Profile dasar.
- Output blok: user bisa memahami produk, melihat progress, dan memilih misi.

### Blok 7 — Avatar Customizer

- Avatar procedural low-poly atau placeholder 3D ringan.
- Pilihan skin, hair, top, bottom, shoes, accessory.
- State selected, owned, locked, purchasable, insufficient coins.
- Save avatar ke `localStorage`.
- Output blok: user bisa mengubah avatar dan konfigurasi tersimpan.

### Blok 8 — Store Demo

- Store item avatar.
- Detail item.
- Preview item.
- Pembelian pakai koin demo.
- Validasi koin cukup/tidak cukup.
- Item masuk inventory.
- Output blok: transaksi lokal berjalan tanpa payment asli.

### Blok 9 — Mini Home Playable

- Scene Mini Home 3D low-poly.
- Player avatar.
- Movement keyboard.
- Kontrol mobile.
- Boundary/collision sederhana.
- Tiga NPC tampil di posisi berbeda.
- Proximity prompt.
- Output blok: user bisa berjalan dan mendekati NPC di room.

### Blok 10 — Conversation dan Mission Gameplay

- Conversation panel.
- Suggested sentence.
- Text input fallback.
- Speech recognition fallback.
- Rule-based mission evaluator.
- Update objective progress.
- Reward XP/koin.
- Anti-claim reward berulang.
- Output blok: user bisa menyelesaikan misi dari percakapan dan progress tersimpan.

Setelah Blok 1-10 selesai, baru lanjut ke polish MVP: responsive QA, accessibility QA, README final, visual polish, GLB asset pipeline, dan persiapan backend/realtime.

## Implementasi Post-MVP

Blok 11 ke atas ada di luar scope MVP awal (lihat "Out of Scope"). Ini disepakati ulang untuk menyiapkan versi berikutnya yang menggantikan localStorage dengan backend nyata, dimulai dari Supabase.

### Blok 11 — Supabase Foundation (Auth dan Data Sync)

- Tambah dependency `@supabase/supabase-js`.
- `src/lib/supabaseClient.ts`: client Supabase, nullable/opsional lewat `isSupabaseConfigured` (fallback ke localStorage kalau env kosong).
- `.env.example` dan `.env` untuk `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- `supabase/schema.sql`: tabel `profiles`, `avatar_configs`, `inventory_items`, `mission_progress`, `claimed_rewards` (keyed ke `auth.users.id`), dengan RLS owner-only.
- Konten misi (mission/objective/keyword/reward) tetap hardcoded di `src/data/demoData.ts` — tidak dipindah ke DB.
- `src/lib/supabaseAuth.ts`: sign-in email/password, self-heal sign-up khusus akun demo, sign-out.
- `src/lib/supabaseSync.ts`: fetch/push/clear remote state per user.
- `demoReducer.ts`: action `HYDRATE_REMOTE` untuk merge data remote ke state lokal.
- `DemoContext.tsx`: efek sync ke Supabase yang di-serialize (in-flight + dirty flag) supaya push tidak saling tumpang tindih; kegagalan sync tampil lewat `storageMeta`.
- `useDemoAuth.ts`: login/logout/reset jadi async, hydrate dari remote setelah sign-in.
- Output blok: akun demo login lewat Supabase Auth, progress (user, avatar, inventory, mission progress, claimed rewards) tersinkron ke Postgres, localStorage tetap jalan sebagai fallback offline.

**Prasyarat manual di dashboard Supabase (belum otomatis dari kode):**

- Jalankan `supabase/schema.sql` di SQL Editor.
- Matikan "Confirm email" di Authentication > Providers > Email, supaya akun demo (`demo@lingoland.app`) tidak butuh klik link konfirmasi.

**Status:** kode selesai, lint/typecheck/build hijau. Verifikasi manual end-to-end (login demo → avatar → mission → reload dari device lain) belum dijalankan — menunggu dua prasyarat dashboard di atas.

### Blok 12 — Auth Session Sync

Sekarang `DemoContext` hanya tahu status login dari mirror `localStorage`, bukan dari sesi Supabase yang sebenarnya. Kalau token Supabase expired, direvoke, atau di-signout dari tab/device lain, app tetap menganggap user login sampai ada write yang gagal.

- Pasang `supabase.auth.onAuthStateChange` di `DemoContext` atau hook baru `useSupabaseSession`.
- Saat event `SIGNED_OUT` atau token refresh gagal: dispatch `LOGOUT`, bersihkan mirror lokal yang relevan.
- Saat event `TOKEN_REFRESHED`/`SIGNED_IN` dari sesi yang masih valid saat reload: pastikan `state.user.id` tetap konsisten dengan `session.user.id` (bukan cuma dari mirror localStorage).
- Loading indicator saat context masih menunggu status sesi awal dari Supabase (`supabase.auth.getSession()`) sebelum menentukan render login vs protected route.
- Output blok: status login di UI selalu sinkron dengan sesi Supabase yang valid, bukan cuma tebakan dari localStorage.

**Status:** selesai. `resolveHydratePayload` diekstrak ke `supabaseSync.ts` supaya dipakai bareng oleh `useDemoAuth` (login) dan listener sesi baru (tanpa duplikasi logic). `DemoContext` sekarang expose `isSessionChecked`; `ProtectedRoute` menahan render sampai sesi awal selesai dicek, supaya tidak ada flash render protected page atau redirect keliru sebelum status sesi Supabase diketahui. Lint/typecheck/build hijau. Verifikasi manual (matikan wifi, expire token, signout dari tab lain) belum dijalankan.

### Blok 13 — Reset Progress Lifecycle Fix

Bug yang sudah diketahui dari Blok 11: setelah **Reset Progress Demo**, `user.id` di state lokal balik ke `"demo-user"` (default lokal), sehingga `isRemoteBacked()` jadi `false` walau sesi Supabase user itu masih aktif. Akibatnya perubahan berikutnya (avatar baru, misi baru) **berhenti tersinkron ke Supabase** sampai user logout-login ulang.

- Setelah `clearRemoteState` + dispatch `RESET_PROGRESS`, re-seed baris remote (`profiles`, `avatar_configs`, dst) dengan `user.id` Supabase yang masih aktif, bukan `"demo-user"`.
- Pastikan `HYDRATE_REMOTE` dipanggil ulang (atau state di-patch langsung) supaya `user.id` tetap uuid Supabase pasca-reset.
- Tambah test manual: reset progress → ubah avatar → reload → avatar baru harus tetap ada (bukan balik ke sebelum reset).
- Output blok: reset progress tidak memutus sinkronisasi Supabase selama sesi masih aktif.

**Status:** selesai. `resetProgress` di `useDemoAuth.ts` sekarang dispatch `HYDRATE_REMOTE` ulang dengan uuid Supabase setelah `RESET_PROGRESS`, supaya efek sync di `DemoContext` tetap aktif pasca-reset. Lint/typecheck/build hijau. Test manual (poin ketiga di atas) belum dijalankan.

### Blok 14 — Loading dan Error State Supabase di UI

`isSyncing` dari `useDemoAuth` dan `storageMeta` dari `useDemoStorage` sudah ada di data layer, tapi belum dipakai maksimal di semua tempat yang PRD wajibkan (loading state login, error state jelas kalau sync gagal).

- `LoginPage`: pastikan spinner/disabled state jelas selama `isSyncing` (bukan cuma `isLoading` lokal).
- `AvatarPage` dan `StorePage`: `storageMeta.status === "unavailable"` sudah dirender sebagai teks status — ubah jadi banner error yang eksplisit dan actionable ("Perubahan belum tersinkron ke server, coba lagi"), bukan cuma teks status mentah.
- Tambah pesan spesifik untuk kasus RLS/permission error (401/403 dari Supabase) supaya beda dari sekadar offline.
- Output blok: kegagalan sync Supabase terlihat jelas oleh user, sesuai requirement "Error state" di PRD, bukan silent fail di background.

### Blok 15 — README dan Dokumentasi Supabase

`README.md` belum diperbarui sejak Blok 11 menambah dependency dan env var baru — melanggar Documentation Requirements PRD ("Jika menambahkan environment variable, update README dan jelaskan setiap variable").

- Tambah section "Setup Supabase" di README: cara isi `.env`, cara jalankan `supabase/schema.sql`, cara matikan "Confirm email".
- Jelaskan bahwa konten misi tetap hardcoded, hanya data user/progress yang ada di Supabase.
- Update bagian localStorage di README: jelaskan sekarang localStorage berfungsi sebagai mirror/fallback offline, bukan satu-satunya sumber data lagi (kalau Supabase dikonfigurasi).
- Jalankan manual verification checklist penuh dari section "Verification" PRD dengan Supabase aktif.
- Output blok: dokumentasi akurat mencerminkan state project setelah integrasi Supabase, siap untuk siapa pun yang clone repo dari awal.

### Blok 16 — Learning Path sebagai Lesson Terpisah (Duolingo-style)

Klarifikasi scope: **Learning Path** dan **World/Mini Home** adalah dua fitur yang beda, dengan **route web yang beda**, dan tidak saling mengunci satu sama lain.

- `/app/learn` — khusus mission card (World/NPC), tidak berubah dari fitur asli Blok 6/10.
- `/app/lessons` (baru) — halaman Learning Path sendiri: daftar bab bergaya kursus (Bab 1, 2, 3, ... — termasuk bab "Segera Hadir" supaya penomoran tetap jalan terus seiring nambah konten), masing-masing berupa card klik dengan status (Terbuka/Terkunci/Selesai/Segera Hadir) dan progress bar keseluruhan.
- `/app/lessons/:unitId` (baru) — exercise runner per bab.
- `/app/learn` punya banner CTA (bukan sekadar link kecil) yang mengarah ke `/app/lessons`, supaya Learning Path terasa sebagai fitur utama, bukan fitur sampingan.

- `types.ts`: tambah `LessonUnit`, `LessonExercise`, `LessonExerciseType` (`"multiple-choice" | "word-order"`), `LessonChoiceOption`; `DemoState` tambah `completedLessonIds: string[]`.
- `data/demoData.ts`: `lessonUnits` — 3 unit soal (`lesson-intro`, `lesson-hobby`, `lesson-weekend`), materi diambil dari kosakata misi yang sudah ada (`relatedMissionId` cuma label topik, bukan dependency gameplay). `learningPath` diganti dari `missionId` jadi `lessonUnitId`.
- `state/selectors.ts`: `selectLessonUnitSummaries` — unlock linear murni dari `completedLessonIds` (unit N terbuka kalau unit N-1 selesai), independen dari `missionProgress`. `selectLearningPath` dirombak pakai ini, bukan status misi.
- `state/demoReducer.ts`: action `COMPLETE_LESSON` — guard anti-klaim-ulang sama seperti `CLAIM_REWARD` (replay lesson diperbolehkan buat latihan, tapi XP cuma diberikan sekali).
- `pages/LessonPage.tsx` (baru): exercise runner — progress bar per soal, feedback benar/salah dengan jawaban yang benar ditampilkan, layar completion dengan skor dan label "Latihan Ulang" kalau sudah pernah selesai (reward nol, konsisten sama aturan reward mission).
- `pages/LessonsPage.tsx` (baru): halaman hub Learning Path — penomoran "Bab N" berjalan terus (termasuk bab coming-soon), progress ringkasan di header.
- `pages/LearnPage.tsx`: hanya mission card + banner CTA prominent ke `/app/lessons`.
- Reward lesson (`rewardXp: 15` per unit) sengaja lebih kecil dari reward mission (50/70/90 XP) supaya tidak bersaing dengan ekonomi reward utama — statusnya "persiapan sebelum misi", bukan pengganti misi.
- Progress lesson **belum** disinkronkan ke Supabase (cuma di `DemoState` + localStorage mirror) — beda dari user/avatar/inventory/mission/reward yang sudah punya tabel sejak Blok 11. Kalau nanti mau disinkron juga, perlu tabel `lesson_progress` baru di `supabase/schema.sql`.
- Output blok: Learning Path dan World jadi dua route dan dua halaman yang benar-benar terpisah, dihubungkan cuma lewat satu CTA banner.

**Status:** selesai dan diverifikasi manual end-to-end via Playwright dua kali (setelah pemisahan route final): login demo → `/app/learn` (cuma mission card + banner) → klik "Buka Learning Path" → `/app/lessons` (Bab 1-5) → klik Bab 1 → jawab 2 soal pilihan ganda + 1 susun kata → 3/3 benar → +15 XP → kembali ke `/app/lessons` → Bab 1 "Selesai", Bab 2 otomatis "Terbuka". Mission card di `/app/learn` tidak berubah sama sekali. Nol console error di kedua run. Lint/typecheck/build hijau.

### Blok 17 — Logo dan Favicon

- `index.html`: tambah `<link rel="icon" type="image/png" href="/logo.png" />`.
- `components/layout/AppLayout.tsx`: brand mark di app header (muncul di semua halaman `/app/*`, termasuk `/app/home`) diganti dari kotak huruf "L" jadi `<img src="/logo.png">`.
- `styles.css`: `.brand-mark` disesuaikan dari `span` teks jadi `img` (`object-contain`, ukuran tetap `h-9 w-9`).
- **Belum diubah:** wordmark teks "LINGO/LAND" di landing page (`LandingPage.tsx`, class `.landing-logo`) — itu treatment tipografi yang sengaja dibuat beda, bukan logo mark yang sama. Kalau mau diseragamkan juga pakai `logo.png`, perlu konfirmasi karena itu ubah desain hero landing page.

### Blok 18 — Halaman Top Up Koin (Preview, Belum Ada Payment Gateway)

PRD Out of Scope eksplisit melarang **Payment gateway** dan **Subscription**. Blok ini menambah preview UI-nya saja, bukan transaksi sungguhan — konsisten dengan aturan "jangan membuat tombol palsu yang terlihat aktif tetapi tidak melakukan apa pun" (tombol beli memang terlihat, tapi jelas disabled dan berlabel jujur).

- `pages/TopUpPage.tsx` (baru), route `/app/topup`: 4 paket koin mock (harga ilustratif, badge promo seperti "Paling Laris"/"Hemat Maksimal"), tombol beli **disabled** berlabel "Segera Hadir", disclaimer eksplisit bahwa payment gateway belum ada, plus link balik ke cara dapat koin sungguhan (misi di Belajar / lesson di Learning Path).
- `components/layout/AppLayout.tsx`: balance koin di header (yang tadinya `<span>` statis) diganti jadi `<button>` yang navigate ke `/app/topup`.
- `styles.css`: tambah `.balance-button` (hover/cursor state) untuk balance yang sekarang clickable.
- Output blok: user bisa lihat preview monetisasi tanpa produk mengklaim fitur yang belum ada.

### Blok 19 — Avatar Chat (Scaffold Gemini via Supabase Edge Function, Belum Aktif)

PRD Out of Scope eksplisit melarang **LLM integration** dan section "Mission Evaluation" bilang *"Tidak perlu AI. Gunakan rule-based keyword matching."* Ini keputusan sadar untuk mulai menyiapkan fondasi AI companion chat **di luar** sistem evaluasi misi yang sudah ada (rule-based evaluator di World/Mini Home tidak disentuh) — mirip keputusan Supabase di Blok 11, dicatat sebagai evolusi Post-MVP, bukan diam-diam mengubah PRD.

Fitur ini terpisah dari NPC misi (Bintang/Lala/Benny) — ini "ngobrol bebas" dengan avatar milik pemain sendiri, diakses dari Profile, bukan dari Mini Home.

**Kenapa perlu Edge Function, bukan panggil Gemini langsung dari browser:** app ini SPA murni tanpa server sendiri. Supabase anon key aman ditaruh di frontend karena dilindungi RLS — API key Gemini TIDAK didesain untuk publik; kalau ditaruh di `VITE_*` env var, key itu ke-bundle ke JS publik dan bisa dicuri siapa saja. Edge Function menyimpan key sebagai Supabase secret di server, frontend cuma manggil endpoint function-nya.

- `supabase/functions/avatar-chat/index.ts` (baru): Deno Edge Function, terima riwayat pesan, panggil Gemini API pakai `GEMINI_API_KEY` dari Supabase secret, punya system prompt persona "teman latihan speaking yang suportif". **Belum di-deploy** — baru scaffold di repo.
- `src/lib/avatarChatClient.ts` (baru): client helper `sendAvatarChatMessage()` yang manggil Edge Function via `supabase.functions.invoke`. Kalau function belum di-deploy/key belum diset, fallback ke pesan jujur *"Fitur ngobrol AI belum aktif..."* — bukan pura-pura jawab atau crash.
- `pages/AvatarChatPage.tsx` (baru), route `/app/avatar-chat`: chat UI penuh (avatar player + riwayat pesan + input), badge "Segera Hadir", penjelasan bahwa backend proxy sudah disiapkan tapi menunggu API key.
- `pages/ProfilePage.tsx`: card baru "Ngobrol dengan Avatar" dengan CTA ke halaman chat.
- Tidak menyentuh `tsconfig.app.json` scope (`include: ["src"]`) — kode Deno di `supabase/functions/` sengaja di luar typecheck Vite.
- Output blok: struktur/UI lengkap dan teruji (dicoba end-to-end lewat Playwright — kirim pesan, dapat fallback jujur, nol crash), AI beneran aktif menunggu dua langkah manual:

**Prasyarat manual buat mengaktifkan (belum dikerjakan):**

1. `supabase secrets set GEMINI_API_KEY=<key-kamu>` di project Supabase yang sama.
2. `supabase functions deploy avatar-chat` (butuh Supabase CLI + login).

## Context

Kembangkan MVP web bernama **Lingoland**, yaitu platform latihan speaking bahasa Inggris berbasis avatar dan virtual room.

Lingoland membantu pengguna yang memahami teori bahasa Inggris tetapi masih takut berbicara, tidak memiliki partner speaking, atau khawatir dinilai ketika melakukan kesalahan.

MVP harus memiliki satu akun demo yang dapat digunakan untuk mencoba seluruh core flow produk:

```text
Login
→ masuk dashboard
→ memilih misi speaking
→ mengatur avatar
→ masuk ke Mini Home
→ menggerakkan karakter
→ mendekati karakter lain
→ memulai percakapan
→ menyelesaikan misi
→ memperoleh XP dan koin
→ progress tersimpan
```

MVP ini belum menggunakan multiplayer sungguhan.

Karakter lain di dalam room adalah scripted NPC atau simulated learner. Jangan mengklaim bahwa NPC tersebut merupakan pengguna real-time.

Project harus menghasilkan frontend yang benar-benar interaktif dan playable, bukan hanya landing page statis.

Sebelum melakukan perubahan:

1. Baca seluruh struktur repository.
2. Periksa `package.json`.
3. Identifikasi package manager:
   - npm
   - pnpm
   - yarn
   - bun
4. Identifikasi framework dan versi yang digunakan.
5. Pelajari:
   - struktur routing
   - sistem styling
   - pola komponen
   - state management
   - icon library
   - existing utilities
   - linting
   - TypeScript configuration
   - build scripts
6. Jangan melakukan rewrite total.
7. Pertahankan pola coding dan stack yang sudah ada.
8. Buat perubahan kecil, modular, dan mudah direview.

Jika repository masih kosong atau hanya berisi starter project, gunakan arsitektur yang paling sesuai dengan stack yang sudah terpasang.

---

## Product Summary

### Nama

Lingoland

### Tagline

Berani Bicara, Satu Percakapan Sekaligus.

### Value Proposition

Platform latihan speaking berbasis avatar yang memungkinkan pengguna belajar melalui misi percakapan dan simulasi interaksi di dunia virtual tanpa membutuhkan perangkat VR.

### Masalah Utama

- Pengguna takut salah ketika berbicara bahasa Inggris.
- Pengguna tidak memiliki partner speaking yang konsisten.
- Platform pembelajaran terlalu berfokus pada teori dan kuis.
- Praktik speaking sering terasa formal dan menegangkan.

### Solusi MVP

- Avatar yang dapat dikustomisasi.
- Satu virtual room bernama Mini Home.
- Karakter dapat bergerak menggunakan keyboard atau kontrol sentuh.
- Tiga NPC yang dapat diajak berinteraksi.
- Tiga misi speaking sederhana.
- Percakapan melalui pilihan dialog, text input, dan optional browser speech recognition.
- Sistem XP, koin, level, dan penyimpanan progress lokal.
- Satu akun demo yang dapat digunakan langsung.

---

## Goal

Tujuan utama MVP adalah membuktikan core experience Lingoland:

1. Pengguna dapat masuk menggunakan akun demo.
2. Pengguna dapat memahami tujuan belajar.
3. Pengguna dapat memilih misi speaking.
4. Pengguna dapat mengatur avatar.
5. Pengguna dapat memasuki virtual room.
6. Pengguna dapat menggerakkan karakter.
7. Pengguna dapat menemukan dan mendekati NPC.
8. Pengguna dapat memulai percakapan.
9. Pengguna dapat menyelesaikan objective percakapan.
10. Pengguna memperoleh reward.
11. Progress tetap tersimpan setelah halaman dimuat ulang.

MVP dianggap berhasil ketika alur tersebut dapat dimainkan dari awal sampai selesai tanpa error.

---

## Target User

### Target Utama

- Pelajar.
- Mahasiswa.
- Profesional muda.
- Pemula yang takut berbicara bahasa Inggris.
- Pengguna yang membutuhkan latihan speaking ringan.

### Persona Utama

**Nama:** Raka  
**Umur:** 20 tahun  
**Kondisi:** Mahasiswa yang memahami grammar dasar, tetapi gugup ketika berbicara.

**Kebutuhan:**

- Ruang latihan yang tidak menghakimi.
- Topik percakapan yang terarah.
- Kalimat bantuan.
- Feedback sederhana.
- Progress yang terlihat.

---

## Scope

### In Scope

MVP wajib memiliki:

1. Public landing page.
2. Login akun demo.
3. Dashboard aplikasi.
4. Learning mission selector.
5. Avatar customizer sederhana.
6. Satu virtual room bernama Mini Home.
7. Character movement.
8. Collision atau movement boundary sederhana.
9. Tiga NPC interaktif.
10. Conversation system.
11. Optional microphone atau speech-to-text.
12. Text input fallback.
13. XP system.
14. Coin system.
15. Level progress.
16. Local persistence.
17. Friends preview.
18. Store sederhana.
19. Profile.
20. Responsive desktop dan mobile.
21. Loading, empty, error, success, dan disabled state.
22. Reset demo progress.

### Out of Scope

Jangan membuat:

- Multiplayer real-time.
- WebSocket.
- Socket.IO.
- WebRTC antar pengguna.
- Real voice room.
- Backend production.
- Database production.
- Payment gateway.
- Subscription.
- AI pronunciation scoring.
- LLM integration.
- Matchmaking real-time.
- Friend request real-time.
- Private server.
- Admin dashboard.
- Email verification.
- Google OAuth.
- Social login.
- NFT.
- Blockchain.
- Dunia virtual lebih dari satu room.

Fitur di luar scope harus dihilangkan atau diberi label **Segera Hadir**. Jangan membuat tombol palsu yang terlihat aktif tetapi tidak melakukan apa pun.

---

## Demo Account

Sediakan satu akun demo.

```text
Email: demo@lingoland.app
Password: Demo123!
```

Alternatif akses cepat:

```text
Masuk sebagai Demo
```

Ketika user memilih **Masuk sebagai Demo**, aplikasi langsung membuat sesi lokal tanpa meminta input ulang.

### Data Awal Akun Demo

**Nama:** Raka Demo  
**Username:** raka.demo  
**Level:** 2  
**XP:** 120 dari 300  
**Koin:** 15.000  
**Heart:** 5  
**Streak:** 3 hari  
**Room unlocked:** Mini Home

**Avatar awal:**

- skin tone medium
- rambut pendek hitam
- hoodie ungu
- celana gelap
- sneakers putih

**Mission status:**

- Perkenalan Diri: tersedia
- Hobi Favorit: tersedia
- Rencana Akhir Pekan: terkunci sampai misi pertama selesai

**Friend preview:**

- Afiana
- Benny
- Lala
- Lulu
- Bintang
- Moker

Data akun demo boleh disimpan melalui `localStorage`.

Jangan menganggap mekanisme login lokal ini aman untuk production.

Tampilkan keterangan kecil pada halaman login:

> Akun demo disimpan secara lokal dan hanya digunakan untuk mencoba prototype.

Sediakan action:

```text
Reset Progress Demo
```

Reset harus mengembalikan:

- XP
- koin
- level
- mission progress
- avatar
- inventory
- streak
- current room state

ke kondisi awal.

---

## Core Gameplay Loop

Core flow wajib:

1. Pengguna login.
2. Pengguna melihat dashboard.
3. Pengguna memilih misi speaking.
4. Pengguna membaca objective.
5. Pengguna memilih atau mengatur avatar.
6. Pengguna menekan **Masuk Mini Home**.
7. Room menampilkan loading state.
8. Avatar muncul di titik spawn.
9. Pengguna bergerak menggunakan:
   - WASD
   - arrow key
   - virtual joystick pada mobile
10. Pengguna mendekati NPC.
11. Interaction prompt muncul.
12. Pengguna menekan:
   - `E` pada desktop
   - tombol interaksi pada mobile
13. Conversation panel terbuka.
14. Pengguna menggunakan:
   - suggested sentence
   - text input
   - optional microphone
15. NPC memberikan respons.
16. Mission objective diperbarui.
17. Setelah objective selesai, pengguna memperoleh:
   - XP
   - koin
18. Reward modal muncul.
19. Dashboard dan progress diperbarui.
20. Progress tersimpan setelah reload.

---

## Information Architecture

### Public Routes

#### `/`

Landing page.

#### `/login`

Halaman login akun demo.

### Protected App Routes

#### `/app`

Redirect ke `/app/home`.

#### `/app/home`

Dashboard utama.

#### `/app/learn`

Daftar misi dan learning path.

#### `/app/world`

Mini Home virtual room.

#### `/app/avatar`

Avatar customizer.

#### `/app/friends`

Friends dan community preview.

#### `/app/store`

Item store sederhana.

#### `/app/profile`

Profile dan progress user.

Gunakan route guard lokal.

Jika user belum memiliki demo session dan membuka protected route, arahkan ke `/login`.

---

## Navigation

### Desktop Navigation

Navbar sticky.

**Left:**

- logo Lingoland

**Center:**

- Beranda
- Belajar
- Dunia
- Teman
- Toko

**Right:**

- coin balance
- heart balance
- notification
- avatar
- profile dropdown

**Profile dropdown:**

- Profil Saya
- Reset Progress Demo
- Keluar

### Mobile Navigation

**Top header:**

- logo
- coin balance
- notification

**Bottom navigation:**

- Beranda
- Belajar
- Dunia
- Teman
- Profil

Active route harus jelas.

Minimum touch target: `44px`.

---

## Landing Page Requirements

### Hero

**Eyebrow:**

```text
LATIHAN SPEAKING TANPA TAKUT SALAH
```

**Heading:**

```text
Masuk ke Dunia Virtual dan Mulai Berani Bicara
```

**Description:**

```text
Belajar bahasa Inggris melalui percakapan, misi, dan interaksi bersama avatar yang membuat latihan terasa lebih nyaman.
```

**Primary CTA:**

```text
Coba Akun Demo
```

**Secondary CTA:**

```text
Lihat Mini Home
```

**Hero visual:**

- Mini Home 3D.
- Avatar utama.
- Dua karakter lain.
- Conversation bubble.
- Mission objective.
- Reward preview.

### Benefit Section

Empat benefit:

1. Berlatih Tanpa Tekanan.
2. Percakapan Sesuai Situasi Nyata.
3. Belajar Bersama Karakter Interaktif.
4. Dapatkan XP, Koin, dan Reward.

### How It Works

1. Buat Avatar.
2. Pilih Misi.
3. Masuk ke Mini Home.
4. Mulai Percakapan.

### Mini Home Preview

Jelaskan bahwa pada MVP:

- pengguna dapat berjalan
- bertemu NPC
- memulai percakapan
- menyelesaikan misi

Label:

```text
Prototype Interaksi
```

### Final CTA

**Heading:**

```text
Mulai Percakapan Pertamamu Hari Ini
```

**CTA:**

```text
Masuk sebagai Demo
```

---

## Dashboard Home

Dashboard harus menampilkan informasi berguna, bukan grafik dekoratif.

### Header

**Greeting:**

```text
Halo, Raka.
```

**Supporting copy:**

```text
Lanjutkan latihan speaking-mu hari ini.
```

### User Metrics

Tampilkan:

- Level
- XP
- Koin
- Streak
- Heart

### Continue Learning

**Mission:** Perkenalan Diri

**Objective:**

```text
Perkenalkan dirimu dalam minimal tiga kalimat.
```

**Reward:**

```text
50 XP dan 20 koin.
```

**CTA:**

```text
Mulai Misi
```

### Friends Online

Tampilkan maksimal enam avatar.

Setiap friend memiliki:

- nama
- online state
- current activity

Contoh:

```text
Bintang sedang di Mini Home.
```

### Mini Home Preview

Tampilkan thumbnail room.

**CTA:**

```text
Masuk Room
```

### Daily Challenge

**Title:**

```text
Daily Speaking Challenge
```

**Objective:**

```text
Ucapkan tiga kalimat tentang aktivitas hari ini.
```

**Reward:**

```text
30 XP dan 10 koin.
```

---

## Learning Missions

Buat tiga misi.

### Mission 1 — Perkenalan Diri

**Status awal:** Available  
**NPC:** Bintang

**Objective:**

- sampaikan nama
- sampaikan asal atau kampus
- sampaikan satu hal yang disukai

**Suggested sentences:**

- My name is Raka.
- I am from Surabaya.
- I like playing games.

**Reward:**

- 50 XP
- 20 koin

### Mission 2 — Hobi Favorit

**Status awal:** Available  
**NPC:** Lala

**Objective:**

- tanyakan hobi NPC
- ceritakan hobi sendiri
- beri satu pertanyaan lanjutan

**Suggested sentences:**

- What do you like to do?
- My hobby is drawing.
- How often do you do it?

**Reward:**

- 70 XP
- 30 koin

### Mission 3 — Rencana Akhir Pekan

**Status awal:** Locked  
**Unlock condition:** Mission 1 selesai  
**NPC:** Benny

**Objective:**

- tanyakan rencana akhir pekan
- jelaskan rencana sendiri
- tutup percakapan dengan sopan

**Suggested sentences:**

- What will you do this weekend?
- I will visit my family.
- That sounds great. See you later.

**Reward:**

- 90 XP
- 40 koin

### Mission States

Wajib ada:

- available
- active
- completed
- locked
- failed atau incomplete

Setiap misi menampilkan:

- title
- description
- NPC
- difficulty
- objective
- reward
- progress

---

## Learning Path

Buat learning path sederhana:

1. Dasar Percakapan
2. Perkenalan Diri
3. Hobi dan Minat
4. Percakapan Sehari-hari
5. Interview Kerja — Segera Hadir
6. Presentasi Profesional — Segera Hadir

Gunakan status:

- completed
- active
- unlocked
- locked
- coming soon

Jangan membuat statistik palsu.

---

## Avatar Customizer

Avatar wajib dibuat dari code-generated low-poly geometry atau modular asset yang ringan.

Jika project menggunakan React atau Next.js, gunakan:

- `three`
- `@react-three/fiber`
- `@react-three/drei`

Tambahkan dependency hanya jika belum tersedia dan memang diperlukan.

Tidak perlu menggunakan model manusia realistis.

### Avatar Parts

**Skin tone:**

- Light
- Medium
- Tan
- Dark

**Hair:**

- Short Black
- Bob Brown
- Curly Dark

**Top:**

- Hoodie Lavender
- Kaos Basic
- Jaket Kampus

**Bottom:**

- Celana Gelap
- Jeans Biru
- Rok Casual

**Shoes:**

- Sneakers Putih
- Sneakers Hitam

**Accessories:**

- Kacamata Bulat
- Topi Mini Home
- Tidak Ada

### Avatar States

Wajib ada:

- selected
- owned
- locked
- purchasable
- insufficient coins
- saving
- saved
- disabled save

Avatar dapat:

- diputar
- dilihat dari depan dan belakang
- menggunakan idle animation sederhana

Simpan avatar config ke `localStorage`.

---

## Store

Store hanya mendukung transaksi lokal menggunakan koin demo.

### Products

1. Hoodie Lavender — 300 koin
2. Jaket Varsity — 450 koin
3. Kacamata Bulat — 180 koin
4. Topi Mini Home — 250 koin
5. Sneakers Hitam — 350 koin

### Transaction Flow

1. Pengguna membuka item.
2. Detail item tampil.
3. Preview item pada avatar.
4. Pengguna menekan **Beli**.
5. Validasi jumlah koin.
6. Jika cukup:
   - kurangi koin
   - masukkan item ke inventory
   - tampilkan success state
7. Jika tidak cukup:
   - tampilkan error jelas
   - disable purchase button bila diperlukan

Tidak ada pembayaran uang asli.

Tampilkan:

```text
Item ini hanya menggunakan koin demo.
```

---

## Mini Home Virtual Room

Mini Home adalah fitur utama MVP.

### Environment

Buat satu scene low-poly berisi:

**Indoor:**

- ruang tamu
- sofa
- meja
- rak buku
- kursi
- area belajar
- pintu
- dinding sederhana

**Outdoor:**

- taman kecil
- pohon
- pagar putih
- bangku
- rumput

Scene tidak perlu sangat besar.

Prioritaskan:

- readability
- performance
- walking space
- interaction area

### Player Avatar

Player memiliki:

- model low-poly
- nameplate
- idle state
- walking state
- speaking state
- interaction state

Nama:

```text
Raka Demo
```

### NPC

Sediakan tiga NPC.

#### Bintang

**Posisi:** Ruang tamu  
**Mission:** Perkenalan Diri  
**Personality:** Ramah dan membantu pemula.

#### Lala

**Posisi:** Area belajar  
**Mission:** Hobi Favorit  
**Personality:** Aktif dan komunikatif.

#### Benny

**Posisi:** Taman  
**Mission:** Rencana Akhir Pekan  
**Personality:** Santai dan informal.

NPC memiliki:

- nameplate
- idle animation
- talking indicator
- proximity interaction
- scripted responses

### Movement

**Desktop:**

- W
- A
- S
- D
- arrow keys

**Interaction:**

- E

**Camera:**

- follow camera
- smooth movement
- limited zoom
- camera tidak menembus objek utama

**Mobile:**

- virtual joystick
- interaction button
- microphone button
- chat button

### Collision

Tidak perlu physics kompleks.

Gunakan:

- room boundary
- simple bounding box
- collision sederhana pada dinding atau furniture penting

Karakter tidak boleh:

- keluar dari room
- menembus dinding utama
- jatuh dari scene

### Interaction Radius

Interaction prompt hanya muncul ketika player berada dekat NPC.

Contoh:

```text
Tekan E untuk menyapa Bintang
```

Pada mobile:

```text
Tepuk untuk menyapa Bintang
```

Prompt hilang ketika player menjauh.

---

## Conversation System

Percakapan harus dapat dimainkan.

### Conversation UI

Panel menampilkan:

- nama NPC
- portrait/avatar
- current objective
- dialog history
- suggested sentences
- text input
- microphone action
- send button
- end conversation

### Interaction Modes

#### Suggested Sentence

Pengguna memilih salah satu kalimat.

Kalimat langsung masuk ke dialog.

#### Text Input

Pengguna dapat mengetik kalimat sendiri.

**Minimum:** 2 karakter  
**Maximum:** 200 karakter

#### Optional Speech Recognition

Jika browser mendukung Web Speech API:

- minta izin mikrofon
- mulai speech recognition
- hasil transkripsi masuk ke text input
- pengguna tetap menekan kirim

Jika browser tidak mendukung, tampilkan:

```text
Speech recognition belum didukung browser ini. Gunakan input teks.
```

Jangan menjadikan fitur microphone sebagai satu-satunya cara menyelesaikan misi.

### Mission Evaluation

Tidak perlu AI.

Gunakan rule-based keyword matching.

Contoh Mission 1:

**Name keywords:**

- my name
- i am
- call me

**Origin keywords:**

- from
- live in
- study at

**Interest keywords:**

- like
- love
- enjoy
- hobby

Mission selesai jika tiga kategori terpenuhi.

Gunakan normalization:

- lowercase
- trim
- remove punctuation
- basic keyword matching

Jangan mengklaim bahwa sistem menilai pronunciation atau grammar secara akurat.

### NPC Response

Contoh:

```text
Player:
“My name is Raka.”

Bintang:
“Nice to meet you, Raka. Where are you from?”

Player:
“I am from Surabaya.”

Bintang:
“Surabaya sounds interesting. What do you like to do?”

Player:
“I like playing games.”

Bintang:
“That is great. You completed the introduction mission.”
```

### Conversation Completion

Ketika misi selesai:

- update progress
- tambah XP
- tambah koin
- tampilkan completion animation ringan
- tampilkan reward modal
- tandai mission completed

Reward tidak boleh diberikan dua kali untuk misi yang sama.

Jika user mengulang misi:

- tampilkan label **Latihan Ulang**
- reward ulang bernilai nol atau lebih kecil
- jangan melakukan infinite coin exploit

---

## XP and Level System

Gunakan sistem sederhana:

| Level | XP |
|---|---:|
| 1 | 0–99 |
| 2 | 100–299 |
| 3 | 300–599 |
| 4 | 600–999 |
| 5 | 1000+ |

Akun demo dimulai:

```text
Level 2
120 XP
```

Progress bar harus menghitung target level berikutnya.

Ketika level naik:

- tampilkan modal
- tampilkan level baru
- jangan menggunakan animasi berlebihan

---

## State Management

Gunakan state management yang sudah ada di repository.

Jika tidak ada:

- gunakan React Context + `useReducer`
- atau state solution ringan yang sudah terinstal

Jangan menambah Zustand, Redux, atau dependency lain tanpa kebutuhan jelas.

### State Minimum

**AuthState:**

- isAuthenticated
- currentUser

**UserState:**

- profile
- coin
- heart
- XP
- level
- streak

**AvatarState:**

- currentConfiguration
- ownedItems

**MissionState:**

- activeMissionId
- missionProgress
- completedMissionIds
- claimedRewards

**RoomState:**

- playerPosition
- nearestNpc
- conversationState

**StoreState:**

- selectedItem
- purchaseStatus

### Persist ke localStorage

- auth session
- user progress
- avatar config
- inventory
- completed missions
- claimed rewards

### Jangan Persist

- temporary modal state
- loading state
- current keyboard input

Gunakan versioned storage schema agar mudah di-reset.

Contoh key:

```text
lingoland_demo_v1
```

---

## Suggested Data Models

Gunakan TypeScript interface atau type yang deskriptif.

```ts
type MissionStatus =
  | "locked"
  | "available"
  | "active"
  | "completed";

interface DemoUser {
  id: string;
  name: string;
  username: string;
  email: string;
  level: number;
  xp: number;
  coins: number;
  hearts: number;
  streakDays: number;
}

interface AvatarConfig {
  skinToneId: string;
  hairId: string;
  topId: string;
  bottomId: string;
  shoesId: string;
  accessoryId: string | null;
}

interface StoreItem {
  id: string;
  name: string;
  category: "hair" | "top" | "bottom" | "shoes" | "accessory";
  price: number;
  isOwnedByDefault: boolean;
}

interface MissionObjective {
  id: string;
  label: string;
  keywords: string[];
  isCompleted: boolean;
}

interface Mission {
  id: string;
  title: string;
  description: string;
  npcId: string;
  rewardXp: number;
  rewardCoins: number;
  status: MissionStatus;
  objectives: MissionObjective[];
}

interface NpcCharacter {
  id: string;
  name: string;
  personality: string;
  position: [number, number, number];
  missionId: string;
}

interface ConversationMessage {
  id: string;
  sender: "player" | "npc" | "system";
  content: string;
  createdAt: number;
}
```

Hindari penggunaan `any`.

---

## UI/UX Requirements

### Visual Direction

Karakter:

- low-poly
- friendly
- youthful
- tidak terlalu realistis
- bukan fantasy game
- bukan crypto aesthetic

### Color Tokens

| Token | Value |
|---|---|
| Primary | `#7868F8` |
| Supporting Purple | `#6757E8` |
| Light Lavender | `#F3F1FF` |
| Background | `#F7F7FA` |
| Dark Text | `#27262D` |
| Secondary Text | `#6F6C78` |
| Success | `#35B86B` |
| Coin | `#F4C84A` |

Gunakan flat color.

Hindari:

- gradient berlebihan
- glassmorphism
- shadow besar
- floating card terlalu banyak
- decorative chart
- CTA berulang
- testimonial palsu
- logo partner palsu
- statistik pengguna palsu
- ikon random
- copywriting hiperbolik

### Typography

Gunakan font yang sudah ada.

Jika belum tersedia, gunakan system sans-serif atau font web yang sudah terpasang.

**Heading:** kuat, ramah, mudah dibaca.  
**Body:** minimum 16px pada desktop jika memungkinkan.

### Spacing

Gunakan spacing scale konsisten.

```text
4
8
12
16
24
32
48
64
96
```

### Radius

Gunakan radius konsisten.

```text
8px
12px
16px
24px
```

Jangan membuat seluruh elemen berbentuk kapsul.

### Buttons

Variant:

- primary
- secondary
- ghost
- danger
- icon

State:

- default
- hover
- focus
- active
- loading
- disabled

### Feedback States

Wajib ada:

**Loading:**

- login loading
- room loading
- avatar loading
- mission loading

**Empty:**

- belum ada activity
- belum ada mission completed
- belum ada item tambahan

**Error:**

- login salah
- local storage error
- microphone permission denied
- speech recognition unavailable
- purchase failed
- room initialization failed

**Success:**

- login berhasil
- avatar tersimpan
- item dibeli
- mission selesai
- reward diterima
- demo progress di-reset

**Disabled:**

- mission locked
- insufficient coins
- save avatar tanpa perubahan
- submit dialog kosong
- microphone unsupported

---

## Responsive Requirements

### Desktop

- max content width 1200–1280px
- sticky desktop navigation
- virtual room area besar
- conversation panel dapat muncul di kanan
- keyboard control hint terlihat

### Tablet

- navigation lebih ringkas
- conversation panel dapat menjadi overlay
- avatar customizer dapat stack
- room tetap readable

### Mobile

- persistent bottom navigation
- compact top header
- virtual joystick
- interaction button
- microphone button
- chat button
- room tidak overflow horizontal
- item avatar menggunakan horizontal scroll
- dialog panel menggunakan bottom sheet
- minimum touch target 44px
- text tidak terlalu kecil

---

## Accessibility Requirements

Wajib:

- semantic HTML
- heading hierarchy
- visible focus state
- keyboard navigation
- `aria-label` pada icon-only button
- label form yang jelas
- contrast yang cukup
- status tidak hanya dibedakan melalui warna
- alt text pada gambar
- reduced motion support jika memungkinkan
- Escape untuk menutup dialog
- Tab navigation pada conversation controls

3D canvas harus memiliki fallback text:

```text
Mini Home membutuhkan WebGL. Gunakan browser modern untuk mencoba room.
```

---

## Performance Requirements

Target:

- landing page tetap cepat sebelum scene 3D dimuat
- lazy load virtual room
- lazy load avatar customizer
- hindari texture besar
- gunakan code-generated geometry jika memungkinkan
- batasi jumlah light
- batasi shadow
- batasi NPC menjadi tiga
- hindari post-processing berat
- pause animation ketika tab tidak aktif jika memungkinkan
- gunakan memoization secara wajar
- jangan melakukan rerender seluruh scene pada setiap perubahan UI

Fallback:

Jika WebGL gagal, tampilkan preview statis dan pesan error yang jelas.

---

## Security and Honesty Requirements

Walaupun hanya prototype:

- jangan menyimpan password production
- akun demo hanya simulasi lokal
- sanitize text input sebelum dirender
- jangan menggunakan `dangerouslySetInnerHTML` tanpa alasan
- batasi panjang input
- jangan membuat klaim bahwa voice, multiplayer, atau AI sudah tersedia
- jangan menyebut NPC sebagai pengguna real-time
- jangan mengirim data ke layanan eksternal tanpa kebutuhan
- jangan meminta data sensitif pengguna

Tampilkan label:

```text
Prototype Interaksi
```

Tampilkan keterangan:

```text
Karakter lain dalam versi demo merupakan simulasi.
```

---

## Suggested Component Structure

Sesuaikan dengan repository yang ada.

```text
src/
├── app/
│   ├── page
│   ├── login
│   └── app/
│       ├── home
│       ├── learn
│       ├── world
│       ├── avatar
│       ├── friends
│       ├── store
│       └── profile
├── components/
│   ├── layout/
│   ├── navigation/
│   ├── auth/
│   ├── dashboard/
│   ├── missions/
│   ├── avatar/
│   ├── room/
│   │   ├── MiniHomeScene
│   │   ├── PlayerAvatar
│   │   ├── NpcAvatar
│   │   ├── CharacterController
│   │   ├── InteractionPrompt
│   │   ├── MobileJoystick
│   │   └── RoomLoadingState
│   ├── conversation/
│   ├── rewards/
│   ├── store/
│   └── feedback/
├── data/
│   ├── demo-user
│   ├── missions
│   ├── npc
│   ├── store-items
│   └── friends
├── hooks/
│   ├── useDemoAuth
│   ├── useDemoStorage
│   ├── useCharacterControls
│   ├── useSpeechRecognition
│   └── useMissionProgress
├── lib/
│   ├── mission-evaluator
│   ├── level-calculator
│   ├── storage
│   └── validation
├── state/
├── types/
└── public/
```

Jangan memaksakan struktur ini jika repository sudah memiliki struktur yang berbeda.

---

## Documentation Requirements

Update `README.md` dengan:

1. Deskripsi Lingoland.
2. Scope MVP.
3. Fitur yang tersedia.
4. Fitur yang belum tersedia.
5. Demo credentials.
6. Cara menjalankan project.
7. Package manager.
8. Script yang tersedia.
9. Penjelasan virtual room.
10. Penjelasan localStorage.
11. Cara reset progress demo.
12. Browser recommendation.
13. Keterbatasan speech recognition.
14. Struktur folder utama.
15. Catatan bahwa multiplayer belum tersedia.

Demo credentials di README:

```text
Email: demo@lingoland.app
Password: Demo123!
```

Jika menambahkan environment variable:

- update `.env.example`
- jelaskan setiap variable di README

Jika tidak ada environment variable baru:

- jangan membuat `.env.example` palsu

---

## Quality Rules

Wajib:

- readable
- modular
- consistent
- responsive
- accessible
- TypeScript-safe
- tidak menggunakan `any` sembarangan
- tidak menonaktifkan lint rule
- tidak menyimpan debug `console.log`
- tidak meninggalkan dead code
- tidak menggunakan placeholder lorem ipsum
- tidak membuat fake feature
- tidak membuat tombol nonaktif terlihat aktif
- tidak menambah dependency tanpa alasan
- tidak mengubah API atau struktur lama tanpa kebutuhan
- tidak menghapus fitur lama tanpa alasan jelas
- tidak membuat file terlalu besar
- pisahkan UI, logic, config, mock data, dan helpers
- hindari duplikasi logic

Tidak boleh ada:

- `console.log` debug
- TODO tanpa penjelasan
- kode mati
- unused import
- unused variable
- hardcoded style yang berulang
- magic number yang sulit dipahami
- fake API request
- fake loading dengan timeout panjang tanpa kebutuhan
- testimonial palsu
- jumlah pengguna palsu
- klaim real-time yang tidak benar

---

## Verification

Setelah implementasi:

1. Konfirmasi package manager.
2. Jalankan install jika diperlukan.
3. Jalankan script yang tersedia.

Minimal:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Sesuaikan dengan package manager repository.

Jika script tidak tersedia:

- jangan mengarang hasil
- sebutkan bahwa script tidak tersedia

Untuk npm:

- minimal jalankan `npm run build` jika script build tersedia

### Manual Verification

#### Authentication

- demo login berhasil
- direct demo login berhasil
- logout berhasil
- protected route bekerja
- reset progress bekerja

#### Dashboard

- user metrics tampil
- coin dan XP sesuai data
- CTA menuju mission dan room bekerja

#### Avatar

- customization bekerja
- save bekerja
- reload mempertahankan avatar
- locked item tidak dapat digunakan

#### Store

- pembelian mengurangi koin
- item masuk inventory
- insufficient coin state bekerja
- item tidak dapat dibeli dua kali

#### Mini Home

- scene berhasil dimuat
- karakter dapat bergerak
- boundary bekerja
- karakter tidak keluar room
- NPC dapat didekati
- interaction prompt muncul
- conversation panel terbuka
- keyboard control bekerja
- mobile control tersedia

#### Conversation

- suggested sentence bekerja
- text input bekerja
- empty submission ditolak
- keyword objective bekerja
- NPC response sesuai
- mission dapat selesai
- reward hanya diberikan satu kali
- speech recognition memiliki fallback

#### Persistence

- reload mempertahankan progress
- reset mengembalikan default state
- corrupted localStorage memiliki fallback aman

#### Responsive

Test minimal:

- 360px
- 390px
- 768px
- 1024px
- 1440px

#### Accessibility

- keyboard focus terlihat
- form memiliki label
- modal dapat ditutup
- icon button memiliki `aria-label`
- contrast memadai

Jika build gagal:

- perbaiki sampai berhasil
- atau jelaskan blocker spesifik dan bukti error

Jangan menganggap pekerjaan selesai sebelum build berhasil, kecuali project memang tidak memiliki build script.

---

## Acceptance Criteria

MVP diterima jika seluruh kondisi berikut terpenuhi:

1. Landing page tersedia dan responsive.
2. Login demo tersedia.
3. Button **Masuk sebagai Demo** bekerja.
4. Protected route bekerja.
5. Dashboard menampilkan akun demo.
6. Avatar dapat dikustomisasi.
7. Avatar config tersimpan setelah reload.
8. Store dapat membeli item dengan koin demo.
9. Koin berkurang sesuai harga item.
10. Mini Home dapat dibuka.
11. Mini Home menggunakan scene 3D atau visual interactive equivalent yang playable.
12. Player dapat bergerak menggunakan keyboard.
13. Player memiliki kontrol mobile.
14. Player tidak dapat keluar dari boundary.
15. Tiga NPC tampil di room.
16. Proximity interaction bekerja.
17. Conversation panel bekerja.
18. Suggested sentence bekerja.
19. Text input bekerja.
20. Speech recognition memiliki fallback.
21. Mission 1 dapat diselesaikan.
22. Mission 2 dapat diselesaikan.
23. Mission 3 terkunci sesuai kondisi.
24. Mission completion menambah XP.
25. Mission completion menambah koin.
26. Reward tidak dapat diklaim berulang.
27. Progress tersimpan di localStorage.
28. Reset demo progress bekerja.
29. Loading state tersedia.
30. Empty state tersedia.
31. Error state tersedia.
32. Success state tersedia.
33. Disabled state tersedia.
34. Tidak ada console error saat core flow digunakan.
35. Tidak ada debug `console.log`.
36. Tidak ada TypeScript error.
37. Tidak ada horizontal overflow pada mobile.
38. README diperbarui.
39. Build berhasil.
40. Semua fitur yang belum real diberi label jujur sebagai prototype atau segera hadir.

---

## Implementation Priority

### Phase 1 — Foundation

- repository audit
- routing
- design tokens
- demo data
- local storage
- auth demo
- app shell
- navigation

### Phase 2 — Product Flow

- dashboard
- mission selector
- mission details
- learning path
- rewards
- profile

### Phase 3 — Avatar and Store

- avatar model
- customizer
- inventory
- store
- coin transaction

### Phase 4 — Mini Home

- 3D scene
- character controller
- mobile controller
- NPC
- interaction detection
- conversation panel

### Phase 5 — Mission Gameplay

- keyword evaluator
- scripted responses
- mission progress
- reward logic
- persistence

### Phase 6 — Quality

- responsive
- accessibility
- loading/error states
- performance
- tests
- README
- lint
- typecheck
- build

---

## Final Response

Setelah selesai, berikan laporan dengan format berikut.

### 1. Ringkasan Perubahan

Jelaskan fitur yang berhasil dibuat.

### 2. Daftar File yang Diubah

Tampilkan file baru dan file yang dimodifikasi beserta fungsi singkatnya.

### 3. Cara Menjalankan Project

Berikan command sesuai package manager yang digunakan.

### 4. Akun Demo

```text
Email: demo@lingoland.app
Password: Demo123!
```

### 5. Core Flow yang Bisa Dicoba

```text
Login
→ pilih misi
→ atur avatar
→ masuk Mini Home
→ dekati NPC
→ mulai percakapan
→ selesaikan misi
→ terima reward
```

### 6. Hasil Verification

Laporkan hasil:

- install
- lint
- typecheck
- test
- build

Jangan mengklaim berhasil jika command belum dijalankan.

### 7. Fitur yang Belum Tersedia

Sebutkan dengan jujur:

- multiplayer
- WebRTC
- backend
- database
- AI pronunciation scoring

### 8. Risiko dan Langkah Lanjutan

Jelaskan:

- browser compatibility
- WebGL performance
- speech recognition support
- kebutuhan multiplayer backend
- kebutuhan moderasi voice room

---

## MVP Decision

Untuk versi pertama, jangan memaksakan pengguna demo bertemu pengguna manusia sungguhan.

Buat experience yang benar-benar selesai:

```text
Satu akun demo
+ satu karakter playable
+ satu Mini Home
+ tiga NPC
+ tiga misi
+ percakapan scripted
+ XP dan koin
+ avatar customizer
+ progress tersimpan
```

Dengan scope ini, produk sudah bisa didemokan sebagai vertical slice Lingoland dan core value-nya terlihat jelas.
