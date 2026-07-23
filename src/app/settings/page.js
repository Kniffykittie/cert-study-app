'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const OWNER_EMAIL = 'sethproper40@yahoo.com'
const PIN_SESSION_KEY = 'ownerPinExpiry'
const PRIVACY_PIN_SESSION_KEY = 'settingsPinUnlocked'
const PIN_SESSION_HOURS = 4

const CERTS = [
  { key: 'ccna', label: 'CCNA', color: 'var(--accent-blue)' },
  { key: 'network-plus', label: 'Network+', color: 'var(--accent-purple)' },
  { key: 'security-plus', label: 'Security+', color: 'var(--error)' },
]

const TABS = [
  { key: 'account', label: 'Account' },
  { key: 'notifications', label: '🔔 Notifications' },
  { key: 'study', label: 'Study' },
  { key: 'data', label: 'Data & Reset' },
  { key: 'security', label: 'Security' },
  { key: 'danger', label: '⚠ Danger Zone' },
]

function fmt12(hhmm) {
  if (!hhmm) return '—'
  const [h, m] = hhmm.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}
function addMinutes(hhmm, mins) {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  let total = (h * 60 + m + mins + 1440) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
// Default HH:MM for a notification given the user's wake/bedtime, or '' if the anchor isn't set.
function defaultTimeFor(item, wakeTime, bedtime) {
  if (item.base === 'wake') return wakeTime ? addMinutes(wakeTime, item.offset) : ''
  if (item.base === 'bed') return bedtime ? addMinutes(bedtime, item.offset) : ''
  return '' // workout — schedule-derived, no fixed default
}

// base = 'wake' | 'bed' | 'workout' ; offset in minutes from that anchor.
// The Edge Function uses these exact offsets — keep in sync.
const NOTIF_TYPES = [
  {
    group: 'DAILY BRIEFS',
    items: [
      { key: 'morning_brief', emoji: '🌅', label: 'Morning Brief', desc: 'Fires at your wake time', base: 'wake', offset: 0,
        how: 'A short AI-written summary of your day — today\'s schedule, planned workout, meal timing, and anything from your check-ins. It reads 10+ of your tracked tables and is cached so it only generates once each morning.' },
      { key: 'midday_checkin', emoji: '☀️', label: 'Midday Check-in', desc: 'Fires 6 hours after wake', base: 'wake', offset: 360,
        how: 'A nudge to log your afternoon energy and mood so the app can spot low-energy streaks and adjust recommendations. Tapping it opens the check-in sheet.' },
      { key: 'evening_wrap', emoji: '🌙', label: 'Evening Wrap', desc: 'Fires 1 hour before bedtime', base: 'bed', offset: -60,
        how: 'A past-tense recap of how the day actually went — calories, water, workout, steps — so you can close the loop before bed.' },
    ],
  },
  {
    group: 'SMART NUDGES',
    items: [
      { key: 'workout_reminder', emoji: '💪', label: 'Workout Reminder', desc: 'On workout days, 1 hr before planned time', base: 'workout', offset: -60,
        how: 'Only fires on days your plan has a workout, one hour before the time you set in My Week. Skipped entirely on rest days.' },
      { key: 'hydration_nudge', emoji: '💧', label: 'Hydration Nudge', desc: 'Only if you\'re behind on water', base: 'wake', offset: 360,
        how: 'Checks your water total against where you should be to hit your daily goal by bedtime. It tells you your exact intake and how many oz you\'re behind — it stays silent if you\'re on pace.' },
      { key: 'study_streak', emoji: '📚', label: 'Study Streak Alert', desc: 'Evening if your question goal isn\'t hit', base: 'bed', offset: -120,
        how: 'Fires in the evening only if you haven\'t reached your daily question goal, and tells you exactly how many questions you have left.' },
      { key: 'supplement_reminder', emoji: '💊', label: 'Supplement Reminder', desc: 'Morning, lists what\'s still untaken', base: 'wake', offset: 30,
        how: 'Lists the supplements in your stack you haven\'t marked taken yet today, by name. Silent once everything is logged.' },
      { key: 'weigh_in_reminder', emoji: '⚖️', label: 'Weigh-in Reminder', desc: 'Morning if no weight in 3+ days', base: 'wake', offset: 15,
        how: 'A gentle morning reminder to step on the scale, only when your last logged weight is 3 or more days old. Consistent data makes the TDEE calibration accurate.' },
      { key: 'body_measurement_reminder', emoji: '📏', label: 'Body Measurements', desc: 'Morning if none in 7+ days', base: 'wake', offset: 20,
        how: 'A weekly-cadence nudge to log tape measurements, only when your last set is 7+ days old. Measurements catch recomposition the scale misses.' },
      { key: 'wrap_ready', emoji: '📅', label: 'Wrap Ready', desc: 'When a weekly/monthly wrap is ready', base: 'bed', offset: -90,
        how: 'Lets you know your Weekly Wrap (Saturday evening) or Monthly Wrap (1st of the month) has been generated and is ready to read.' },
    ],
  },
]

function SettingsPageInner() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('account')
  const [displayName, setDisplayName] = useState('')
  const [savedName, setSavedName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const [examDates, setExamDates] = useState({ ccna: '', 'network-plus': '', 'security-plus': '' })
  const [dailyGoal, setDailyGoal] = useState(30)
  const [defaultCert, setDefaultCert] = useState('')
  const [prefSaving, setPrefSaving] = useState(false)
  const [prefSaveMsg, setPrefSaveMsg] = useState('')
  const [healthConnected, setHealthConnected] = useState(false)
  const [healthConnectedAt, setHealthConnectedAt] = useState(null)
  const [healthDisconnecting, setHealthDisconnecting] = useState(false)
  const [showHealthSection, setShowHealthSection] = useState(false)

  // Push notification state
  const [notifPermission, setNotifPermission] = useState('default')
  const [notifSubscribed, setNotifSubscribed] = useState(false)
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifMsg, setNotifMsg] = useState('')
  const [wakeTime, setWakeTime] = useState('')
  const [bedtime, setBedtime] = useState('')
  const [hasGoalsProfile, setHasGoalsProfile] = useState(false)
  const [scheduleSaved, setScheduleSaved] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState({
    morning_brief: true, midday_checkin: true, evening_wrap: true,
    workout_reminder: false, hydration_nudge: false, study_streak: false,
    supplement_reminder: false, weigh_in_reminder: false,
    body_measurement_reminder: false, wrap_ready: false,
  })
  const [prefsSaving, setPrefsSaving] = useState(false)
  const [notifTimes, setNotifTimes] = useState({})
  const [expandedHow, setExpandedHow] = useState(null)

  const [resetConfirm, setResetConfirm] = useState(null)
  const [resetting, setResetting] = useState(false)
  const [resetMsg, setResetMsg] = useState('')

  // Owner PIN state
  const [isOwner, setIsOwner] = useState(false)
  const [ownerUnlocked, setOwnerUnlocked] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinSubmitting, setPinSubmitting] = useState(false)
  const [pinError, setPinError] = useState('')
  const [pinLockedSeconds, setPinLockedSeconds] = useState(0)
  const [inviteCodes, setInviteCodes] = useState([])
  const [inviteGenerating, setInviteGenerating] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')
  const [copiedCode, setCopiedCode] = useState('')

  // Privacy PIN state
  const [privacyPinSet, setPrivacyPinSet] = useState(false)
  const [privacyPinGated, setPrivacyPinGated] = useState(false)
  const [privacyPinInput, setPrivacyPinInput] = useState('')
  const [privacyPinError, setPrivacyPinError] = useState('')
  const [privacyPinChecking, setPrivacyPinChecking] = useState(false)
  const [showSetPinModal, setShowSetPinModal] = useState(false)
  const [showRemovePinModal, setShowRemovePinModal] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [removePinInput, setRemovePinInput] = useState('')
  const [pinModalError, setPinModalError] = useState('')
  const [pinModalMsg, setPinModalMsg] = useState('')
  const [pinModalLoading, setPinModalLoading] = useState(false)

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [twoFactorId, setTwoFactorId] = useState(null)
  const [recoveryCodesLeft, setRecoveryCodesLeft] = useState(0)
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [enrollStep, setEnrollStep] = useState(1) // 1=scan, 2=verify, 3=recovery codes
  const [enrollFactorId, setEnrollFactorId] = useState(null)
  const [enrollQR, setEnrollQR] = useState('')
  const [enrollSecret, setEnrollSecret] = useState('')
  const [enrollCode, setEnrollCode] = useState('')
  const [enrollError, setEnrollError] = useState('')
  const [enrollLoading, setEnrollLoading] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState([])
  const [recoveryCodesCopied, setRecoveryCodesCopied] = useState(false)
  const [showDisable2FAModal, setShowDisable2FAModal] = useState(false)
  const [disable2FACode, setDisable2FACode] = useState('')
  const [disable2FAError, setDisable2FAError] = useState('')
  const [disable2FALoading, setDisable2FALoading] = useState(false)

  const [enrollAuthName, setEnrollAuthName] = useState('')
  const [savedAuthName, setSavedAuthName] = useState('')

  // Admin panel state
  const [adminUsers, setAdminUsers] = useState([])
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminActionMsg, setAdminActionMsg] = useState({}) // userId -> message
  const [adminActionLoading, setAdminActionLoading] = useState({}) // userId+action -> bool

  // Account deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [dangerGatePassed, setDangerGatePassed] = useState(false)

  const searchParams = useSearchParams()

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email)
      supabase.from('goals_profiles').select('wake_time, bedtime').eq('user_id', user.id).maybeSingle().then(({ data: gp }) => {
        if (gp) {
          if (gp.wake_time) setWakeTime(gp.wake_time.slice(0, 5))
          if (gp.bedtime) setBedtime(gp.bedtime.slice(0, 5))
          setHasGoalsProfile(true)
        }
      })
      const { data } = await supabase.from('profiles').select('display_name, exam_dates, daily_goal, default_cert, settings_pin_hash, authenticator_name, notification_preferences, notification_times').eq('id', user.id).single()
      if (data) {
        if (data.display_name) { setDisplayName(data.display_name); setSavedName(data.display_name) }
        if (data.exam_dates) setExamDates({ ccna: '', 'network-plus': '', 'security-plus': '', ...data.exam_dates })
        if (data.daily_goal) setDailyGoal(data.daily_goal)
        if (data.default_cert) setDefaultCert(data.default_cert)
        if (data.notification_preferences) setNotifPrefs(p => ({ ...p, ...data.notification_preferences }))
        if (data.notification_times) setNotifTimes(data.notification_times)

        // Privacy PIN gate
        if (data.authenticator_name) setSavedAuthName(data.authenticator_name)

        if (data.settings_pin_hash) {
          setPrivacyPinSet(true)
          const unlocked = sessionStorage.getItem(PRIVACY_PIN_SESSION_KEY)
          if (!unlocked) setPrivacyPinGated(true)
        }
      }

      // Check 2FA status
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totp = factors?.totp?.find(f => f.status === 'verified')
      if (totp) {
        setTwoFactorEnabled(true)
        setTwoFactorId(totp.id)
        const { data: codes } = await supabase.from('recovery_codes').select('id, used_at').eq('user_id', user.id)
        setRecoveryCodesLeft(codes?.filter(c => !c.used_at).length ?? 0)
      }

      if (user.email.toLowerCase() === OWNER_EMAIL) {
        setIsOwner(true)
        const expiry = sessionStorage.getItem(PIN_SESSION_KEY)
        if (expiry && Date.now() < parseInt(expiry)) setOwnerUnlocked(true)
      }

      setShowHealthSection(true)
      const statusRes = await fetch('/api/health/status')
      const status = await statusRes.json()
      setHealthConnected(status.connected)
      if (status.connectedAt) setHealthConnectedAt(new Date(status.connectedAt).toLocaleDateString())
    }
    fetchProfile()

    if (typeof Notification !== 'undefined') {
      setNotifPermission(Notification.permission)
      if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
          reg.pushManager.getSubscription().then(sub => {
            setNotifSubscribed(!!sub)
          })
        })
      }
    }
  }, [])

  async function handleSaveName() {
    setSaving(true)
    setSaveMsg('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('profiles').upsert({ id: user.id, display_name: displayName, updated_at: new Date().toISOString() })
    if (error) { setSaveMsg('Failed to save.') } else { setSavedName(displayName); setSaveMsg('Saved!'); setTimeout(() => setSaveMsg(''), 2000) }
    setSaving(false)
  }

  async function handleSavePrefs() {
    setPrefSaving(true)
    setPrefSaveMsg('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      exam_dates: examDates,
      daily_goal: dailyGoal,
      default_cert: defaultCert || null,
      updated_at: new Date().toISOString(),
    })
    if (error) { setPrefSaveMsg('Failed to save.') } else { setPrefSaveMsg('Saved!'); setTimeout(() => setPrefSaveMsg(''), 2000) }
    setPrefSaving(false)
  }

  async function handleEnableNotifications() {
    setNotifLoading(true)
    setNotifMsg('')
    try {
      const permission = await Notification.requestPermission()
      setNotifPermission(permission)
      if (permission !== 'granted') { setNotifLoading(false); return }
      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) throw new Error('VAPID key not configured')
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })
      const j = sub.toJSON()
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: j.endpoint, keys: j.keys, userAgent: navigator.userAgent }),
      })
      setNotifSubscribed(true)
      setNotifMsg('Notifications enabled!')
      setTimeout(() => setNotifMsg(''), 3000)
    } catch (err) {
      setNotifMsg(`Failed to enable notifications: ${err?.message || 'unknown error'}`)
    }
    setNotifLoading(false)
  }

  async function saveSchedule() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const patch = {}
    if (wakeTime) patch.wake_time = wakeTime + ':00'
    if (bedtime) patch.bedtime = bedtime + ':00'
    if (!Object.keys(patch).length) return
    if (hasGoalsProfile) {
      await supabase.from('goals_profiles').update(patch).eq('user_id', user.id)
    } else {
      await supabase.from('goals_profiles').upsert({ user_id: user.id, ...patch }, { onConflict: 'user_id' })
      setHasGoalsProfile(true)
    }
    // Capture the browser timezone so the Edge Function fires at the user's LOCAL time.
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (tz) await supabase.from('profiles').update({ timezone: tz }).eq('id', user.id)
    } catch {}
    setScheduleSaved(true)
    setTimeout(() => setScheduleSaved(false), 2500)
  }

  // key -> 'HH:MM' custom override, or '' to clear back to the default.
  async function handleSetNotifTime(key, value) {
    const updated = { ...notifTimes }
    if (value) updated[key] = value
    else delete updated[key]
    setNotifTimes(updated)
    setPrefsSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const patch = { notification_times: updated }
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
        if (tz) patch.timezone = tz
      } catch {}
      await supabase.from('profiles').update(patch).eq('id', user.id)
    }
    setPrefsSaving(false)
  }

  async function handleTogglePref(key) {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] }
    setNotifPrefs(updated)
    setPrefsSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('profiles').update({ notification_preferences: updated }).eq('id', user.id)
    setPrefsSaving(false)
  }

  async function handleDisableNotifications() {
    setNotifLoading(true)
    setNotifMsg('')
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setNotifSubscribed(false)
      setNotifMsg('Notifications disabled.')
      setTimeout(() => setNotifMsg(''), 3000)
    } catch {
      setNotifMsg('Failed to disable notifications.')
    }
    setNotifLoading(false)
  }

  async function handleDisconnectHealth() {
    setHealthDisconnecting(true)
    await fetch('/api/health/disconnect', { method: 'POST' })
    setHealthConnected(false)
    setHealthConnectedAt(null)
    setHealthDisconnecting(false)
  }

  async function handleReset() {
    if (!resetConfirm) return
    setResetting(true)
    const res = await fetch('/api/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: resetConfirm.scope, cert: resetConfirm.cert }),
    })
    const json = await res.json()
    setResetting(false)
    setResetConfirm(null)
    if (json.ok) {
      setResetMsg(`${resetConfirm.label} reset successfully.`)
      setTimeout(() => setResetMsg(''), 4000)
    } else {
      setResetMsg('Reset failed. Try again.')
      setTimeout(() => setResetMsg(''), 4000)
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function handleSignOutEverywhere() {
    const supabase = createClient()
    await supabase.auth.signOut({ scope: 'global' })
    router.push('/login')
    router.refresh()
  }

  useEffect(() => {
    if (ownerUnlocked) { fetchInviteCodes(); fetchAdminUsers() }
  }, [ownerUnlocked])

  async function fetchAdminUsers() {
    setAdminLoading(true)
    const res = await fetch('/api/owner/admin/users')
    const json = await res.json()
    setAdminLoading(false)
    if (json.users) setAdminUsers(json.users)
  }

  async function adminAction(userId, action, body, label) {
    const key = userId + action
    setAdminActionLoading(prev => ({ ...prev, [key]: true }))
    setAdminActionMsg(prev => ({ ...prev, [userId]: '' }))
    const res = await fetch(`/api/owner/admin/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    setAdminActionLoading(prev => ({ ...prev, [key]: false }))
    if (json.ok) {
      setAdminActionMsg(prev => ({ ...prev, [userId]: `✓ ${label}` }))
      setTimeout(() => setAdminActionMsg(prev => ({ ...prev, [userId]: '' })), 3000)
      if (action === 'toggle-disable') fetchAdminUsers()
    } else {
      setAdminActionMsg(prev => ({ ...prev, [userId]: `✗ ${json.error}` }))
      setTimeout(() => setAdminActionMsg(prev => ({ ...prev, [userId]: '' })), 4000)
    }
  }

  useEffect(() => {
    if (pinLockedSeconds <= 0) return
    const t = setInterval(() => setPinLockedSeconds(s => s <= 1 ? (clearInterval(t), 0) : s - 1), 1000)
    return () => clearInterval(t)
  }, [pinLockedSeconds > 0])

  async function handleVerifyOwnerPin() {
    if (!pinInput.trim()) return
    setPinSubmitting(true)
    setPinError('')
    const res = await fetch('/api/owner/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: pinInput }),
    })
    const json = await res.json()
    setPinSubmitting(false)
    if (json.ok) {
      const expiry = Date.now() + PIN_SESSION_HOURS * 60 * 60 * 1000
      sessionStorage.setItem(PIN_SESSION_KEY, String(expiry))
      setOwnerUnlocked(true)
      setPinInput('')
      fetchInviteCodes()
    } else if (json.lockedSeconds) {
      setPinLockedSeconds(json.lockedSeconds)
      setPinError(json.error)
      setPinInput('')
    } else {
      setPinError(json.error + (json.attemptsLeft != null ? ` (${json.attemptsLeft} attempt${json.attemptsLeft !== 1 ? 's' : ''} left)` : ''))
    }
  }

  function handleLockOwner() {
    sessionStorage.removeItem(PIN_SESSION_KEY)
    setOwnerUnlocked(false)
    setPinInput('')
    setPinError('')
    setInviteCodes([])
  }

  async function fetchInviteCodes() {
    const supabase = createClient()
    const { data } = await supabase
      .from('invite_codes')
      .select('id, code, used_by, used_at, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setInviteCodes(data)
  }

  async function handleGenerateInvite() {
    setInviteGenerating(true)
    setInviteMsg('')
    const res = await fetch('/api/owner/generate-invite', { method: 'POST' })
    const json = await res.json()
    setInviteGenerating(false)
    if (json.code) { setInviteMsg(json.code); fetchInviteCodes() }
  }

  function handleCopyCode(code) {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(''), 2000)
  }

  function handleCopyLink(code) {
    const url = `${window.location.origin}/join?code=${code}`
    navigator.clipboard.writeText(url)
    setCopiedCode(code + '_link')
    setTimeout(() => setCopiedCode(''), 2000)
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null
    const diff = new Date(dateStr) - new Date()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  // 2FA handlers
  async function handleStartEnroll() {
    setEnrollStep(1)
    setEnrollCode('')
    setEnrollError('')
    setEnrollAuthName('')
    setEnrollLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'CSA', friendlyName: 'Authenticator' })
    setEnrollLoading(false)
    if (error) { setEnrollError(error.message); return }
    setEnrollFactorId(data.id)
    setEnrollQR(data.totp.qr_code)
    setEnrollSecret(data.totp.secret)
    setShowEnrollModal(true)
  }

  async function handleEnrollVerify() {
    if (enrollCode.length < 6) return
    setEnrollLoading(true)
    setEnrollError('')
    const supabase = createClient()
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrollFactorId, code: enrollCode })
    if (error) {
      setEnrollError('Incorrect code. Try again.')
      setEnrollLoading(false)
      return
    }
    // Generate recovery codes
    const res = await fetch('/api/2fa/generate-recovery', { method: 'POST' })
    const json = await res.json()
    setEnrollLoading(false)
    if (json.codes) {
      setRecoveryCodes(json.codes)
      setEnrollStep(3)
    } else {
      setEnrollError('Failed to generate recovery codes.')
    }
  }

  async function handleEnrollDone() {
    // Save authenticator name to profile if provided
    if (enrollAuthName.trim()) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('profiles').upsert({ id: user.id, authenticator_name: enrollAuthName.trim(), updated_at: new Date().toISOString() })
    }
    setShowEnrollModal(false)
    setTwoFactorEnabled(true)
    setTwoFactorId(enrollFactorId)
    setRecoveryCodesLeft(10)
    if (enrollAuthName.trim()) setSavedAuthName(enrollAuthName.trim())
    setEnrollCode('')
    setEnrollQR('')
    setEnrollSecret('')
    setEnrollAuthName('')
    setRecoveryCodes([])
    setRecoveryCodesCopied(false)
  }

  function handleCopyRecoveryCodes() {
    navigator.clipboard.writeText(recoveryCodes.join('\n'))
    setRecoveryCodesCopied(true)
    setTimeout(() => setRecoveryCodesCopied(false), 2000)
  }

  async function handleDisable2FA() {
    if (disable2FACode.length < 6) return
    setDisable2FALoading(true)
    setDisable2FAError('')
    const supabase = createClient()
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: twoFactorId, code: disable2FACode })
    if (error) {
      setDisable2FAError('Incorrect code. Try again.')
      setDisable2FALoading(false)
      return
    }
    await supabase.auth.mfa.unenroll({ factorId: twoFactorId })
    await supabase.from('recovery_codes').delete().eq('user_id', (await supabase.auth.getUser()).data.user.id)
    setDisable2FALoading(false)
    setShowDisable2FAModal(false)
    setTwoFactorEnabled(false)
    setTwoFactorId(null)
    setRecoveryCodesLeft(0)
    setDisable2FACode('')
  }

  // Privacy PIN handlers
  async function handlePrivacyPinUnlock() {
    if (!privacyPinInput.trim()) return
    setPrivacyPinChecking(true)
    setPrivacyPinError('')
    const res = await fetch('/api/settings-pin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: privacyPinInput }),
    })
    setPrivacyPinChecking(false)
    if (res.ok) {
      sessionStorage.setItem(PRIVACY_PIN_SESSION_KEY, '1')
      setPrivacyPinGated(false)
      setPrivacyPinInput('')
    } else {
      setPrivacyPinError('Incorrect PIN. Try again.')
      setPrivacyPinInput('')
    }
  }

  async function handleSetPin() {
    if (newPin.length < 4) { setPinModalError('PIN must be at least 4 digits.'); return }
    if (newPin !== confirmPin) { setPinModalError('PINs do not match.'); return }
    setPinModalLoading(true)
    setPinModalError('')
    const res = await fetch('/api/settings-pin/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: newPin }),
    })
    setPinModalLoading(false)
    if (res.ok) {
      setPrivacyPinSet(true)
      sessionStorage.setItem(PRIVACY_PIN_SESSION_KEY, '1')
      setShowSetPinModal(false)
      setNewPin('')
      setConfirmPin('')
      setPinModalMsg('Privacy PIN set. Settings will be locked on your next visit.')
      setTimeout(() => setPinModalMsg(''), 4000)
    } else {
      setPinModalError('Failed to set PIN. Try again.')
    }
  }

  async function handleRemovePin() {
    setPinModalLoading(true)
    setPinModalError('')
    const res = await fetch('/api/settings-pin/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: removePinInput }),
    })
    setPinModalLoading(false)
    if (res.ok) {
      setPrivacyPinSet(false)
      sessionStorage.removeItem(PRIVACY_PIN_SESSION_KEY)
      setShowRemovePinModal(false)
      setRemovePinInput('')
      setPinModalMsg('Privacy PIN removed.')
      setTimeout(() => setPinModalMsg(''), 3000)
    } else {
      setPinModalError('Incorrect PIN.')
    }
  }

  // Account deletion
  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'DELETE') return
    setDeleting(true)
    setDeleteError('')
    const res = await fetch('/api/delete-account', { method: 'POST' })
    if (res.ok) {
      router.push('/login')
      router.refresh()
    } else {
      const json = await res.json()
      setDeleteError(json.error || 'Deletion failed. Try again.')
      setDeleting(false)
    }
  }

  // Privacy PIN gate — shown before any page content
  if (privacyPinGated) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '36px 32px', maxWidth: '360px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Settings Locked</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>Enter your Privacy PIN to access Settings.</p>
          {privacyPinError && <p style={{ color: 'var(--error)', fontSize: '13px', marginBottom: '12px' }}>{privacyPinError}</p>}
          <input
            type="password"
            inputMode="numeric"
            value={privacyPinInput}
            onChange={e => setPrivacyPinInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handlePrivacyPinUnlock()}
            placeholder="Enter PIN"
            maxLength={12}
            autoFocus
            style={{ width: '100%', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', color: 'var(--text-primary)', fontSize: '20px', outline: 'none', letterSpacing: '0.3em', textAlign: 'center', marginBottom: '12px', boxSizing: 'border-box' }}
          />
          <button
            onClick={handlePrivacyPinUnlock}
            disabled={privacyPinChecking || !privacyPinInput.trim()}
            style={{ width: '100%', backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: '600', cursor: privacyPinChecking || !privacyPinInput.trim() ? 'not-allowed' : 'pointer', opacity: privacyPinChecking || !privacyPinInput.trim() ? 0.5 : 1 }}
          >
            {privacyPinChecking ? 'Checking...' : 'Unlock'}
          </button>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '13px', marginTop: '16px', cursor: 'pointer', textDecoration: 'underline' }}>
            Go back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', padding: '32px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>

        <Link href="/" style={{ color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none', display: 'block', marginBottom: '24px' }}>← Home</Link>

        <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Settings</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Account preferences and app configuration.</p>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '4px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); if (tab.key !== 'danger') setDangerGatePassed(false) }}
              style={{ flex: 1, minWidth: 'max-content', padding: '8px 12px', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: activeTab === tab.key ? '600' : '400', cursor: 'pointer', backgroundColor: activeTab === tab.key ? 'var(--accent-blue)' : 'transparent', color: activeTab === tab.key ? '#E8E8E8' : 'var(--text-secondary)', transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Account tab */}
        {activeTab === 'account' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Account</h2>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Email</span>
                <span style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{email || '—'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Plan</span>
                <span style={{ color: 'var(--text-primary)', fontSize: '14px' }}>Personal</span>
              </div>

              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Display Name</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    style={{ flex: 1, backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={saving || displayName === savedName}
                    style={{ backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: '600', cursor: saving || displayName === savedName ? 'not-allowed' : 'pointer', opacity: saving || displayName === savedName ? 0.5 : 1 }}
                  >
                    {saving ? 'Saving...' : saveMsg || 'Save'}
                  </button>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '6px' }}>This name appears in your greeting on the home screen.</p>
              </div>
            </div>


          </div>
        )}

        {/* Notifications tab */}
        {activeTab === 'notifications' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Enable / disable push */}
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Push Notifications</h2>
              {typeof Notification === 'undefined' ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Push notifications are not supported in this browser.</p>
              ) : notifPermission === 'denied' ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Notifications blocked — tap the lock icon in your address bar to re-enable.</p>
              ) : notifSubscribed ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--success)', fontSize: '13px', fontWeight: '600' }}>Notifications enabled ✓</span>
                  <button onClick={handleDisableNotifications} disabled={notifLoading}
                    style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 16px', color: 'var(--text-secondary)', fontSize: '13px', cursor: notifLoading ? 'not-allowed' : 'pointer', opacity: notifLoading ? 0.6 : 1 }}>
                    {notifLoading ? 'Disabling...' : 'Disable'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Enable to receive briefs, reminders, and smart nudges on this device.</span>
                  <button onClick={handleEnableNotifications} disabled={notifLoading}
                    style={{ backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: notifLoading ? 'not-allowed' : 'pointer', opacity: notifLoading ? 0.6 : 1, flexShrink: 0 }}>
                    {notifLoading ? 'Enabling...' : 'Enable'}
                  </button>
                </div>
              )}
              {notifMsg && <p style={{ color: notifMsg.startsWith('Failed') ? 'var(--error)' : 'var(--success)', fontSize: '12px', marginTop: '8px' }}>{notifMsg}</p>}
              {notifSubscribed && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '10px' }}>
                  Timing is based on your wake time and bedtime from Goals setup. Toggles below control what gets sent.
                  {prefsSaving && <span style={{ marginLeft: 8, color: 'var(--accent-blue)' }}>Saving…</span>}
                </p>
              )}
            </div>

            {/* Schedule — set wake/bedtime, see computed send times */}
            {notifSubscribed && (
              <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
                <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Schedule</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '0 0 16px' }}>Your brief times are based on when you wake and sleep. Set them here (also used across your plan).</p>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600' }}>🌅 Wake time</span>
                    <input type="time" value={wakeTime} onChange={e => setWakeTime(e.target.value)}
                      style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '14px', colorScheme: 'dark' }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600' }}>🌙 Bedtime</span>
                    <input type="time" value={bedtime} onChange={e => setBedtime(e.target.value)}
                      style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '14px', colorScheme: 'dark' }} />
                  </label>
                </div>
                <div style={{ backgroundColor: 'var(--background)', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    ['🌅 Morning Brief', wakeTime ? fmt12(wakeTime) : 'set wake time'],
                    ['☀️ Midday Check-in', wakeTime ? fmt12(addMinutes(wakeTime, 360)) : 'set wake time'],
                    ['🌙 Evening Wrap', bedtime ? fmt12(addMinutes(bedtime, -60)) : 'set bedtime'],
                  ].map(([label, time]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{time}</span>
                    </div>
                  ))}
                </div>
                <button onClick={saveSchedule} disabled={!wakeTime && !bedtime}
                  style={{ backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: '600', cursor: (!wakeTime && !bedtime) ? 'not-allowed' : 'pointer', opacity: (!wakeTime && !bedtime) ? 0.5 : 1 }}>
                  {scheduleSaved ? '✓ Saved' : 'Save Schedule'}
                </button>
              </div>
            )}

            {/* Preference toggles — only shown when subscribed */}
            {notifSubscribed && NOTIF_TYPES.map(group => (
              <div key={group.group} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', marginBottom: '14px' }}>{group.group}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {group.items.map((item, idx) => {
                    const on = notifPrefs[item.key]
                    const def = defaultTimeFor(item, wakeTime, bedtime)
                    const custom = notifTimes[item.key] || ''
                    const effective = custom || def
                    const expanded = expandedHow === item.key
                    return (
                      <div key={item.key} style={{ padding: '12px 0', borderBottom: idx < group.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                            <span style={{ fontSize: '18px', lineHeight: 1 }}>{item.emoji}</span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>{item.label}</span>
                                <button onClick={() => setExpandedHow(expanded ? null : item.key)}
                                  aria-label="How this works"
                                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', padding: 0, lineHeight: 1 }}>ⓘ</button>
                              </div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: 2 }}>{item.desc}</div>
                            </div>
                          </div>
                          {/* Toggle switch */}
                          <button
                            onClick={() => handleTogglePref(item.key)}
                            style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: on ? 'var(--accent-blue)' : 'var(--border)', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background-color 0.2s' }}
                          >
                            <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 18, height: 18, borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s', display: 'block' }} />
                          </button>
                        </div>
                        {expanded && (
                          <div style={{ backgroundColor: 'var(--background)', borderRadius: '8px', padding: '10px 12px', marginTop: 10, color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.5 }}>
                            {item.how}
                          </div>
                        )}
                        {on && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                            {item.base === 'workout' ? (
                              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Timed from your workout — set the time in My Week.</span>
                            ) : (
                              <>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Send at</span>
                                <input type="time" value={effective}
                                  onChange={e => handleSetNotifTime(item.key, e.target.value)}
                                  style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 10px', color: 'var(--text-primary)', fontSize: '13px', colorScheme: 'dark' }} />
                                {custom
                                  ? <button onClick={() => handleSetNotifTime(item.key, '')}
                                      style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '12px', cursor: 'pointer', padding: 0 }}>Reset to default{def ? ` (${fmt12(def)})` : ''}</button>
                                  : <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>default</span>}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {!notifSubscribed && (
              <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                Enable push notifications above to configure which alerts you receive.
              </div>
            )}
          </div>
        )}

        {/* Study tab */}
        {activeTab === 'study' && (
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '20px' }}>Study Preferences</h2>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em', marginBottom: '12px' }}>TARGET EXAM DATES</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {CERTS.map(cert => {
                  const days = daysUntil(examDates[cert.key])
                  return (
                    <div key={cert.key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: cert.color, fontSize: '13px', fontWeight: '600', width: '90px', flexShrink: 0 }}>{cert.label}</span>
                      <input
                        type="date"
                        value={examDates[cert.key] || ''}
                        onChange={e => setExamDates(prev => ({ ...prev, [cert.key]: e.target.value }))}
                        style={{ flex: 1, backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', colorScheme: 'dark' }}
                      />
                      {days !== null && (
                        <span style={{ fontSize: '12px', fontWeight: '600', color: days < 14 ? 'var(--error)' : days < 30 ? 'var(--warning)' : 'var(--success)', flexShrink: 0, minWidth: '70px', textAlign: 'right' }}>
                          {days < 0 ? 'Past' : days === 0 ? 'Today!' : `${days}d away`}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '8px' }}>Exam countdowns appear on your home screen and cert pages.</p>
            </div>

            <div style={{ marginBottom: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em' }}>DAILY QUESTION GOAL</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number" min={20} max={200} value={dailyGoal}
                    onChange={e => setDailyGoal(Math.min(200, Math.max(20, parseInt(e.target.value) || 20)))}
                    style={{ width: '64px', backgroundColor: 'var(--background)', border: '1px solid var(--accent-blue)', borderRadius: '6px', padding: '4px 8px', color: 'var(--accent-blue)', fontSize: '16px', fontWeight: '700', outline: 'none', textAlign: 'center' }}
                  />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>/ day</span>
                </div>
              </div>
              <input type="range" min={20} max={200} step={5} value={dailyGoal} onChange={e => setDailyGoal(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent-blue)', cursor: 'pointer' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>20 — minimum</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{dailyGoal <= 30 ? 'Light & steady' : dailyGoal <= 60 ? 'Solid daily habit' : dailyGoal <= 100 ? 'Serious grind' : 'Full exam crunch'}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>200 — maximum</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '8px' }}>Your streak tracker counts a day complete when you hit this goal.</p>
            </div>

            <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em', marginBottom: '12px' }}>DEFAULT CERTIFICATION</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div onClick={() => setDefaultCert('')} style={{ padding: '8px 16px', backgroundColor: !defaultCert ? 'rgba(0,128,255,0.1)' : 'var(--background)', border: `1px solid ${!defaultCert ? 'var(--accent-blue)' : 'var(--border)'}`, borderRadius: '8px', color: !defaultCert ? 'var(--accent-blue)' : 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', fontWeight: !defaultCert ? '600' : '400' }}>No preference</div>
                {CERTS.map(cert => (
                  <div key={cert.key} onClick={() => setDefaultCert(cert.key)} style={{ padding: '8px 16px', backgroundColor: defaultCert === cert.key ? `${cert.color}18` : 'var(--background)', border: `1px solid ${defaultCert === cert.key ? cert.color : 'var(--border)'}`, borderRadius: '8px', color: defaultCert === cert.key ? cert.color : 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', fontWeight: defaultCert === cert.key ? '600' : '400' }}>{cert.label}</div>
                ))}
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '8px' }}>Pre-selects this cert when you open Take a Test.</p>
            </div>

            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
              {prefSaveMsg && <span style={{ color: prefSaveMsg === 'Saved!' ? 'var(--success)' : 'var(--error)', fontSize: '13px' }}>{prefSaveMsg}</span>}
              <button onClick={handleSavePrefs} disabled={prefSaving} style={{ backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '13px', fontWeight: '600', cursor: prefSaving ? 'not-allowed' : 'pointer', opacity: prefSaving ? 0.5 : 1 }}>
                {prefSaving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        )}

        {/* Data & Reset tab */}
        {activeTab === 'data' && (
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Data & Reset</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>Clear test data or plans if you were just testing things out and want a clean start.</p>

            {resetMsg && (
              <div style={{ backgroundColor: resetMsg.includes('successfully') ? 'rgba(46,204,113,0.08)' : 'rgba(204,0,0,0.08)', border: `1px solid ${resetMsg.includes('successfully') ? 'rgba(46,204,113,0.3)' : 'rgba(204,0,0,0.3)'}`, borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: resetMsg.includes('successfully') ? 'var(--success)' : 'var(--error)' }}>
                {resetMsg}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Study Hub</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {CERTS.map(cert => (
                  <div key={cert.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <div>
                      <div style={{ color: cert.color, fontSize: '13px', fontWeight: '600' }}>{cert.label}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>Questions, scores, test history, flashcard progress</div>
                    </div>
                    <button onClick={() => setResetConfirm({ scope: 'cert', cert: cert.key, label: `${cert.label} study data` })}
                      style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--error)'; e.currentTarget.style.color = 'var(--error)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                      Reset
                    </button>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>All Certs</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>Wipe all questions, scores, bookmarks, and flashcard progress</div>
                  </div>
                  <button onClick={() => setResetConfirm({ scope: 'all_study', label: 'All study data' })}
                    style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--error)'; e.currentTarget.style.color = 'var(--error)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                    Reset All
                  </button>
                </div>
              </div>
            </div>

            <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border)', marginBottom: '20px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Workouts</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>Current Plan</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>Delete your active workout plan — keeps your fitness profile</div>
                  </div>
                  <button onClick={() => setResetConfirm({ scope: 'workout_plan', label: 'Workout plan' })}
                    style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--error)'; e.currentTarget.style.color = 'var(--error)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                    Reset
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>Workout Log History</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>Delete all logged workout sessions and set history</div>
                  </div>
                  <button onClick={() => setResetConfirm({ scope: 'workout_logs', label: 'Workout log history' })}
                    style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--error)'; e.currentTarget.style.color = 'var(--error)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                    Reset
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>Full Workout Reset</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>Delete plan and fitness profile — restart the setup from scratch</div>
                  </div>
                  <button onClick={() => setResetConfirm({ scope: 'workout_profile', label: 'Workout profile & plan' })}
                    style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--error)'; e.currentTarget.style.color = 'var(--error)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                    Reset All
                  </button>
                </div>
              </div>
            </div>

            <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Goals</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>Goals Profile</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>Delete goals profile and AI overview — returns to goals setup on next visit</div>
                </div>
                <button onClick={() => setResetConfirm({ scope: 'goals_profile', label: 'Goals profile' })}
                  style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--error)'; e.currentTarget.style.color = 'var(--error)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                  Reset
                </button>
              </div>

              <div style={{ marginTop: '12px' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '10px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px', marginTop: '4px' }}>Health Tracking</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { scope: 'body_measurements', label: 'Body Measurements', desc: 'Delete all logged body measurements and weight entries' },
                    { scope: 'daily_checkins', label: 'Daily Check-In History', desc: 'Delete all energy and mood check-in entries' },
                    { scope: 'water_logs', label: 'Water Log History', desc: 'Delete all water intake entries' },
                    { scope: 'supplement_stack', label: 'Supplement Stack', desc: 'Remove all supplements from your stack' },
                    { scope: 'supplement_logs', label: 'Supplement Log History', desc: 'Clear all "taken today" history — keeps your stack intact' },
                    { scope: 'food_log', label: 'Food Log History', desc: 'Delete all logged food entries' },
                    { scope: 'my_foods', label: 'My Foods Library', desc: 'Delete all saved custom foods' },
                    { scope: 'stretch_logs', label: 'Stretch Log History', desc: 'Delete all stretch session logs' },
                    { scope: 'progress_photos', label: 'Progress Photos', desc: 'Delete all progress photos permanently' },
                  ].map(item => (
                    <div key={item.scope} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                      <div>
                        <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>{item.label}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>{item.desc}</div>
                      </div>
                      <button onClick={() => setResetConfirm({ scope: item.scope, label: item.label })}
                        style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--error)'; e.currentTarget.style.color = 'var(--error)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                        Reset
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security tab */}
        {activeTab === 'security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Sign out */}
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Sessions</h2>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button onClick={handleLogout} style={{ backgroundColor: 'var(--error-border)', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                  Sign Out
                </button>
                <button onClick={handleSignOutEverywhere} style={{ backgroundColor: 'transparent', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                  Sign Out Everywhere
                </button>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '10px' }}>"Sign Out Everywhere" signs you out of all devices and sessions simultaneously.</p>
            </div>

            {/* Privacy PIN */}
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Privacy PIN</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>Lock Settings behind a PIN — protects against someone picking up your device and browsing your data.</p>

              {pinModalMsg && (
                <div style={{ backgroundColor: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: 'var(--success)' }}>
                  {pinModalMsg}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: privacyPinSet ? 'var(--success)' : 'var(--border)' }} />
                  <span style={{ color: privacyPinSet ? 'var(--success)' : 'var(--text-secondary)', fontSize: '14px', fontWeight: '600' }}>
                    {privacyPinSet ? 'Enabled' : 'Not set'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => { setShowSetPinModal(true); setNewPin(''); setConfirmPin(''); setPinModalError('') }}
                    style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '7px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer' }}
                  >
                    {privacyPinSet ? 'Change PIN' : 'Set PIN'}
                  </button>
                  {privacyPinSet && (
                    <button
                      onClick={() => { setShowRemovePinModal(true); setRemovePinInput(''); setPinModalError('') }}
                      style={{ backgroundColor: 'transparent', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: '7px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Two-Factor Authentication */}
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Two-Factor Authentication</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>Require an authenticator app code at every login.</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: twoFactorEnabled ? 'var(--success)' : 'var(--border)' }} />
                  <div>
                    <span style={{ color: twoFactorEnabled ? 'var(--success)' : 'var(--text-secondary)', fontSize: '14px', fontWeight: '600' }}>
                      {twoFactorEnabled ? 'Enabled' : 'Not set'}
                    </span>
                    {twoFactorEnabled && (
                      <span style={{ color: recoveryCodesLeft <= 2 ? 'var(--warning)' : 'var(--text-secondary)', fontSize: '12px', marginLeft: '10px' }}>
                        {recoveryCodesLeft} recovery code{recoveryCodesLeft !== 1 ? 's' : ''} remaining
                      </span>
                    )}
                    {twoFactorEnabled && savedAuthName && (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>
                        Used through {savedAuthName}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {twoFactorEnabled ? (
                    <button onClick={() => { setShowDisable2FAModal(true); setDisable2FACode(''); setDisable2FAError('') }}
                      style={{ backgroundColor: 'transparent', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: '7px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer' }}>
                      Disable
                    </button>
                  ) : (
                    <button onClick={handleStartEnroll} disabled={enrollLoading}
                      style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '7px', padding: '7px 14px', fontSize: '13px', cursor: enrollLoading ? 'not-allowed' : 'pointer', opacity: enrollLoading ? 0.5 : 1 }}>
                      {enrollLoading ? 'Loading...' : 'Enable 2FA'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Owner Access (owner only) */}
            {isOwner && (
              <div style={{ backgroundColor: 'var(--surface)', border: `1px solid ${ownerUnlocked ? 'var(--accent-purple)' : 'var(--border)'}`, borderRadius: '10px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h2 style={{ color: 'var(--accent-purple)', fontSize: '14px', fontWeight: '600' }}>Owner Access</h2>
                  {ownerUnlocked && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-purple)', fontSize: '12px', fontWeight: '600' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--accent-purple)', display: 'inline-block' }} />
                      Unlocked · {PIN_SESSION_HOURS}h session
                    </span>
                  )}
                </div>

                {ownerUnlocked ? (
                  <div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>Owner tools are active for this session. Admin panel coming in a later phase.</p>
                    <button onClick={handleLockOwner} style={{ backgroundColor: 'transparent', border: '1px solid var(--accent-purple)', color: 'var(--accent-purple)', borderRadius: '8px', padding: '8px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                      Lock Owner Access
                    </button>
                  </div>
                ) : pinLockedSeconds > 0 ? (
                  <div style={{ backgroundColor: 'rgba(204,0,0,0.08)', border: '1px solid rgba(204,0,0,0.3)', borderRadius: '8px', padding: '12px 14px' }}>
                    <div style={{ color: 'var(--error)', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Too many incorrect attempts</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Try again in {Math.floor(pinLockedSeconds / 60)}m {pinLockedSeconds % 60}s</div>
                  </div>
                ) : (
                  <div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '14px' }}>Enter your owner PIN to unlock admin controls for this session.</p>
                    {pinError && <p style={{ color: 'var(--error)', fontSize: '13px', marginBottom: '10px' }}>{pinError}</p>}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="password" inputMode="numeric" value={pinInput}
                        onChange={e => setPinInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleVerifyOwnerPin()}
                        placeholder="Enter PIN" maxLength={8}
                        style={{ width: '140px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '16px', outline: 'none', letterSpacing: '0.2em', textAlign: 'center' }}
                      />
                      <button onClick={handleVerifyOwnerPin} disabled={pinSubmitting || !pinInput.trim()}
                        style={{ backgroundColor: 'var(--accent-purple)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: '600', cursor: pinSubmitting || !pinInput.trim() ? 'not-allowed' : 'pointer', opacity: pinSubmitting || !pinInput.trim() ? 0.5 : 1 }}>
                        {pinSubmitting ? 'Checking...' : 'Unlock'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Invite Friends (owner unlocked only) */}
            {ownerUnlocked && (
              <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>Invite Friends</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Generate a one-time code and share it so someone can create an account.</p>
                  </div>
                  <button onClick={handleGenerateInvite} disabled={inviteGenerating}
                    style={{ backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: inviteGenerating ? 'not-allowed' : 'pointer', opacity: inviteGenerating ? 0.5 : 1, flexShrink: 0 }}>
                    {inviteGenerating ? 'Generating...' : '+ New Code'}
                  </button>
                </div>
                {inviteCodes.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>No invite codes yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {inviteCodes.map(invite => (
                      <div key={invite.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: 'var(--background)', border: `1px solid ${invite.used_by ? 'var(--border)' : 'rgba(0,128,255,0.3)'}`, borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ color: invite.used_by ? 'var(--text-secondary)' : 'var(--accent-blue)', fontFamily: 'monospace', fontSize: '15px', fontWeight: '700', letterSpacing: '0.1em', textDecoration: invite.used_by ? 'line-through' : 'none' }}>{invite.code}</span>
                          {invite.used_by
                            ? <span style={{ color: 'var(--text-secondary)', fontSize: '11px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 6px' }}>Used</span>
                            : <span style={{ color: 'var(--success)', fontSize: '11px', backgroundColor: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.3)', borderRadius: '4px', padding: '2px 6px' }}>Active</span>
                          }
                        </div>
                        {!invite.used_by && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => handleCopyCode(invite.code)} style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}>
                              {copiedCode === invite.code ? '✓ Copied' : 'Copy Code'}
                            </button>
                            <button onClick={() => handleCopyLink(invite.code)} style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}>
                              {copiedCode === invite.code + '_link' ? '✓ Copied' : 'Copy Link'}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Admin Panel (owner unlocked only) */}
            {ownerUnlocked && (
              <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--accent-purple)', borderRadius: '10px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h2 style={{ color: 'var(--accent-purple)', fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>User Management</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>All accounts on this app.</p>
                  </div>
                  <button onClick={fetchAdminUsers} disabled={adminLoading}
                    style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: adminLoading ? 'not-allowed' : 'pointer', opacity: adminLoading ? 0.5 : 1 }}>
                    {adminLoading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>

                {adminUsers.length === 0 && !adminLoading && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '12px 0' }}>No users found.</p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {adminUsers.map(u => {
                    const isOwnerSelf = u.email.toLowerCase() === OWNER_EMAIL
                    const key = (action) => u.id + action
                    return (
                      <div key={u.id} style={{ backgroundColor: 'var(--background)', border: `1px solid ${u.is_disabled ? 'rgba(204,0,0,0.3)' : 'var(--border)'}`, borderRadius: '8px', padding: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div>
                            <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>
                              {u.display_name || '—'}
                              {isOwnerSelf && <span style={{ color: 'var(--accent-purple)', fontSize: '11px', marginLeft: '8px' }}>you</span>}
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>{u.email}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px' }}>
                              Joined {new Date(u.created_at).toLocaleDateString()}
                              {u.last_sign_in_at && ` · Last seen ${new Date(u.last_sign_in_at).toLocaleDateString()}`}
                              {u.has_pin && ' · 🔒 PIN set'}
                            </div>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '4px', backgroundColor: u.is_disabled ? 'rgba(204,0,0,0.1)' : 'rgba(46,204,113,0.08)', border: `1px solid ${u.is_disabled ? 'rgba(204,0,0,0.3)' : 'rgba(46,204,113,0.3)'}`, color: u.is_disabled ? 'var(--error)' : 'var(--success)', flexShrink: 0 }}>
                            {u.is_disabled ? 'Disabled' : 'Active'}
                          </span>
                        </div>

                        {adminActionMsg[u.id] && (
                          <div style={{ fontSize: '12px', color: adminActionMsg[u.id].startsWith('✓') ? 'var(--success)' : 'var(--error)', marginBottom: '8px' }}>
                            {adminActionMsg[u.id]}
                          </div>
                        )}

                        {!isOwnerSelf && (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => adminAction(u.id, 'toggle-disable', { userId: u.id, disabled: !u.is_disabled }, u.is_disabled ? 'Account enabled' : 'Account disabled')}
                              disabled={!!adminActionLoading[key('toggle-disable')]}
                              style={{ backgroundColor: 'transparent', border: `1px solid ${u.is_disabled ? 'var(--success)' : 'var(--error)'}`, color: u.is_disabled ? 'var(--success)' : 'var(--error)', borderRadius: '5px', padding: '4px 10px', fontSize: '11px', cursor: adminActionLoading[key('toggle-disable')] ? 'not-allowed' : 'pointer', opacity: adminActionLoading[key('toggle-disable')] ? 0.5 : 1 }}>
                              {u.is_disabled ? 'Enable' : 'Disable'}
                            </button>
                            <button
                              onClick={() => adminAction(u.id, 'force-logout', { userId: u.id }, 'Signed out everywhere')}
                              disabled={!!adminActionLoading[key('force-logout')]}
                              style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '5px', padding: '4px 10px', fontSize: '11px', cursor: adminActionLoading[key('force-logout')] ? 'not-allowed' : 'pointer', opacity: adminActionLoading[key('force-logout')] ? 0.5 : 1 }}>
                              Force Logout
                            </button>
                            <button
                              onClick={() => adminAction(u.id, 'send-reset', { email: u.email }, 'Password reset email sent')}
                              disabled={!!adminActionLoading[key('send-reset')]}
                              style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '5px', padding: '4px 10px', fontSize: '11px', cursor: adminActionLoading[key('send-reset')] ? 'not-allowed' : 'pointer', opacity: adminActionLoading[key('send-reset')] ? 0.5 : 1 }}>
                              Send Password Reset
                            </button>
                            {u.has_pin && (
                              <button
                                onClick={() => adminAction(u.id, 'clear-pin', { userId: u.id }, 'Privacy PIN cleared')}
                                disabled={!!adminActionLoading[key('clear-pin')]}
                                style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '5px', padding: '4px 10px', fontSize: '11px', cursor: adminActionLoading[key('clear-pin')] ? 'not-allowed' : 'pointer', opacity: adminActionLoading[key('clear-pin')] ? 0.5 : 1 }}>
                                Clear PIN
                              </button>
                            )}
                            {u.has_2fa && (
                              <button
                                onClick={() => adminAction(u.id, 'reset-2fa', { userId: u.id }, '2FA reset')}
                                disabled={!!adminActionLoading[key('reset-2fa')]}
                                style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '5px', padding: '4px 10px', fontSize: '11px', cursor: adminActionLoading[key('reset-2fa')] ? 'not-allowed' : 'pointer', opacity: adminActionLoading[key('reset-2fa')] ? 0.5 : 1 }}>
                                Reset 2FA
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Connected Apps */}
            {showHealthSection && (
              <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
                <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Connected Apps</h2>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(66,133,244,0.1)', border: '1px solid rgba(66,133,244,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>❤️</div>
                    <div>
                      <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}>Google Health</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{healthConnected ? `Connected${healthConnectedAt ? ` · since ${healthConnectedAt}` : ''}` : 'Steps, sleep, heart rate'}</div>
                    </div>
                  </div>
                  {healthConnected ? (
                    <button onClick={handleDisconnectHealth} disabled={healthDisconnecting}
                      style={{ backgroundColor: 'var(--error-border)', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: healthDisconnecting ? 'not-allowed' : 'pointer', opacity: healthDisconnecting ? 0.5 : 1 }}>
                      {healthDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                  ) : (
                    <a href="/api/health/connect" style={{ backgroundColor: 'rgba(66,133,244,0.1)', border: '1px solid rgba(66,133,244,0.4)', color: '#4285F4', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>Connect</a>
                  )}
                </div>
                {searchParams.get('health') === 'connected' && <p style={{ color: 'var(--success)', fontSize: '12px', marginTop: '12px' }}>✓ Google Health connected successfully.</p>}
                {searchParams.get('health') === 'error' && <p style={{ color: 'var(--error)', fontSize: '12px', marginTop: '12px' }}>Failed to connect. Please try again.</p>}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Reset confirmation modal */}
      {resetConfirm && (
        <div onClick={() => !resetting && setResetConfirm(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--error)', borderRadius: '12px', maxWidth: '400px', width: '100%', padding: '28px' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>⚠️</div>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>Reset {resetConfirm.label}?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              This will permanently delete all <strong style={{ color: 'var(--text-primary)' }}>{resetConfirm.label.toLowerCase()}</strong> for your account. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setResetConfirm(null)} disabled={resetting} style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleReset} disabled={resetting} style={{ backgroundColor: 'var(--error)', border: 'none', color: '#fff', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: '600', cursor: resetting ? 'not-allowed' : 'pointer', opacity: resetting ? 0.6 : 1 }}>
                {resetting ? 'Resetting...' : 'Yes, Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set / Change PIN modal */}
      {showSetPinModal && (
        <div onClick={() => !pinModalLoading && (setShowSetPinModal(false), setNewPin(''), setConfirmPin(''), setPinModalError(''))} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', maxWidth: '360px', width: '100%', padding: '28px' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>{privacyPinSet ? 'Change' : 'Set'} Privacy PIN</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>Must be at least 4 digits. This locks Settings on your next visit.</p>
            {pinModalError && <p style={{ color: 'var(--error)', fontSize: '13px', marginBottom: '12px' }}>{pinModalError}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <input
                type="password" inputMode="numeric" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="New PIN" maxLength={12} autoFocus
                style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '11px 14px', color: 'var(--text-primary)', fontSize: '18px', outline: 'none', letterSpacing: '0.25em', textAlign: 'center' }}
              />
              <input
                type="password" inputMode="numeric" value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleSetPin()}
                placeholder="Confirm PIN" maxLength={12}
                style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '11px 14px', color: 'var(--text-primary)', fontSize: '18px', outline: 'none', letterSpacing: '0.25em', textAlign: 'center' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowSetPinModal(false); setNewPin(''); setConfirmPin(''); setPinModalError('') }} disabled={pinModalLoading}
                style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSetPin} disabled={pinModalLoading || !newPin || !confirmPin}
                style={{ backgroundColor: 'var(--accent-blue)', border: 'none', color: '#fff', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: '600', cursor: pinModalLoading || !newPin || !confirmPin ? 'not-allowed' : 'pointer', opacity: pinModalLoading || !newPin || !confirmPin ? 0.5 : 1 }}>
                {pinModalLoading ? 'Saving...' : 'Save PIN'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove PIN modal */}
      {showRemovePinModal && (
        <div onClick={() => !pinModalLoading && (setShowRemovePinModal(false), setRemovePinInput(''), setPinModalError(''))} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', maxWidth: '360px', width: '100%', padding: '28px' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>Remove Privacy PIN</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>Enter your current PIN to confirm removal.</p>
            {pinModalError && <p style={{ color: 'var(--error)', fontSize: '13px', marginBottom: '12px' }}>{pinModalError}</p>}
            <input
              type="password" inputMode="numeric" value={removePinInput} onChange={e => setRemovePinInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleRemovePin()}
              placeholder="Current PIN" maxLength={12} autoFocus
              style={{ width: '100%', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '11px 14px', color: 'var(--text-primary)', fontSize: '18px', outline: 'none', letterSpacing: '0.25em', textAlign: 'center', marginBottom: '20px', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowRemovePinModal(false); setRemovePinInput(''); setPinModalError('') }} disabled={pinModalLoading}
                style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleRemovePin} disabled={pinModalLoading || !removePinInput}
                style={{ backgroundColor: 'var(--error)', border: 'none', color: '#fff', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: '600', cursor: pinModalLoading || !removePinInput ? 'not-allowed' : 'pointer', opacity: pinModalLoading || !removePinInput ? 0.5 : 1 }}>
                {pinModalLoading ? 'Removing...' : 'Remove PIN'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Enrollment modal */}
      {showEnrollModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', maxWidth: '420px', width: '100%', padding: '28px' }}>

            {enrollStep === 1 && (
              <>
                <h3 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>Step 1 — Scan QR Code</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>Open your authenticator app (Google Authenticator, Authy, 1Password) and scan this code.</p>
                {enrollQR && (
                  <div style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '8px', display: 'inline-block', marginBottom: '16px' }}>
                    <img src={enrollQR} alt="2FA QR Code" style={{ width: '180px', height: '180px', display: 'block' }} />
                  </div>
                )}
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>Can't scan? Enter this code manually:</p>
                <div style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', fontFamily: 'monospace', fontSize: '13px', color: 'var(--accent-blue)', letterSpacing: '0.1em', marginBottom: '20px', wordBreak: 'break-all' }}>
                  {enrollSecret}
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>WHICH APP ARE YOU USING? <span style={{ fontWeight: '400', color: 'var(--text-secondary)' }}>(optional)</span></label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['Google Authenticator', 'Authy', '1Password', 'Microsoft Authenticator', 'Other'].map(name => (
                      <button key={name} type="button" onClick={() => setEnrollAuthName(name)}
                        style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', border: `1px solid ${enrollAuthName === name ? 'var(--accent-blue)' : 'var(--border)'}`, backgroundColor: enrollAuthName === name ? 'rgba(0,128,255,0.1)' : 'var(--background)', color: enrollAuthName === name ? 'var(--accent-blue)' : 'var(--text-secondary)', fontWeight: enrollAuthName === name ? '600' : '400' }}>
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={() => { setShowEnrollModal(false); setEnrollQR(''); setEnrollSecret('') }}
                    style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={() => { setEnrollStep(2); setEnrollCode(''); setEnrollError('') }}
                    style={{ backgroundColor: 'var(--accent-blue)', border: 'none', color: '#fff', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                    I've scanned it →
                  </button>
                </div>
              </>
            )}

            {enrollStep === 2 && (
              <>
                <h3 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>Step 2 — Verify Code</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>Enter the 6-digit code from your authenticator app to confirm setup.</p>
                {enrollError && <p style={{ color: 'var(--error)', fontSize: '13px', marginBottom: '12px' }}>{enrollError}</p>}
                <input
                  type="text" inputMode="numeric" value={enrollCode}
                  onChange={e => setEnrollCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={e => e.key === 'Enter' && handleEnrollVerify()}
                  placeholder="000000" autoFocus maxLength={6}
                  style={{ width: '100%', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px', color: 'var(--text-primary)', fontSize: '28px', outline: 'none', letterSpacing: '0.4em', textAlign: 'center', marginBottom: '20px', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setEnrollStep(1)} disabled={enrollLoading}
                    style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', cursor: 'pointer' }}>Back</button>
                  <button onClick={handleEnrollVerify} disabled={enrollLoading || enrollCode.length < 6}
                    style={{ backgroundColor: 'var(--accent-blue)', border: 'none', color: '#fff', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: '600', cursor: enrollLoading || enrollCode.length < 6 ? 'not-allowed' : 'pointer', opacity: enrollLoading || enrollCode.length < 6 ? 0.5 : 1 }}>
                    {enrollLoading ? 'Verifying...' : 'Confirm'}
                  </button>
                </div>
              </>
            )}

            {enrollStep === 3 && (
              <>
                <h3 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>Step 3 — Save Recovery Codes</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>
                  These codes let you sign in if you lose access to your authenticator. Each code works once.
                </p>
                <p style={{ color: 'var(--warning)', fontSize: '12px', fontWeight: '600', marginBottom: '16px' }}>⚠️ These will not be shown again. Save them now.</p>
                <div style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '14px' }}>
                  {recoveryCodes.map((code, i) => (
                    <span key={i} style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-primary)', letterSpacing: '0.05em' }}>{code}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={handleCopyRecoveryCodes}
                    style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', cursor: 'pointer' }}>
                    {recoveryCodesCopied ? '✓ Copied' : 'Copy All'}
                  </button>
                  <button onClick={handleEnrollDone}
                    style={{ backgroundColor: 'var(--success)', border: 'none', color: '#fff', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                    I've saved them — Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Disable 2FA modal */}
      {showDisable2FAModal && (
        <div onClick={() => !disable2FALoading && (setShowDisable2FAModal(false), setDisable2FACode(''), setDisable2FAError(''))} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', maxWidth: '360px', width: '100%', padding: '28px' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>Disable 2FA</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>Enter your current authenticator code to confirm.</p>
            {disable2FAError && <p style={{ color: 'var(--error)', fontSize: '13px', marginBottom: '12px' }}>{disable2FAError}</p>}
            <input
              type="text" inputMode="numeric" value={disable2FACode}
              onChange={e => setDisable2FACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={e => e.key === 'Enter' && handleDisable2FA()}
              placeholder="000000" autoFocus
              style={{ width: '100%', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px', color: 'var(--text-primary)', fontSize: '28px', outline: 'none', letterSpacing: '0.4em', textAlign: 'center', marginBottom: '20px', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowDisable2FAModal(false); setDisable2FACode(''); setDisable2FAError('') }} disabled={disable2FALoading}
                style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDisable2FA} disabled={disable2FALoading || disable2FACode.length < 6}
                style={{ backgroundColor: 'var(--error)', border: 'none', color: '#fff', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: '600', cursor: disable2FALoading || disable2FACode.length < 6 ? 'not-allowed' : 'pointer', opacity: disable2FALoading || disable2FACode.length < 6 ? 0.5 : 1 }}>
                {disable2FALoading ? 'Disabling...' : 'Disable 2FA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone tab */}
      {activeTab === 'danger' && (
        !dangerGatePassed ? (
          <div style={{ maxWidth: '480px', margin: '0 auto', paddingTop: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ color: 'var(--error)', fontSize: '20px', fontWeight: '700', marginBottom: '12px' }}>Danger Zone</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.7', marginBottom: '8px' }}>
              This section contains <strong style={{ color: 'var(--text-primary)' }}>permanent, irreversible actions</strong> — including the ability to delete your account and all associated data.
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.7', marginBottom: '28px' }}>
              There is no undo, no recovery, and no way to restore deleted data. Only continue if you know what you're doing.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => setActiveTab('account')}
                style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                ← Take Me Back
              </button>
              <button onClick={() => setDangerGatePassed(true)}
                style={{ backgroundColor: 'transparent', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                I understand, continue →
              </button>
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <button onClick={() => setDangerGatePassed(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', padding: 0 }}>← Back</button>
              <h2 style={{ color: 'var(--error)', fontSize: '16px', fontWeight: '700', margin: 0 }}>Danger Zone</h2>
            </div>
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid rgba(204,0,0,0.3)', borderRadius: '10px', padding: '20px' }}>
              <h3 style={{ color: 'var(--error)', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Delete Account</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px', lineHeight: '1.6' }}>
                Permanently deletes your account and <strong style={{ color: 'var(--text-primary)' }}>all associated data</strong> — study history, test scores, health data, workout plans, goals, food logs, and everything else. This cannot be undone.
              </p>
              <button
                onClick={() => { setShowDeleteModal(true); setDeleteConfirmText(''); setDeleteError('') }}
                style={{ backgroundColor: 'transparent', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                Delete My Account
              </button>
            </div>
          </div>
        )
      )}

      {/* Delete Account modal */}
      {showDeleteModal && (
        <div onClick={() => !deleting && (setShowDeleteModal(false), setDeleteConfirmText(''), setDeleteError(''))} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--error)', borderRadius: '12px', maxWidth: '420px', width: '100%', padding: '28px' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>💀</div>
            <h3 style={{ color: 'var(--error)', fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>Delete Your Account</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '8px' }}>
              This will <strong style={{ color: 'var(--text-primary)' }}>permanently delete</strong> your account and all associated data — study history, test scores, health data, workout plans, goals, and everything else.
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
              This <strong style={{ color: 'var(--error)' }}>cannot be undone</strong>. Type <strong style={{ color: 'var(--text-primary)', letterSpacing: '0.05em' }}>DELETE</strong> to confirm.
            </p>
            {deleteError && <p style={{ color: 'var(--error)', fontSize: '13px', marginBottom: '12px' }}>{deleteError}</p>}
            <input
              type="text" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE here" autoFocus
              style={{ width: '100%', backgroundColor: 'var(--background)', border: `1px solid ${deleteConfirmText === 'DELETE' ? 'var(--error)' : 'var(--border)'}`, borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', marginBottom: '20px', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); setDeleteError('') }} disabled={deleting}
                style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDeleteAccount} disabled={deleting || deleteConfirmText !== 'DELETE'}
                style={{ backgroundColor: deleteConfirmText === 'DELETE' ? 'var(--error)' : 'transparent', border: '1px solid var(--error)', color: deleteConfirmText === 'DELETE' ? '#fff' : 'var(--error)', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: '600', cursor: deleting || deleteConfirmText !== 'DELETE' ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1, transition: 'all 0.15s' }}>
                {deleting ? 'Deleting...' : 'Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SettingsPage() {
  return <Suspense><SettingsPageInner /></Suspense>
}
