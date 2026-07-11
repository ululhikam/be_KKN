import { Response } from 'express'
import { supabase } from '../config/supabase.js'
import { sendSuccess, sendError, sendPaginated } from '../utils/response.js'
import { v4 as uuidv4 } from 'uuid'
import { AuthenticatedRequest } from '../middleware/auth.js'

/**
 * GET /api/berita-acara
 * Get all berita acara with pagination + filters
 */
export const getAll = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const page = typeof req.query.page === 'string' ? req.query.page : '1'
  const limit = typeof req.query.limit === 'string' ? req.query.limit : '10'
  const search = typeof req.query.search === 'string' ? req.query.search : ''
  const kegiatan_id = typeof req.query.kegiatan_id === 'string' ? req.query.kegiatan_id : ''
  const status = typeof req.query.status === 'string' ? req.query.status : ''
  const offset = (parseInt(page) - 1) * parseInt(limit)

  let query = supabase
    .from('berita_acara')
    .select(`
      *,
      kegiatan(id, nama_kegiatan, tanggal_kegiatan, lokasi, status),
      dibuat_oleh:admins!berita_acara_dibuat_oleh_fkey(id, name, division)
    `, { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (search) {
    query = query.or(`nomor_ba.ilike.%${search}%,judul.ilike.%${search}%`)
  }
  if (kegiatan_id) query = query.eq('kegiatan_id', kegiatan_id)
  if (status) query = query.eq('status', status)

  query = query.range(offset, offset + parseInt(limit) - 1)

  const { data, error, count } = await query
  if (error) return sendError(res, 'Gagal mengambil data berita acara')

  return sendPaginated(res, data, {
    page: parseInt(page),
    limit: parseInt(limit),
    total: count || 0,
    totalPages: Math.ceil((count || 0) / parseInt(limit))
  })
}

/**
 * GET /api/berita-acara/:id
 * Get single berita acara with full details
 */
export const getById = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { data, error } = await supabase
    .from('berita_acara')
    .select(`
      *,
      kegiatan(*),
      dibuat_oleh:admins!berita_acara_dibuat_oleh_fkey(id, name, division),
      disetujui_oleh:admins!berita_acara_disetujui_oleh_fkey(id, name, division),
      peserta_hadir(*)
    `)
    .eq('id', req.params.id)
    .is('deleted_at', null)
    .single()

  if (error || !data) return sendError(res, 'Berita acara tidak ditemukan', 404)
  return sendSuccess(res, data)
}

/**
 * POST /api/berita-acara
 * Create berita acara for a kegiatan
 */
