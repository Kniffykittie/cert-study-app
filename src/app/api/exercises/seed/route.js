import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY
const RAPIDAPI_HOST = 'exercisedb.p.rapidapi.com'
const PAGE_SIZE = 1300

export async function POST() {
  if (!RAPIDAPI_KEY) return NextResponse.json({ error: 'RAPIDAPI_KEY not set' }, { status: 500 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await fetch(
    `https://${RAPIDAPI_HOST}/exercises?limit=${PAGE_SIZE}&offset=0`,
    { headers: { 'X-RapidAPI-Key': RAPIDAPI_KEY, 'X-RapidAPI-Host': RAPIDAPI_HOST } }
  )
  if (!res.ok) return NextResponse.json({ error: `ExerciseDB error: ${res.status}` }, { status: 502 })

  const exercises = await res.json()

  const rows = exercises.map(e => ({
    id: e.id,
    name: e.name,
    body_part: e.bodyPart,
    equipment: e.equipment,
    target: e.target,
    secondary_muscles: e.secondaryMuscles ?? [],
    instructions: e.instructions ?? [],
    gif_url: e.gifUrl,
  }))

  const { error } = await supabase
    .from('exercises')
    .upsert(rows, { onConflict: 'id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, count: rows.length })
}
