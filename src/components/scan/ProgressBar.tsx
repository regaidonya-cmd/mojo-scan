'use client'

export function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="h-0.5 bg-neutral-100 w-full">
      <div
        className="h-full bg-[#E85D26] transition-all duration-500 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
