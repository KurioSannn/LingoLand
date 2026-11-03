# Admin Onboarding

## 1. Memberi role admin

Role disimpan di `public.user_roles` dan **tidak bisa** diubah dari klien. Berikan role lewat SQL Editor Supabase (service role/dashboard), setelah user mendaftar:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'admin@contoh.com'
on conflict (user_id, role) do nothing;
```

Cabut:

```sql
delete from public.user_roles
where role = 'admin' and user_id = (select id from auth.users where email = 'admin@contoh.com');
```

Gunakan akun admin terpisah (bukan akun belajar pribadi) dengan password kuat. Batasi jumlah admin seminimal mungkin.

## 2. Masuk dashboard

Login → buka `/admin`. Non-admin diarahkan keluar.

## 3. Mengelola kurikulum (CMS)

1. Buat lesson/unit sebagai **draft**.
2. Tambah soal + opsi + kunci jawaban (kunci disimpan di tabel terpisah, tidak terlihat learner).
3. **Publish** — hanya konten published yang terlihat learner.
4. Mengedit soal membuat versi baru; attempt lama tetap valid terhadap versi yang dikerjakan.
5. Setiap aksi admin tercatat di `admin_audit_logs` (siapa, apa, kapan).

## 4. Meninjau laporan moderasi

```sql
select id, created_at, reporter_id, reported_id, reason, notes, room_id, status
from public.moderation_reports
where status = 'pending'
order by created_at;
```

Ubah status setelah ditinjau (`reviewed`, `dismissed`, `actioned`):

```sql
update public.moderation_reports set status = 'actioned' where id = '<uuid>';
```

Prosedur lengkap: lihat `SOP_MODERATION.md`.

## 5. Hal yang tidak boleh dilakukan

- Jangan membagikan `service_role` key atau menaruhnya di frontend/Vercel `VITE_*`.
- Jangan mengubah koin/XP pemain langsung tanpa catatan alasan (gunakan RPC/ledger bila tersedia, dan catat).
- Jangan menyalin data privat pemain (email, dsb.) ke chat/tiket publik.
