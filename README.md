# Lingoland

Lingoland adalah prototype web untuk latihan speaking bahasa Inggris berbasis avatar dan virtual room. Fokus MVP-nya adalah alur yang bisa dimainkan dari awal sampai selesai: login demo, pilih misi, atur avatar, masuk Mini Home, mendekati NPC, ngobrol, lalu dapat XP dan koin yang tersimpan lokal.

## Ringkasan Produk

Tagline: **Berani Bicara, Satu Percakapan Sekaligus.**

Lingoland membantu pengguna yang sudah paham teori bahasa Inggris tetapi masih takut berbicara, tidak punya partner latihan, atau ingin latihan dalam suasana yang lebih aman. Versi ini masih prototype, jadi NPC di room adalah simulasi, bukan pengguna real-time.

## Fitur yang Sudah Tersedia

- Landing page interaktif.
- Login demo dan tombol **Masuk sebagai Demo**.
- Protected route untuk halaman aplikasi.
- Dashboard utama dengan progress, friends preview, dan mission shortcut.
- Learning mission selector.
- Avatar customizer dengan penyimpanan ke `localStorage`.
- Store demo dengan transaksi koin lokal.
- Mini Home 3D dengan kontrol keyboard dan kontrol mobile.
- NPC interaktif dengan proximity prompt.
- Conversation panel dengan suggested sentence, text input, dan fallback speech recognition.
- XP, level, koin, heart, dan progress lokal.
- Reset progress demo.

## Fitur yang Belum Tersedia

- Multiplayer real-time.
- WebRTC antar pengguna.
- Backend production.
- Database production.
- Payment gateway.
- AI pronunciation scoring.
- Voice room real-time.

## Demo Account

```text
Email: demo@lingoland.app
Password: Demo123!
```

Tersedia juga tombol cepat:

- Masuk sebagai Demo

## Cara Menjalankan Project

Project ini memakai **npm**.

```bash
npm install
npm run dev
```

Script yang tersedia:

- `npm run dev` untuk menjalankan Vite dev server.
- `npm run build` untuk build produksi.
- `npm run lint` untuk menjalankan ESLint.
- `npm run typecheck` untuk TypeScript check.
- `npm run test` untuk menjalankan typecheck dalam mode test script saat ini.

## Verifikasi

Minimal yang disarankan:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Cara Reset Progress Demo

Masuk ke aplikasi, buka menu profil, lalu pilih **Reset Progress Demo**. Reset akan mengembalikan:

- XP
- koin
- level
- mission progress
- avatar
- inventory
- streak
- state room saat ini

## Penyimpanan Lokal

Progress demo disimpan di browser menggunakan `localStorage` dengan key `lingoland_demo_v1`.

Data yang disimpan:

- sesi demo lokal
- progress user
- avatar config
- inventory
- completed mission
- claimed rewards

Data sementara seperti state modal atau loading tidak disimpan.

## Virtual Room

Mini Home adalah satu ruang virtual low-poly yang dapat dijelajahi. Player bisa bergerak dengan keyboard di desktop, atau joystick virtual di mobile. Saat mendekati NPC, prompt interaksi muncul dan conversation panel bisa dibuka.

## Speech Recognition

Fitur mikrofon bersifat opsional. Jika browser mendukung Web Speech API, hasil transkrip bisa masuk ke input teks. Jika tidak didukung, user tetap bisa menyelesaikan misi lewat teks.

## Browser Recommendation

Gunakan browser modern yang mendukung WebGL. Jika WebGL tidak tersedia, room akan menampilkan fallback yang menjelaskan keterbatasan tersebut.

## Local Project Structure

```text
src/
  components/
    layout/
    missions/
    navigation/
    three/
    ui/
    world/
  data/
  hooks/
  lib/
  pages/
  state/
```

## Catatan Penting

- Ini adalah prototype interaksi, bukan produk produksi.
- Karakter lain dalam versi demo merupakan simulasi.
- Multiplayer belum tersedia.
- Login demo hanya simulasi lokal dan tidak aman untuk production.