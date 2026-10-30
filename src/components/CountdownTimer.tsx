import { useEffect, useState } from 'react'
import type { TimeLeft } from '../lib/utils'
import { getTimeLeft } from '../lib/utils'

interface CountdownTimerProps {
  targetDate: string | Date
  label?: string
  onComplete?: () => void
  className?: string
}

export default function CountdownTimer({ targetDate, label, onComplete, className = '' }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => getTimeLeft(targetDate))

  useEffect(() => {
    const interval = setInterval(() => {
      const updated = getTimeLeft(targetDate)
      setTimeLeft(updated)
      if (updated.isPast && onComplete) {
        onComplete()
        clearInterval(interval)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [targetDate, onComplete])

  const segments = [
    { value: timeLeft.days, label: 'Days' },
    { value: timeLeft.hours, label: 'Hours' },
    { value: timeLeft.minutes, label: 'Min' },
    { value: timeLeft.seconds, label: 'Sec' },
  ]

  return (
    <div className={className}>
      {label && <p className="text-sm font-semibold text-gray-600 mb-2 text-center">{label}</p>}
      <div className="countdown-grid">
        {segments.map((seg) => (
          <div key={seg.label} className="countdown-segment">
            <span className="countdown-number">{String(seg.value).padStart(2, '0')}</span>
            <span className="countdown-label">{seg.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
