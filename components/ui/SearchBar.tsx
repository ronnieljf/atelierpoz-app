'use client';

import { Search, X } from 'lucide-react';
import { useState, useRef } from 'react';
import { cn } from '@/lib/utils/cn';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ value, onChange, placeholder, className }: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div
      className={cn(
        'relative flex items-center',
        'border-b-2 rounded-t-xl transition-all duration-300',
        isFocused
          ? 'border-primary-500 shadow-[0_4px_20px_rgba(139,34,34,0.2)]'
          : 'border-neutral-800',
        className
      )}
    >
      <div className="absolute left-0 flex items-center group/icon">
        <Search className={`h-4 w-4 text-neutral-500 transition-all duration-300 ${isFocused ? 'text-primary-500 scale-110' : ''}`} />
      </div>
      
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className={cn(
          'w-full bg-transparent py-4 pl-8 pr-8',
          'text-neutral-100 placeholder:text-neutral-500 placeholder:font-light',
          'focus:outline-none',
          'text-sm font-light tracking-wide'
        )}
      />
      
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-0 flex items-center justify-center p-1 text-neutral-500 transition-opacity hover:opacity-60"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
