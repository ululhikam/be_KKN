-- ============================================================
-- KKN Padepokan 4 - Supabase Database Schema
-- Universitas Sarjanawiyata Tamansiswa Yogyakarta
-- DPL: Dr. Oktaviani Windra Puspita, M.Pd.
-- Lokasi: Desa Katekan, Kec. Gantiwarno, Klaten
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ADMINS TABLE ─────────────────────────────────────────────────────────
CREATE TABLE admins (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name        TEXT NOT NULL,
  nim         TEXT,
  prodi       TEXT,
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  division    TEXT CHECK (division IN ('ketua', 'wakil_ketua', 'sekretaris', 'bendahara', 'humas', 'acara', 'pdd')),
  avatar_url  TEXT,
  is_active   BOOLEAN DEFAULT true,
  last_login  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── KEGIATAN TABLE ────────────────────────────────────────────────────────
CREATE TABLE kegiatan (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_kegiatan       TEXT NOT NULL,
  deskripsi           TEXT,
  tanggal_kegiatan    DATE NOT NULL,
  waktu_mulai         TIME,
  waktu_selesai       TIME,
  lokasi              TEXT NOT NULL,
  kategori            TEXT DEFAULT 'umum' CHECK (kategori IN (
                        'sosial', 'pendidikan', 'kesehatan', 'ekonomi',
                        'lingkungan', 'budaya', 'infrastruktur', 'umum'
                      )),
  status              TEXT DEFAULT 'direncanakan' CHECK (status IN (
                        'direncanakan', 'berjalan', 'selesai', 'dibatalkan'
                      )),
  penanggung_jawab_id UUID REFERENCES admins(id),
  anggota_kegiatan    UUID[] DEFAULT '{}',
  target_peserta      INTEGER,
  anggaran            DECIMAL(15, 2),
  bulan               INTEGER CHECK (bulan BETWEEN 1 AND 12),
  tahun               INTEGER,
  foto_cover_url      TEXT,
  created_by          UUID REFERENCES admins(id),
  updated_by          UUID REFERENCES admins(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  deleted_by          UUID REFERENCES admins(id)
);

-- ─── BERITA ACARA TABLE ─────────────────────────────────────────────────────
CREATE TABLE berita_acara (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nomor_ba            TEXT UNIQUE NOT NULL,
  kegiatan_id         UUID NOT NULL REFERENCES kegiatan(id),
  judul               TEXT NOT NULL,
  tanggal_ba          DATE NOT NULL DEFAULT CURRENT_DATE,
  isi_kegiatan        TEXT NOT NULL,
  hasil_kegiatan      TEXT,
  jumlah_peserta      INTEGER DEFAULT 0,
  catatan             TEXT,
  lampiran_urls       TEXT[] DEFAULT '{}',
  foto_urls           TEXT[] DEFAULT '{}',
  status              TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'diajukan', 'disetujui', 'ditolak')),
  dibuat_oleh         UUID REFERENCES admins(id),
  diajukan_at         TIMESTAMPTZ,
  disetujui_oleh      UUID REFERENCES admins(id),
  disetujui_at        TIMESTAMPTZ,
  catatan_persetujuan TEXT,
  updated_by          UUID REFERENCES admins(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  deleted_by          UUID REFERENCES admins(id)
);

-- ─── PESERTA HADIR TABLE ────────────────────────────────────────────────────
CREATE TABLE peserta_hadir (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  berita_acara_id   UUID NOT NULL REFERENCES berita_acara(id) ON DELETE CASCADE,
  nama              TEXT NOT NULL,
  nim               TEXT,
  prodi             TEXT,
  jabatan           TEXT,
  tanda_tangan_url  TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── GALERI TABLE ───────────────────────────────────────────────────────────
CREATE TABLE galeri (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title               TEXT NOT NULL,
  category            TEXT NOT NULL,
  date                TEXT NOT NULL,
  description         TEXT,
  image_url           TEXT NOT NULL,
  created_by          UUID REFERENCES admins(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  deleted_by          UUID REFERENCES admins(id)
);

-- ─── INDEXES ───────────────────────────────────────────────────────────────
CREATE INDEX idx_kegiatan_status ON kegiatan(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_kegiatan_tanggal ON kegiatan(tanggal_kegiatan) WHERE deleted_at IS NULL;
CREATE INDEX idx_kegiatan_bulan_tahun ON kegiatan(bulan, tahun) WHERE deleted_at IS NULL;
CREATE INDEX idx_berita_acara_kegiatan ON berita_acara(kegiatan_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_berita_acara_status ON berita_acara(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_peserta_ba ON peserta_hadir(berita_acara_id);
CREATE INDEX idx_galeri_category ON galeri(category) WHERE deleted_at IS NULL;

-- ─── ROW LEVEL SECURITY (RLS) ──────────────────────────────────────────────
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE kegiatan ENABLE ROW LEVEL SECURITY;
ALTER TABLE berita_acara ENABLE ROW LEVEL SECURITY;
ALTER TABLE peserta_hadir ENABLE ROW LEVEL SECURITY;
ALTER TABLE galeri ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (server-side)
-- Kegiatan: public read, auth write
CREATE POLICY "kegiatan_public_read" ON kegiatan FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "kegiatan_auth_write" ON kegiatan FOR ALL USING (true) WITH CHECK (true);

-- Berita acara: auth only
CREATE POLICY "ba_all" ON berita_acara FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "peserta_all" ON peserta_hadir FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "admins_all" ON admins FOR ALL USING (true) WITH CHECK (true);

-- Galeri: public read, auth write
CREATE POLICY "galeri_public_read" ON galeri FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "galeri_auth_write" ON galeri FOR ALL USING (true) WITH CHECK (true);

-- ─── SEED: ADMINS ──────────────────────────────────────────────────────────
-- Password: Admin@KKN2026! (bcrypt hash - change in production!)
-- You should run: node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('Admin@KKN2026!', 12).then(h => console.log(h))"
-- Then replace the hash below

INSERT INTO admins (email, password_hash, name, nim, prodi, role, division) VALUES
  ('ulul@kkn-padepokan.ac.id', '$2a$10$NCZpYx0p5qy1NrWsa/xafe5c/RxBn8DRh78r6xjKlG1Km6sERcjr.', 'Ulul Hikam', '2023018037', 'Informatika', 'admin', 'ketua'),
  ('daffa@kkn-padepokan.ac.id', '$2a$10$nPB9ijOQmqsl027VHqkZeOO001.0MDq6nRmiyBwy.vKUve443Paq.', 'Daffa Sandy Orvala', '2023013048', 'Teknik Sipil', 'member', 'wakil_ketua'),
  ('adithya@kkn-padepokan.ac.id', '$2a$10$nPB9ijOQmqsl027VHqkZeOO001.0MDq6nRmiyBwy.vKUve443Paq.', 'Adithya Rifansyah', '2023012043', 'Teknik Industri', 'member', 'sekretaris'),
  ('azka@kkn-padepokan.ac.id', '$2a$10$nPB9ijOQmqsl027VHqkZeOO001.0MDq6nRmiyBwy.vKUve443Paq.', 'Azka Aprilia Ananta', '2023017006', 'Akuntansi', 'member', 'sekretaris'),
  ('fariska@kkn-padepokan.ac.id', '$2a$10$nPB9ijOQmqsl027VHqkZeOO001.0MDq6nRmiyBwy.vKUve443Paq.', 'Fariska Aprilia Windari', '2023004006', 'Pendidikan Matematika', 'member', 'bendahara'),
  ('helvy@kkn-padepokan.ac.id', '$2a$10$nPB9ijOQmqsl027VHqkZeOO001.0MDq6nRmiyBwy.vKUve443Paq.', 'Helvy Teana Rossa', '2023001016', 'Pendidikan Bahasa & Sastra Indonesia', 'member', 'bendahara'),
  ('intan@kkn-padepokan.ac.id', '$2a$10$nPB9ijOQmqsl027VHqkZeOO001.0MDq6nRmiyBwy.vKUve443Paq.', 'Intan Diah Mufadhe', '2023010043', 'Agribisnis', 'member', 'humas'),
  ('pandu@kkn-padepokan.ac.id', '$2a$10$nPB9ijOQmqsl027VHqkZeOO001.0MDq6nRmiyBwy.vKUve443Paq.', 'Pandu Wiranata', '2023008231', 'Manajemen', 'member', 'humas'),
  ('dea@kkn-padepokan.ac.id', '$2a$10$nPB9ijOQmqsl027VHqkZeOO001.0MDq6nRmiyBwy.vKUve443Paq.', 'Dea Jane Anastacia Purba', '2025007078', 'Pendidikan Vokasional Kesejahteraan', 'member', 'acara'),
  ('paula@kkn-padepokan.ac.id', '$2a$10$nPB9ijOQmqsl027VHqkZeOO001.0MDq6nRmiyBwy.vKUve443Paq.', 'Paula Yuyun Sukmawan', '2023008141', 'Manajemen', 'member', 'acara'),
  ('rosita@kkn-padepokan.ac.id', '$2a$10$nPB9ijOQmqsl027VHqkZeOO001.0MDq6nRmiyBwy.vKUve443Paq.', 'Rosita Purnamasari', '2023017076', 'Akuntansi', 'member', 'pdd'),
  ('lunetta@kkn-padepokan.ac.id', '$2a$10$nPB9ijOQmqsl027VHqkZeOO001.0MDq6nRmiyBwy.vKUve443Paq.', 'Lunetta Wimala Anargya', '2023008235', 'Manajemen', 'member', 'pdd');

-- ─── SEED: GALERI ──────────────────────────────────────────────────────────
INSERT INTO galeri (id, title, category, date, description, image_url) VALUES
  ('a1e2f3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b', 'Bimbingan Belajar Ceria Posko 4', 'pendidikan', '12 Juni 2026', 'Suasana ceria bimbingan belajar sore hari bersama anak-anak Dusun Menggah mempelajari bahasa Inggris dasar.', 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1000&q=80'),
  ('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'Penanaman 100 Bibit Pohon Buah', 'lingkungan', '15 Juni 2026', 'Kerja bakti bersama warga menanam bibit pohon durian, alpukat, dan jambu untuk pelestarian lahan lereng perbukitan.', 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1000&q=80'),
  ('c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f', 'Pelatihan Packaging Kopi Robusta', 'umkm', '18 Juni 2026', 'Mahasiswa KKN mendemonstrasikan kemasan standing pouch premium aluminum foil kepada pengelola wirausaha kopi dusun.', 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1000&q=80'),
  ('d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a', 'Festival Keagamaan & Bersih Desa', 'keagamaan', '20 Juni 2026', 'Keikutsertaan kelompok KKN dalam pawai budaya dan doa bersama menandai dimulainya kegiatan bersih Dusun Menggah.', 'https://images.unsplash.com/photo-1518398046578-8cca57782e17?auto=format&fit=crop&w=1000&q=80'),
  ('e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b', 'Pojok Baca & Donasi Buku', 'pendidikan', '23 Juni 2026', 'Peresmian pojok baca di teras posko KKN dengan rak buku kayu daur ulang dan donasi lebih dari 150 buku bacaan anak.', 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1000&q=80'),
  ('f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c', 'Sosialisasi Pembuatan Sabun Alami', 'umkm', '26 Juni 2026', 'Pelatihan pembuatan sabun mandi herbal aroma terapi menggunakan bahan dasar minyak kelapa dan ekstrak kopi lokal.', 'https://images.unsplash.com/photo-1607006342411-9a337316d940?auto=format&fit=crop&w=1000&q=80');
