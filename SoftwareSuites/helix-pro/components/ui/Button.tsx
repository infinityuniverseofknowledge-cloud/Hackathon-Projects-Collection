import React from 'react';
import { classNames } from '@/lib/utils/format';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ variant = 'primary', size = 'md', className, ...rest }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 rounded font-bold tracking-widest uppercase transition';
  const sizes = {
    sm: 'px-3 py-1.5 text-[10px]',
    md: 'px-5 py-2.5 text-xs',
    lg: 'px-7 py-3.5 text-sm',
  } as const;
  const variants = {
    primary: 'bg-gradient-to-br from-[#00ff9d] to-[#00ccff] text-[#020806] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#00ff9d]/40',
    ghost: 'border border-[#2a5240] text-[#8a95b8] hover:border-[#00ff9d] hover:text-[#5cffbb]',
    danger: 'bg-gradient-to-br from-[#ff2e88] to-[#cc0e6a] text-white hover:-translate-y-0.5',
  } as const;
  return <button className={classNames(base, sizes[size], variants[variant], className)} {...rest} />;
}
