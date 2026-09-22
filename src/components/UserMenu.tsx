import React, { useState, useRef } from 'react';
import { User, LogOut, Settings as SettingsIcon, ChevronDown } from 'lucide-react';
import { User as UserType } from '../types';

interface UserMenuProps {
  user: UserType;
  onLogout: () => void;
  onOpenSettings: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ user, onLogout, onOpenSettings }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'PH';

  return (
    <div className="relative" ref={menuRef}>
      <button
        id="user-profile-menu-button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-teal-600 dark:bg-teal-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
          {initials}
        </div>
        <div className="hidden sm:block text-left">
          <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[130px]">
            {user.name}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight truncate max-w-[130px]">
            {user.email}
          </div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          id="user-profile-dropdown"
          className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
              {user.name}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {user.email}
            </div>
          </div>

          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenSettings();
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <SettingsIcon className="w-4 h-4 text-slate-400" />
              <span>Settings & Preferences</span>
            </button>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
            <button
              id="user-logout-button"
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
