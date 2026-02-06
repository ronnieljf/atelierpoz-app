import { cn } from '@/lib/utils/cn';
import { type ReactNode } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  onClick,
  type = 'button',
  disabled = false,
  ...rest
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-light tracking-wide rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 focus:ring-neutral-100 shadow-lg hover:shadow-xl relative overflow-hidden group',
    secondary:
      'bg-neutral-800 text-neutral-100 hover:bg-neutral-700 focus:ring-neutral-800 shadow-lg hover:shadow-xl relative overflow-hidden group',
    outline:
      'border border-neutral-800 bg-transparent text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900/50 focus:ring-neutral-800 relative overflow-hidden group',
  };

  const sizes = {
    sm: 'px-5 py-2.5 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-3.5 text-base',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...rest}
    >
      <span className="relative z-10 flex items-center justify-center">{children}</span>
      {variant !== 'outline' && (
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
      )}
    </button>
  );
}