# KKN Padepokan 4 – Backend API

Express.js backend + Admin Panel untuk KKN Kelompok 4 Desa Katekan.

## Struktur
```
be/
├── admin/          ← Admin Panel (HTML/CSS/JS standalone)
│   ├── index.html
│   ├── style.css
│   └── app.js
├── src/
│   ├── index.js          ← Entry point Express
│   ├── config/supabase.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── kegiatanController.js
│   │   ├── beritaAcaraController.js
│   │   └── uploadController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── upload.js
│   ├── routes/
│   │   ├── index.js
│   │   ├── auth.js
│   │   ├── kegiatan.js
│   │   ├── beritaAcara.js
│   │   └── upload.js
│   └── utils/
│       ├── jwt.js
│       └── response.js
├── supabase/schema.sql   ← Jalankan di Supabase SQL Editor
├── .env                  ← Isi dengan kredensial Supabase
├── vercel.json
└── package.json
```

## Setup

### 1. Supabase
- Buat project di [supabase.com](https://supabase.com)
- Jalankan `supabase/schema.sql` di SQL Editor
- Copy URL & keys ke `.env`

### 2. Generate Password Hash
```bash
node -e "import('bcryptjs').then(b => b.default.hash('Admin@KKN2026!', 12).then(h => console.log(h)))"
```
Lalu update hash di `schema.sql` INSERT lagi, atau update langsung via Supabase Table Editor.

### 3. Jalankan Lokal
```bash
npm run dev   # nodemon auto-reload
```
Server: http://localhost:3001

### 4. Admin Panel
Buka `admin/index.html` di browser (atau serve dengan Live Server).
Login dengan email admin (sesuai data di Supabase).

## API Endpoints

| Method | Endpoint | Auth | Keterangan |
|--------|----------|------|------------|
| GET | `/health` | – | Health check |
| POST | `/api/auth/login` | – | Login admin |
| POST | `/api/auth/refresh` | – | Refresh token |
| GET | `/api/auth/me` | ✅ | Profile saya |
| GET | `/api/kegiatan` | – | List kegiatan (publik) |
| POST | `/api/kegiatan` | ✅ | Tambah kegiatan |
| PUT | `/api/kegiatan/:id` | ✅ | Edit kegiatan |
| PATCH | `/api/kegiatan/:id/status` | ✅ | Update status |
| DELETE | `/api/kegiatan/:id` | 👑 | Hapus kegiatan |
| GET | `/api/berita-acara` | ✅ | List BA |
| POST | `/api/berita-acara` | ✅ | Buat BA |
| PATCH | `/api/berita-acara/:id/submit` | ✅ | Ajukan BA |
| PATCH | `/api/berita-acara/:id/approve` | 👑 | Setujui BA |
| POST | `/api/upload/image` | ✅ | Upload gambar |
| POST | `/api/upload/document` | ✅ | Upload dokumen |

👑 = Admin only

## Deploy ke Vercel
```bash
npx vercel --prod
```
Set environment variables di Vercel Dashboard.
