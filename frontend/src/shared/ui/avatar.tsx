import * as React from 'react'
import { cn } from '@/shared/lib/utils'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  if (parts[0]) return parts[0].slice(0, 2).toUpperCase()
  return '?'
}

function hashToHue(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h) % 360
}

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = { sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-11 w-11 text-base' }

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ name, size = 'md', className, ...props }, ref) => {
    const initials = getInitials(name || '?')
    const hue = hashToHue(name || '0')
    const bg = { backgroundColor: `hsl(${hue}, 65%, 45%)` }
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white',
          sizeClasses[size],
          className
        )}
        style={bg}
        title={name}
        {...props}
      >
        {initials}
      </div>
    )
  }
)
Avatar.displayName = 'Avatar'
