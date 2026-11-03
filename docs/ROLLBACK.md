# Rollback, Disable Feature & Kembali ke Mode Demo

## Prinsip

Rollback tidak boleh menghapus data akun. Urutan: **nonaktifkan fitur → rollback frontend → (terakhir) pulihkan DB**.

## 1. Rollback frontend (cepat, aman)

Vercel → Deployments → pilih deployment stabil sebelumnya → **Promote to Production** (instant rollback). DB tidak berubah.

Atau revert commit:

```bash
git revert <sha>   # mis. blok 31–32: 9ce8877, 009a05d
git push
```

## 2. Menonaktifkan fitur tertentu

| Gejala | Tindakan |
|---|---|
| Abuse di Plaza/chat | Hapus route `plaza` di `src/App.tsx` + tombol "Ke Social Plaza" di `WorldPage.tsx`, redeploy. Opsional tutup room: `update public.world_rooms set status = 'closed';` |
| Admin disalahgunakan | `delete from public.user_roles where role='admin' and user_id=...` |
| Anomali reward/koin | Ambil backup; tinjau `wallet_transactions`; koreksi lewat migrasi forward-fix |
| Biaya Realtime melonjak | Tutup room (`status='closed'`) atau nonaktifkan route Plaza |

## 3. Kembali ke mode demo stabil

Jika produksi (Supabase) bermasalah:

1. Di Vercel, hapus/kosongkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` pada scope Production → redeploy.
2. App berjalan **mode demo/tamu** (progres di `localStorage`, fitur sosial disimulasikan). Data akun di Supabase **tidak tersentuh**.
3. Setelah masalah beres, pulihkan env dan redeploy.

Catatan: progres yang dibuat user di mode demo tersimpan lokal di browser dan **tidak otomatis** tersinkron ke akun.

## 4. Rollback database

Migrasi tidak otomatis reversible.

1. Utamakan **forward-fix**: buat migrasi baru yang memperbaiki masalah.
2. Jika data rusak: restore backup (Supabase Backups/PITR) — idealnya ke project staging dulu untuk verifikasi, lalu rencanakan cutover.
3. Jangan mengedit atau menghapus file migrasi yang sudah diterapkan.

## 5. Checklist insiden

- [ ] Catat waktu & gejala
- [ ] Nonaktifkan fitur terdampak
- [ ] Rollback frontend bila perlu
- [ ] Komunikasikan ke tester/pengguna
- [ ] Analisis akar masalah, tulis di `CHANGELOG.md`/postmortem
