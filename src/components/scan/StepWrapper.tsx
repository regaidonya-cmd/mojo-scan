'use client'

interface Props {
  title: string
  subtitle?: string
  step?: number
  children: React.ReactNode
}

export function StepWrapper({ title, subtitle, children }: Props) {
  return (
    <div className="pt-8 pb-4">
      <h1 className="text-2xl font-semibold text-neutral-900 leading-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 text-neutral-500 text-base leading-relaxed">
          {subtitle}
        </p>
      )}
      {children}
    </div>
  )
}
