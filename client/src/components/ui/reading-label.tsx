import { cn } from "@/lib/utils";

interface ReadingLabelProps {
  value: number;
  className?: string;
  withText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ReadingLabel({ value, className, withText = true, size = 'md' }: ReadingLabelProps) {
  // Determine level based on value
  let level: 'low' | 'normal' | 'elevated' | 'high';
  let text: string;

  if (value < 70) {
    level = 'low';
    text = 'Low';
  } else if (value <= 140) {
    level = 'normal';
    text = 'In Range';
  } else if (value <= 180) {
    level = 'elevated';
    text = 'Elevated';
  } else {
    level = 'high';
    text = 'High';
  }

  // Define colors based on level
  const colors = {
    low: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      ring: 'ring-blue-400',
    },
    normal: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      ring: 'ring-green-400',
    },
    elevated: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      ring: 'ring-yellow-400',
    },
    high: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      ring: 'ring-red-400',
    },
  };

  // Size classes
  const sizeClasses = {
    sm: withText ? 'text-xs px-2 py-0.5' : 'w-8 h-8 text-xs',
    md: withText ? 'text-xs px-2.5 py-0.5' : 'w-12 h-12 text-sm',
    lg: withText ? 'text-sm px-3 py-1' : 'w-16 h-16 text-base',
  };

  if (withText) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full font-medium',
          colors[level].bg,
          colors[level].text,
          sizeClasses[size],
          className
        )}
      >
        {text}
      </span>
    );
  }

  return (
    <div
      className={cn(
        'flex-shrink-0 rounded-full flex items-center justify-center',
        colors[level].bg,
        colors[level].text,
        sizeClasses[size],
        className
      )}
    >
      <span className="font-semibold">{value}</span>
    </div>
  );
}
