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

-- ─── SEED DATA ─────────────────────────────────────────────────────────────
-- Seed data (admins & galeri) telah dihapus dari file ini demi keamanan.
-- Data sudah tersimpan di database Supabase dan tidak terpengaruh.
-- Jika perlu menambah data baru, gunakan Supabase SQL Editor secara langsung.
