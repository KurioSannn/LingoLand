# SOP Moderasi, Abuse Report, Pemulihan Akun & Retensi Data

> Dokumen kebijakan operasional awal. Sesuaikan dengan kebijakan hukum/produk resmi sebelum rilis publik.

## 1. Prinsip

- Chat Plaza bersifat **publik di dalam room**; pemain diberi tahu lewat pedoman komunitas yang wajib disetujui sebelum join.
- Chat saat ini **tidak disimpan** di server (broadcast ephemeral). Artinya laporan tidak otomatis menyertakan bukti pesan; moderator mengandalkan keterangan (`notes`), `room_id`, dan identitas terlapor. Jika perlu bukti, itu butuh pengembangan lanjutan (persist pesan dengan retensi pendek).
- Tidak ada voice/screen-share.

## 2. Alur laporan

1. Pemain: Panel Interaksi → tab *Keamanan* → **Laporkan** → pilih alasan (`spam`, `harassment`, `inappropriate`, `hate_speech`, `other`) + catatan opsional.
2. Tersimpan di `moderation_reports` (`status = pending`).
3. Moderator/admin meninjau antrean `pending` (query di `ADMIN_ONBOARDING.md`).
4. Keputusan:

| Tingkat | Contoh | Tindakan |
|---|---|---|
| Ringan | spam sekali, kata kasar ringan | `dismissed` atau peringatan |
| Sedang | pelecehan berulang | `actioned` + peringatan tertulis; pertimbangkan pembatasan |
| Berat | ujaran kebencian, konten seksual, ancaman | `actioned` + suspend akun (lihat §3) |

5. Target SLA internal (usulan): pending < 48 jam; berat < 24 jam.
6. Catat keputusan (status + catatan internal) agar dapat diaudit.

## 3. Menangguhkan akun

Belum ada fitur suspend di aplikasi. Prosedur manual sementara:

- Nonaktifkan user di Supabase Dashboard → Authentication → Users → *Ban user*.
- Opsional: hapus keanggotaan room aktif: `delete from public.room_memberships where user_id = '<uuid>';`
- Catat alasan & tanggal. Jangan hapus data akun saat penangguhan.

## 4. Kontrol mandiri pemain

- **Mute:** menyembunyikan pesan pemain tertentu di sisi pemain itu.
- **Block:** memutus pertemanan dan menyembunyikan avatar/pesan; ditegakkan juga di server untuk friend request.
- Pemain dapat memakai keduanya tanpa persetujuan moderator.

## 5. Pemulihan akun

- Lupa password: alur `/forgot-password` (Supabase Auth reset email).
- Akun terkunci/diblokir keliru: admin melakukan *unban* di dashboard Auth setelah verifikasi (verifikasi lewat email terdaftar; jangan minta password).
- Progres (XP, koin, avatar) tidak dihapus saat suspend/unban.

## 6. Retensi & penghapusan data (usulan awal)

| Data | Retensi | Catatan |
|---|---|---|
| Profil, progres, inventory, ledger koin | selama akun aktif | ledger dipertahankan untuk audit ekonomi |
| `moderation_reports` | 12 bulan setelah ditutup | tinjau berkala |
| `admin_audit_logs` | 12–24 bulan | bukti tindakan admin |
| Chat Plaza | tidak disimpan | ephemeral |
| Posisi/presence | tidak disimpan | ephemeral |

Permintaan penghapusan akun: verifikasi identitas → hapus user di Supabase Auth (cascade menghapus data terkait yang ber-FK `on delete cascade`). Pertahankan hanya data yang wajib secara hukum, dalam bentuk teranonimkan. Dokumentasikan tanggal penghapusan.

## 7. Kontak & eskalasi

Tentukan sebelum rilis publik: PIC moderasi, kanal laporan (email/form), dan eskalasi untuk konten ilegal/ancaman keselamatan. (Belum ditetapkan — isi oleh pemilik produk.)
