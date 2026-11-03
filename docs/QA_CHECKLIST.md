# QA & Release Checklist

Centang tiap item pada **staging / Supabase proyek** sebelum demonstrasi live atau rilis ke production. Catat tanggal, penguji, dan browser.

## A. Otomatis (CI / lokal)

- [x] `npm run lint` — 0 error
- [x] `npm run typecheck` — 0 error
- [x] `npm run test` — semua hijau (20 file / 124 tes unit & regresi)
- [x] `npm run build` sukses
- [x] Tidak ada `service_role` key atau secret di bundle (`dist/`) maupun repository

> Catatan: tes otomatis di repository berjalan menggunakan Vitest dengan mock Supabase untuk kecepatan dan isolasi CI. Verifikasi terhadap PostgreSQL/RLS nyata dan Realtime multi-browser wajib dijalankan mengikuti Bagian B–D di bawah ini.

## B. Migrasi Database (Supabase)

- [ ] Terapkan migrasi `000000` s/d `000013` secara berurutan (atau jalankan `supabase/schema.sql` di Supabase SQL Editor)
- [ ] Verifikasi tabel `mission_objective_definitions` terisi 9 objektif dan fungsi `complete_lesson_atomic` sudah tidak ada
- [ ] Backup database diambil sebelum menerapkan perubahan pada proyek produksi

## C. Alur Kritis Demonstrasi (2–5 Akun Nyata, Multi-Browser)

- [ ] Register akun nyata A & B, login, logout, login kembali (sesi dan profil masing-masing tetap terpisah)
- [ ] Kerjakan lesson di `/app/lessons` → skor dievaluasi oleh `grade_lesson_attempt_atomic` → XP bertambah satu kali dan persisten setelah refresh
- [ ] Ulangi lesson yang sudah selesai → tampil sebagai latihan ulang tanpa XP ganda (`already_rewarded = true`)
- [ ] Putuskan koneksi saat klik Selesai di lesson → tampil pesan error jujur dan tombol *Coba Kirim Lagi*, tanpa kelulusan palsu
- [ ] Selesaikan percakapan NPC di `/app/world` → objektif diverifikasi server (`verify_mission_objective_atomic`) → klaim hadiah koin & XP berhasil satu kali
- [ ] Beli item di `/app/store` → saldo koin berkurang secara atomik dan item dapat dipakai di `/app/avatar`
- [ ] Friend request A→B di `/app/friends`, B terima; block menghapus pertemanan
- [ ] A & B masuk `/app/plaza` (setujui pedoman) → `join_world_room` sukses tanpa error RLS `room_memberships`, kedua avatar saling terlihat dan bergerak real-time
- [ ] Kirim pesan chat A↔B → status pesan berubah ke terkirim, pesan `<script>` disanitasi sebagai teks biasa
- [ ] Mute/unmute, block, report, dan undangan latihan duo berfungsi
- [ ] Tutup tab B atau keluar room → avatar B hilang di layar A ≤ ~8 detik
- [ ] Admin: buka `/admin`, buat & publish soal baru → soal tampil di Learning Path learner

## D. Keamanan Negatif (Staging / Supabase)

- [ ] User biasa memanggil RPC admin → ditolak oleh `is_admin(auth.uid())`
- [ ] Upaya menulis langsung ke `lesson_progress`, `claimed_rewards`, atau `inventory_items` dari klien → ditolak oleh RLS
- [ ] Memanggil `claim_mission_reward_atomic` sebelum objektif selesai → ditolak (`MISSION_INCOMPLETE`)
- [ ] Join room private tanpa kode undangan valid atau room penuh → `join_world_room` mengembalikan `ok: false` dan klien tidak subscribe ke channel Realtime
- [ ] Akses `/admin` oleh non-admin → diarahkan kembali oleh `AdminRoute`

## E. UX & Aksesibilitas

- [ ] Desktop (Chrome, Firefox, Edge) & mobile (Android Chrome, iOS Safari)
- [ ] WebGL dimatikan → pesan fallback tampil tanpa crash
- [ ] Navigasi keyboard pada modal & chat; fokus tidak bocor ke WASD saat mengetik chat
- [ ] Joystick mobile + tombol interaksi bekerja

## F. Deep-link

- [ ] Refresh langsung di `/app/plaza`, `/app/plaza/<id>`, `/admin`, `/app/world` tidak menghasilkan 404

## G. Sign-off

| Tanggal | Penguji | Env | Hasil | Isu tersisa (severity) |
|---|---|---|---|---|
| | | | | |