export const create = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const {
    kegiatan_id,
    judul,
    isi_kegiatan,
    hasil_kegiatan,
    peserta_hadir,
    jumlah_peserta,
    catatan,
    lampiran_urls,
    foto_urls
  } = req.body

  if (!kegiatan_id || !judul || !isi_kegiatan) {
    return sendError(res, 'Kegiatan ID, judul, dan isi kegiatan wajib diisi', 400)
  }

  const user = req.user
  if (!user) {
    return sendError(res, 'Pengguna tidak terautentikasi', 401)
  }

  // Check kegiatan exists
  const { data: kegiatan } = await supabase
    .from('kegiatan')
    .select('id, nama_kegiatan, tanggal_kegiatan')
    .eq('id', kegiatan_id)
    .single()

  if (!kegiatan) return sendError(res, 'Kegiatan tidak ditemukan', 404)

  // Auto-generate BA number: BA-[tahun]-[month]-[counter]
  const now = new Date()
  const prefix = `BA-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const { count } = await supabase
    .from('berita_acara')
    .select('id', { count: 'exact' })
    .like('nomor_ba', `${prefix}%`)

  const nomorBA = `${prefix}-${String((count || 0) + 1).padStart(3, '0')}`

  const newBA = {
    id: uuidv4(),
    nomor_ba: nomorBA,
    kegiatan_id,
    judul: (judul as string).trim(),
    isi_kegiatan,
    hasil_kegiatan: hasil_kegiatan || '',
    jumlah_peserta: jumlah_peserta || (peserta_hadir?.length || 0),
    catatan: catatan || '',
    lampiran_urls: lampiran_urls || [],
    foto_urls: foto_urls || [],
    status: 'draft',
    dibuat_oleh: user.id,
    tanggal_ba: now.toISOString().split('T')[0],
    created_at: now.toISOString(),
    updated_at: now.toISOString()
  }

  const { data: baData, error: baError } = await supabase
    .from('berita_acara')
    .insert(newBA)
    .select()
    .single()

  if (baError) {
    console.error('Error creating berita acara:', baError)
    return sendError(res, 'Gagal membuat berita acara')
  }

  // Insert peserta if provided
  if (peserta_hadir && peserta_hadir.length > 0) {
    const pesertaData = peserta_hadir.map((p: any) => ({
      id: uuidv4(),
      berita_acara_id: baData.id,
      nama: p.nama,
      nim: p.nim || null,
      prodi: p.prodi || null,
      jabatan: p.jabatan || null,
      tanda_tangan_url: p.tanda_tangan_url || null
    }))

    await supabase.from('peserta_hadir').insert(pesertaData)
  }

  // Update kegiatan status to 'berjalan' if not already done/cancelled
  await supabase
    .from('kegiatan')
    .update({ status: 'berjalan', updated_at: now.toISOString() })
    .eq('id', kegiatan_id)
    .in('status', ['direncanakan'])

  return sendSuccess(res, baData, 'Berita acara berhasil dibuat', 201)
}

/**
 * PUT /api/berita-acara/:id
 * Update berita acara
 */
export const update = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { id } = req.params
  const updates = req.body
  delete updates.id
  delete updates.nomor_ba
  delete updates.dibuat_oleh
  delete updates.created_at

  const user = req.user
  if (!user) {
    return sendError(res, 'Pengguna tidak terautentikasi', 401)
  }

  updates.updated_at = new Date().toISOString()
  updates.updated_by = user.id

  const { data, error } = await supabase
    .from('berita_acara')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return sendError(res, 'Gagal memperbarui berita acara')
  return sendSuccess(res, data, 'Berita acara berhasil diperbarui')
}

/**
 * PATCH /api/berita-acara/:id/approve
 * Approve berita acara (ketua only)
 */
export const approve = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { catatan_persetujuan } = req.body

  const user = req.user
  if (!user) {
    return sendError(res, 'Pengguna tidak terautentikasi', 401)
  }

  const { data, error } = await supabase
    .from('berita_acara')
    .update({
      status: 'disetujui',
      disetujui_oleh: user.id,
      disetujui_at: new Date().toISOString(),
      catatan_persetujuan: catatan_persetujuan || 'Disetujui',
      updated_at: new Date().toISOString()
    })
    .eq('id', req.params.id)
    .eq('status', 'diajukan')
    .select()
    .single()

  if (error || !data) return sendError(res, 'Gagal menyetujui berita acara atau status tidak valid')
  return sendSuccess(res, data, 'Berita acara telah disetujui')
}

/**
 * PATCH /api/berita-acara/:id/submit
 * Submit berita acara for approval
 */
export const submit = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { data, error } = await supabase
    .from('berita_acara')
    .update({
      status: 'diajukan',
      diajukan_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', req.params.id)
    .eq('status', 'draft')
    .select()
    .single()

  if (error || !data) return sendError(res, 'Gagal mengajukan berita acara atau status tidak valid')
  return sendSuccess(res, data, 'Berita acara berhasil diajukan untuk persetujuan')
}

/**
 * DELETE /api/berita-acara/:id
 * Soft delete berita acara
 */
export const remove = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const user = req.user
  if (!user) {
    return sendError(res, 'Pengguna tidak terautentikasi', 401)
  }

  const { error } = await supabase
    .from('berita_acara')
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq('id', req.params.id)
    .eq('status', 'draft') // Only draft can be deleted

  if (error) return sendError(res, 'Gagal menghapus berita acara (hanya draft yang bisa dihapus)')
  return sendSuccess(res, null, 'Berita acara berhasil dihapus')
}

/**
 * GET /api/berita-acara/:id/export
 * Export berita acara as structured JSON for PDF generation
 */
export const exportBA = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { data, error } = await supabase
    .from('berita_acara')
    .select(`
      *,
      kegiatan(*),
      dibuat_oleh:admins!berita_acara_dibuat_oleh_fkey(id, name, division),
      disetujui_oleh:admins!berita_acara_disetujui_oleh_fkey(id, name, division),
      peserta_hadir(*)
    `)
    .eq('id', req.params.id)
    .single()

  if (error || !data) return sendError(res, 'Berita acara tidak ditemukan', 404)

  const exportData = {
    ...data,
    anggota_kelompok: [
      { jabatan: 'Ketua', nama: 'Ulul Hikam', nim: '2023018037', prodi: 'Informatika' },
      { jabatan: 'Wakil Ketua', nama: 'Daffa Sandy Orvala', nim: '2023013048', prodi: 'Teknik Sipil' },
      { jabatan: 'Sekretaris 1', nama: 'Adithya Rifansyah', nim: '2023012043', prodi: 'Teknik Industri' },
      { jabatan: 'Sekretaris 2', nama: 'Azka Aprilia Ananta', nim: '2023017006', prodi: 'Akuntansi' },
      { jabatan: 'Bendahara 1', nama: 'Fariska Aprilia Windari', nim: '2023004006', prodi: 'Pendidikan Matematika' },
      { jabatan: 'Bendahara 2', nama: 'Helvy Teana Rossa', nim: '2023001016', prodi: 'Pendidikan Bahasa & Sastra Indonesia' },
      { jabatan: 'Humas 1', nama: 'Intan Diah Mufadhe', nim: '2023010043', prodi: 'Agribisnis' },
      { jabatan: 'Humas 2', nama: 'Pandu Wiranata', nim: '2023008231', prodi: 'Manajemen' },
      { jabatan: 'Acara 1', nama: 'Dea Jane Anastacia Purba', nim: '2025007078', prodi: 'Pendidikan Vokasional Kesejahteraan' },
      { jabatan: 'Acara 2', nama: 'Paula Yuyun Sukmawan', nim: '2023008141', prodi: 'Manajemen' },
      { jabatan: 'PDD 1', nama: 'Rosita Purnamasari', nim: '2023017076', prodi: 'Akuntansi' },
      { jabatan: 'PDD 2', nama: 'Lunetta Wimala Anargya', nim: '2023008235', prodi: 'Manajemen' }
    ],
    kelompok_info: {
      padepokan: '4',
      dpl: 'Dr. Oktaviani Windra Puspita, M.Pd.',
      lokasi: 'Desa Katekan, Kec. Gantiwarno, Klaten'
    }
  }

  return sendSuccess(res, exportData, 'Data ekspor berita acara')
}
