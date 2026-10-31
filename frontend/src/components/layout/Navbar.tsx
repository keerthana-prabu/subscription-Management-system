import React, { useState, useRef, useEffect } from 'react';
import { Menu, LogOut, Shield, ChevronDown, Sparkles, Activity } from 'lucide-react';
import type { User } from '../../api/types';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

interface NavbarProps {
  healthStatus: 'loading' | 'healthy' | 'error';
  backendVersion?: string;
  user: User | null;
  onLogout: () => void;
  onNavigateAuth: () => void;
  onToggleMobileMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  healthStatus,
  backendVersion,
  user,
  onLogout,
  onNavigateAuth,
  onToggleMobileMenu,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left Section: Mobile Menu & Brand */}
        <div className="flex items-center space-x-3.5">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 md:hidden focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            aria-label="Toggle navigation drawer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white font-extrabold text-base shadow-xs shadow-indigo-500/20 ring-1 ring-white/20">
              B
            </div>
            <div className="text-left">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-slate-900 tracking-tight">Brightloop</span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full border border-indigo-200/70">
                  <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
                  Make-A-Ton
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Subscription & Recurring Billing OS
              </p>
            </div>
          </div>
        </div>

        {/* Right Section: System Status & User Profile */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Health indicator */}
          <div className="hidden xs:flex items-center space-x-2 text-[11px] px-3 py-1 rounded-full border border-slate-200/80 bg-slate-50/80 shadow-2xs">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                healthStatus === 'healthy'
                  ? 'bg-emerald-500 ring-2 ring-emerald-500/20'
                  : healthStatus === 'loading'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-600 font-medium hidden sm:inline">
              Backend: {healthStatus === 'healthy' ? `v${backendVersion || '0.1.0'}` : healthStatus}
            </span>
          </div>

          {/* User profile dropdown or Sign In */}
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2.5 p-1.5 pl-2 rounded-xl hover:bg-slate-100/80 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 border border-transparent hover:border-slate-200/60"
                aria-expanded={isDropdownOpen}
                aria-haspopup="true"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {getInitials(user.full_name)}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[130px]">
                    {user.full_name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium capitalize">{user.role}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 transition-transform duration-150" />
              </button>

              {/* Profile Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 z-50 text-left animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-xs font-bold text-slate-900 truncate">{user.full_name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-medium">Access Tier:</span>
                      <Badge role={user.role} />
                    </div>
                  </div>

                  <div className="py-1 px-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onNavigateAuth();
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-100/70 rounded-lg flex items-center space-x-2.5 transition-colors"
                    >
                      <Shield className="w-4 h-4 text-slate-400" />
                      <span>Security & Permissions</span>
                    </button>
                  </div>

                  <div className="pt-1 px-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50/80 rounded-lg flex items-center space-x-2.5 font-semibold transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Button
              size="sm"
              variant="primary"
              onClick={onNavigateAuth}
              className="shadow-sm"
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
