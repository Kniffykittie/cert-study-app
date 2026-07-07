'use client'
import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'

const DailyLogReview = dynamic(() => import('@/components/nutrition/DailyLogReview'), { ssr: false })
const CheckInSheet = dynamic(() => import('@/components/CheckInSheet'), { ssr: false })

export default function LifeHubClientShell() {
  const [sheetVisible, setSheetVisible] = useState('none')
  const hasShownRef = useRef(false)

  useEffect(() => {
    let timer = null

    async function scheduleCheckin() {
      if (hasShownRef.current) return

      const today = new Date().toISOString().slice(0, 10)
      const morningKey = `checkin_morning_${today}`
      const afternoonKey = `checkin_afternoon_${today}`

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('goals_profiles')
        .select('wake_time')
        .eq('user_id', user.id)
        .single()

      const wakeTime = profile?.wake_time ?? '07:00'
      const [wakeH, wakeM] = wakeTime.split(':').map(Number)

      const now = new Date()
      const wakeMinutes = wakeH * 60 + wakeM
      const nowMinutes = now.getHours() * 60 + now.getMinutes()

      const morningWindowEnd = wakeMinutes + 60
      const afternoonWindowStart = wakeMinutes + 7 * 60

      let window = null
      if (nowMinutes >= wakeMinutes && nowMinutes < morningWindowEnd) {
        if (!localStorage.getItem(morningKey)) window = 'morning'
      } else if (nowMinutes >= afternoonWindowStart) {
        if (!localStorage.getItem(afternoonKey)) window = 'afternoon'
      }

      if (!window) return

      timer = setTimeout(() => {
        if (hasShownRef.current) return
        hasShownRef.current = true
        setSheetVisible(window)
      }, 30000)
    }

    scheduleCheckin()
    return () => { if (timer) clearTimeout(timer) }
  }, [])

  function handleClose() {
    const today = new Date().toISOString().slice(0, 10)
    if (sheetVisible === 'morning') localStorage.setItem(`checkin_morning_${today}`, '1')
    if (sheetVisible === 'afternoon') localStorage.setItem(`checkin_afternoon_${today}`, '1')
    setSheetVisible('none')
  }

  return (
    <>
      <DailyLogReview />
      {sheetVisible !== 'none' && (
        <CheckInSheet
          checkInWindow={sheetVisible}
          onClose={handleClose}
          onInsight={() => {}}
        />
      )}
    </>
  )
}
