# QA & Release Checklist

Centang tiap item pada **staging** sebelum rilis ke production. Catat tanggal, penguji, dan browser.

## A. Otomatis (CI / lokal)

- [ ] `npm run lint` — 0 error
- [ ] `npm run typecheck` — 0 error
- [ ] `npm run test` — semua hijau (saat ini 19 file / 111 tes)
- [ ] `npm run build` sukses
- [ ] `grep -r "service_role" dist/` kosong; tidak ada secret di repo (`git log -p | grep -i secret` ditinjau)

> Catatan: tes unit/integrasi di repo memakai mock; **tidak** menguji RLS/RPC pada database nyata. Bagian B–D wajib dilakukan manual di staging.

## B. Migrasi

- [ ] `supabase db push` pada DB staging **bersih** sukses berurutan (0 → 9)
- [ ] Backup prod diambil sebelum push prod

## C. Alur kritis (2 akun: A dan B, 2 browser)

- [ ] Register A & B, login, logout, login lagi (sesi tetap)
- [ ] Lesson → skor → reward → koin/XP persisten setelah refresh
- [ ] Submit reward dua kali / dua tab → tidak ganda
- [ ] Beli item di dua tab bersamaan → saldo tidak negatif
- [ ] Avatar tersimpan
- [ ] Friend request A→B, B terima; block menghapus pertemanan
- [ ] A & B join Plaza → saling melihat, mendekat → prompt interaksi muncul
- [ ] Chat A↔B terkirim; pesan `<script>` tampil sebagai teks
- [ ] Mute B oleh A → pesan B tidak tampil di A; unmute memulihkan
- [ ] Block B oleh A → avatar B hilang di A
- [ ] Report B → baris muncul di `moderation_reports` (status `pending`)
- [ ] Undangan latihan duo: terima / tolak / selesai
- [ ] Tutup tab B → avatar B hilang di A ≤ ~8 dtk (tidak ada ghost)
- [ ] Mini Home `/app/world`: NPC & misi tetap jalan

## D. Keamanan negatif (staging)

- [ ] User biasa memanggil RPC admin → ditolak
- [ ] User A membaca `wallet_transactions` / profil privat user B via API → kosong/ditolak
- [ ] Unauth mengakses tabel → ditolak
- [ ] Join room private tanpa invite code → ditolak; room penuh → ditolak
- [ ] `/admin` oleh non-admin → redirect

## E. UX & aksesibilitas

- [ ] Desktop (Chrome, Firefox, Edge) & mobile (Android Chrome, iOS Safari)
- [ ] WebGL dimatikan → fallback tampil
- [ ] Navigasi keyboard pada modal & chat; fokus tidak bocor ke WASD saat mengetik
- [ ] Joystick mobile + tombol interaksi bekerja
- [ ] Tab disembunyikan → render berhenti, kembali normal saat dibuka

## F. Deep-link

- [ ] Refresh langsung di `/app/plaza`, `/app/plaza/<id>`, `/admin`, `/app/world` tidak 404

## G. Sign-off

| Tanggal | Penguji | Env | Hasil | Isu tersisa (severity) |
|---|---|---|---|---|
| | | | | |
