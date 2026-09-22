import React from 'react';
import { Pill } from 'lucide-react';

interface MedicineImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  xs: 'w-7 h-7 rounded-lg text-xs',
  sm: 'w-10 h-10 rounded-xl text-sm',
  md: 'w-14 h-14 rounded-2xl text-base',
  lg: 'w-24 h-24 rounded-2xl text-xl',
  xl: 'w-36 h-36 rounded-3xl text-2xl',
};

const iconSizes = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-5 h-5',
  md: 'w-7 h-7',
  lg: 'w-10 h-10',
  xl: 'w-14 h-14',
};

export const MedicineImage: React.FC<MedicineImageProps> = ({
  src,
  alt,
  className = '',
  size = 'sm',
}) => {
  const [hasError, setHasError] = React.useState(false);

  // If no source or failed to load, show the medical pill placeholder
  if (!src || hasError) {
    return (
      <div
        className={`flex items-center justify-center shrink-0 bg-slate-100 dark:bg-slate-800 text-teal-600 dark:text-teal-400 border border-slate-200 dark:border-slate-700/80 shadow-2xs select-none ${sizeClasses[size]} ${className}`}
        title={alt}
      >
        <Pill className={iconSizes[size]} />
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-2xs ${sizeClasses[size]} ${className}`}
    >
      <img
        src={src}
        alt={alt}
        onError={() => setHasError(true)}
        className="w-full h-full object-cover object-center"
        loading="lazy"
      />
    </div>
  );
};
