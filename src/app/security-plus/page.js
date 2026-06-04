export default function SecurityPlusPage() {
  return (
    <div>
      {/* Header */}
      <div style={{marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div>
          <h1 style={{color: '#CC0000', fontSize: '28px', fontWeight: '600', marginBottom: '4px'}}>
            Security+
          </h1>
          <p style={{color: 'var(--text-secondary)'}}>
            CompTIA Security+
          </p>
        </div>
        <button style={{
          backgroundColor: '#CC0000',
          color: '#E8E8E8',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer'
        }}>
          Take a Security+ Test
        </button>
      </div>

      {/* Readiness Score */}
      <div style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '24px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '32px'
      }}>
        <div>
          <div style={{color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px'}}>Overall Readiness</div>
          <div style={{color: '#CC0000', fontSize: '48px', fontWeight: '700'}}>45%</div>
        </div>
        <div style={{flex: 1}}>
          <div style={{
            height: '8px',
            backgroundColor: 'var(--border)',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: '45%',
              backgroundColor: '#CC0000',
              borderRadius: '4px'
            }}/>
          </div>
        </div>
        <div style={{display: 'flex', gap: '32px'}}>
          {[
            { label: 'Questions Done', value: '0' },
            { label: 'Tests Taken', value: '0' },
            { label: 'Last Studied', value: 'Never' },
          ].map((stat) => (
            <div key={stat.label}>
              <div style={{color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px'}}>{stat.label}</div>
              <div style={{color: 'var(--text-primary)', fontSize: '18px', fontWeight: '600'}}>{stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Topic Buckets */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px'}}>
        <div style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid #1A5C2A',
          borderRadius: '10px',
          padding: '20px',
        }}>
          <h2 style={{color: '#2ECC71', fontSize: '16px', fontWeight: '600', marginBottom: '4px'}}>Strong Topics</h2>
          <p style={{color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px'}}>Consistently answering correctly</p>
          <p style={{color: 'var(--text-secondary)', fontSize: '14px'}}>No data yet. Take a test to get started.</p>
        </div>
        <div style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid #7B6000',
          borderRadius: '10px',
          padding: '20px',
        }}>
          <h2 style={{color: '#F1C40F', fontSize: '16px', fontWeight: '600', marginBottom: '4px'}}>Average Topics</h2>
          <p style={{color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px'}}>Inconsistent — needs more practice</p>
          <p style={{color: 'var(--text-secondary)', fontSize: '14px'}}>No data yet. Take a test to get started.</p>
        </div>
        <div style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid #8B0000',
          borderRadius: '10px',
          padding: '20px',
        }}>
          <h2 style={{color: '#CC0000', fontSize: '16px', fontWeight: '600', marginBottom: '4px'}}>Weak Topics</h2>
          <p style={{color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px'}}>Consistently missing — priority focus</p>
          <p style={{color: 'var(--text-secondary)', fontSize: '14px'}}>No data yet. Take a test to get started.</p>
        </div>
      </div>
    </div>
  )
}