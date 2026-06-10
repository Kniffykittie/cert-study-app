import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const BUCKET = 'progress-photos'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

async function ensureBucket(admin) {
  const { error } = await admin.storage.createBucket(BUCKET, { public: false })
  if (error && !error.message.includes('already exists')) throw error
}

function validateMagicBytes(buffer) {
  const bytes = new Uint8Array(buffer)
  const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47
  const isWebp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  return isJpeg || isPng || isWebp
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: photos } = await supabase
    .from('progress_photos')
    .select('*')
    .eq('user_id', user.id)
    .order('taken_date', { ascending: false })

  if (!photos?.length) return NextResponse.json({ photos: [] })

  const admin = getAdminClient()
  const withUrls = await Promise.all(photos.map(async (p) => {
    const { data } = await admin.storage.from(BUCKET).createSignedUrl(p.storage_path, 3600)
    return { ...p, url: data?.signedUrl || null }
  }))

  return NextResponse.json({ photos: withUrls })
}

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_disabled').eq('id', user.id).single()
  if (profile?.is_disabled) return NextResponse.json({ error: 'Account disabled' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file')
  const taken_date = formData.get('taken_date') || new Date().toISOString().slice(0, 10)
  const note = formData.get('note') || null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const buffer = await file.arrayBuffer()
  if (!validateMagicBytes(buffer)) {
    return NextResponse.json({ error: 'Invalid file type — JPEG, PNG, or WebP only' }, { status: 400 })
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const storagePath = `${user.id}/${taken_date}-${Date.now()}.${ext}`

  const admin = getAdminClient()
  await ensureBucket(admin)

  const { error: uploadError } = await admin.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: file.type,
    upsert: false,
  })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: row, error: dbError } = await supabase.from('progress_photos').insert({
    user_id: user.id,
    storage_path: storagePath,
    taken_date,
    note,
  }).select().single()

  if (dbError) {
    await admin.storage.from(BUCKET).remove([storagePath])
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  const { data: signedData } = await admin.storage.from(BUCKET).createSignedUrl(storagePath, 3600)
  return NextResponse.json({ photo: { ...row, url: signedData?.signedUrl } })
}

export async function DELETE(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  const { data: photo } = await supabase.from('progress_photos').select('storage_path').eq('id', id).eq('user_id', user.id).single()
  if (!photo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const admin = getAdminClient()
  await admin.storage.from(BUCKET).remove([photo.storage_path])
  await supabase.from('progress_photos').delete().eq('id', id).eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
