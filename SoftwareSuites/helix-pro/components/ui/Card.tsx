import React from 'react';
import { classNames } from '@/lib/utils/format';

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={classNames(
        'p-6 rounded-lg border border-[#1a3328] bg-[#0a1a14]/60 backdrop-blur',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
