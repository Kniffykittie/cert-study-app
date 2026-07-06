'use client'
import dynamic from 'next/dynamic'

const DailyLogReview = dynamic(() => import('@/components/nutrition/DailyLogReview'), { ssr: false })

export default function LifeHubClientShell() {
  return <DailyLogReview />
}
