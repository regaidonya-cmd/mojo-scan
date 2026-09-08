'use client'

export function ProgressBar({ progress }: { progress: number }) {
  return (
    <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', width: '100%' }}>
      <div style={{
        height: '100%',
        background: 'linear-gradient(90deg, #6B35B8, #C8399A)',
        width: `${progress}%`,
        transition: 'width 0.5s ease-out'
      }} />
    </div>
  )
}
