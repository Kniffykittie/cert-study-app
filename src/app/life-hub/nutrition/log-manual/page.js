'use client'
import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LogManualRedirect() {
  const router = useRouter()
  const params = useSearchParams()
  const slot = params.get('slot') || 'breakfast'

  useEffect(() => {
    router.replace(`/life-hub/nutrition/add-food?slot=${slot}&tab=manual`)
  }, [router, slot])

  return <div style={{ padding: 48, color: 'var(--text-secondary)', textAlign: 'center' }}>Loading...</div>
}

export default function LogManualPage() {
  return <Suspense><LogManualRedirect /></Suspense>
}
