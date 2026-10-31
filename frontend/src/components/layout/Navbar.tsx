import React, { useState, useRef, useEffect } from 'react';
import { Menu, LogOut, User as UserIcon, Shield, ChevronDown } from 'lucide-react';
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
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left Section: Mobile Menu Button & Brand */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 md:hidden focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Toggle navigation drawer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
              B
            </div>
            <div className="text-left">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-slate-900 leading-tight">Brightloop</span>
                <span className="hidden sm:inline-block text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-1.5 py-0.2 rounded border border-indigo-100">
                  SaaS Billing
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Subscription Management Platform</p>
            </div>
          </div>
        </div>

        {/* Right Section: API Health & User Profile */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Health status badge */}
          <div className="hidden xs:flex items-center space-x-2 text-[11px] px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50">
            <span
              className={`w-2 h-2 rounded-full ${
                healthStatus === 'healthy'
                  ? 'bg-emerald-500'
                  : healthStatus === 'loading'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-600 font-medium hidden sm:inline">
              Backend: {healthStatus === 'healthy' ? `v${backendVersion || '0.1.0'}` : healthStatus}
            </span>
          </div>

          {/* User profile dropdown or Sign In button */}
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-expanded={isDropdownOpen}
                aria-haspopup="true"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-semibold text-xs flex items-center justify-center shadow-xs">
                  {getInitials(user.full_name)}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px]">
                    {user.full_name}
                  </div>
                  <div className="text-[10px] text-slate-400 capitalize">{user.role}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Profile Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 text-left animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-900 truncate">{user.full_name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Role:</span>
                      <Badge role={user.role} />
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onNavigateAuth();
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                    >
                      <Shield className="w-3.5 h-3.5 text-slate-400" />
                      <span>Security & Profile</span>
                    </button>
                  </div>

                  <div className="pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center space-x-2 font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
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
              leftIcon={<UserIcon className="w-3.5 h-3.5" />}
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
