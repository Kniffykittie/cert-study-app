import Link from 'next/link'

// Shared empty-state block — icon + title + subtitle, optional CTA link.
// Use anywhere a list/section has no data, for a consistent "feels finished" look.
export default function EmptyState({ icon = '📭', title, subtitle, ctaLabel, ctaHref, color = 'var(--accent-blue)', compact = false }) {
  return (
    <div style={{ textAlign: 'center', padding: compact ? '32px 20px' : '56px 24px', color: 'var(--text-secondary)' }}>
      <div style={{ fontSize: compact ? '28px' : '34px', marginBottom: '12px' }}>{icon}</div>
      {title && <p style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 6px' }}>{title}</p>}
      {subtitle && <p style={{ fontSize: '14px', lineHeight: 1.5, margin: '0 auto', maxWidth: '340px' }}>{subtitle}</p>}
      {ctaLabel && ctaHref && (
        <Link href={ctaHref} style={{ display: 'inline-block', marginTop: '18px', backgroundColor: color, color: '#fff', textDecoration: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: '600' }}>
          {ctaLabel}
        </Link>
      )}
    </div>
  )
}
