'use client';

import React, {useEffect, useState} from 'react';
import {MapPin, Settings, Search, Compass} from 'lucide-react';
import {UserLocation, PRESET_LOCATIONS} from '@/lib/lumilist-store';

interface HeaderBarProps {
  location: UserLocation;
  onSelectLocation: (loc: UserLocation) => void;
  onDetectGps: () => void;
  isDetectingGps: boolean;
  onOpenSettings: (initialTab?: 'links' | 'categories' | 'environment') => void;
  onFocusSearch: () => void;
}

export default function HeaderBar({
  location,
  onSelectLocation,
  onDetectGps,
  isDetectingGps,
  onOpenSettings,
  onFocusSearch,
}: HeaderBarProps) {
  const [clockText, setClockText] = useState<string>('');
  const [locationMenuOpen, setLocationMenuOpen] = useState(false);
  const [customCityInput, setCustomCityInput] = useState('');
  const [isSearchingCity, setIsSearchingCity] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const formatted = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const datePart = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      setClockText(`${datePart} · ${formatted}`);
    };
    updateClock();
    const timer = setInterval(updateClock, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleCustomCitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCityInput.trim()) return;
    setIsSearchingCity(true);
    try {
      const res = await fetch(`/api/weather?q=${encodeURIComponent(customCityInput.trim())}`);
      if (res.ok) {
        const data = await res.json();
        onSelectLocation({
          city: data.city || customCityInput.trim(),
          country: data.country || '',
          latitude: data.latitude ?? -10.1772,
          longitude: data.longitude ?? 123.607,
          isAutoDetected: false,
        });
        setCustomCityInput('');
        setLocationMenuOpen(false);
      }
    } finally {
      setIsSearchingCity(false);
    }
  };

  return (
    <header className="sticky top-4 z-40 mx-auto w-full max-w-[1380px] px-4 sm:px-6">
      <div
        className="relative flex items-center justify-between px-4 sm:px-5 py-2.5 rounded-2xl border border-white/[0.08] transition-all duration-300"
        style={{
          background: 'rgba(8, 11, 8, 0.56)',
          backdropFilter: 'blur(24px) saturate(150%)',
          WebkitBackdropFilter: 'blur(24px) saturate(150%)',
          boxShadow:
            '0 14px 36px rgba(0, 0, 0, 0.42), inset 0 1px 0 0 rgba(255, 255, 255, 0.09)',
        }}
      >
        <div className="flex items-center gap-3.5">
          <div className="hidden sm:flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]/75 border border-white/10" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]/75 border border-white/10" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#B8E66A]/80 border border-white/10" />
          </div>

          <a
            href="#top"
            className="text-lg tracking-tight text-[#F4F5F0] flex items-baseline gap-0.5 whitespace-nowrap focus:outline-none"
          >
            <span
              className="italic font-medium text-[#B8E66A] pr-0.5"
              style={{fontFamily: 'var(--font-cormorant), serif', fontSize: '1.3rem'}}
            >
              Lumi
            </span>
            <span
              className="font-semibold tracking-tight text-[#F4F5F0]"
              style={{fontFamily: 'var(--font-syne), sans-serif'}}
            >
              List
            </span>
          </a>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-[#D6D8D0]">
          <a
            href="#section-launcher"
            className="hover:text-[#B8E66A] transition-colors whitespace-nowrap py-1"
          >
            Launcher
          </a>
          <a
            href="#section-markets"
            className="hover:text-[#B8E66A] transition-colors whitespace-nowrap py-1"
          >
            USD / IDR
          </a>
          <a
            href="#section-planner"
            className="hover:text-[#B8E66A] transition-colors whitespace-nowrap py-1"
          >
            Daily Planner
          </a>
          <a
            href="#section-weather"
            className="hover:text-[#B8E66A] transition-colors whitespace-nowrap py-1"
          >
            Weather
          </a>
          <a
            href="#section-prayer"
            className="hover:text-[#B8E66A] transition-colors whitespace-nowrap py-1"
          >
            Prayer
          </a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setLocationMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs text-[#D6D8D0] hover:text-[#F4F5F0] hover:bg-white/[0.06] transition-colors whitespace-nowrap cursor-pointer"
              title="Change active location for Weather & Prayer Times"
            >
              <MapPin className="w-3.5 h-3.5 text-[#B8E66A] shrink-0" />
              <span className="max-w-[130px] sm:max-w-[170px] truncate">
                {location.city}
                {location.country ? `, ${location.country}` : ''}
              </span>
            </button>

            {locationMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-72 rounded-2xl p-3.5 border border-white/[0.1] z-50 text-xs"
                style={{
                  background: 'rgba(8, 11, 8, 0.92)',
                  backdropFilter: 'blur(28px) saturate(160%)',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.65)',
                }}
              >
                <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-white/[0.07]">
                  <span className="text-[#F4F5F0] font-medium">Environment Location</span>
                  <button
                    type="button"
                    onClick={() => {
                      onDetectGps();
                      setLocationMenuOpen(false);
                    }}
                    disabled={isDetectingGps}
                    className="flex items-center gap-1 text-[#B8E66A] hover:underline disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>{isDetectingGps ? 'Detecting...' : 'Use GPS'}</span>
                  </button>
                </div>

                <form onSubmit={handleCustomCitySubmit} className="flex gap-1.5 mb-3">
                  <input
                    type="text"
                    value={customCityInput}
                    onChange={(e) => setCustomCityInput(e.target.value)}
                    placeholder="Search city (e.g. Kupang, Tokyo)..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F4F5F0] placeholder-[#6E726A] focus:outline-none focus:border-[#B8E66A]/40 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={isSearchingCity}
                    className="px-2.5 py-1.5 rounded-lg bg-[#B8E66A]/15 text-[#B8E66A] border border-[#B8E66A]/30 hover:bg-[#B8E66A]/25 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {isSearchingCity ? '...' : 'Set'}
                  </button>
                </form>

                <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                  {PRESET_LOCATIONS.map((preset) => {
                    const isSelected =
                      preset.city.toLowerCase() === location.city.toLowerCase();
                    return (
                      <button
                        key={preset.city}
                        type="button"
                        onClick={() => {
                          onSelectLocation(preset);
                          setLocationMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#B8E66A]/15 text-[#B8E66A]'
                            : 'text-[#D6D8D0] hover:bg-white/[0.05]'
                        }`}
                      >
                        <span className="truncate">
                          {preset.city}, {preset.country}
                        </span>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#B8E66A]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <span
            className="hidden xl:inline-block text-xs text-[#969A91] tabular-nums whitespace-nowrap pl-1"
            style={{fontFamily: 'var(--font-mono), monospace'}}
          >
            {clockText}
          </span>

          <button
            type="button"
            onClick={onFocusSearch}
            className="p-2 rounded-xl text-[#D6D8D0] hover:text-[#B8E66A] hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Focus Search (⌘K)"
            aria-label="Focus Search"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onOpenSettings('links')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#F4F5F0] bg-white/[0.06] hover:bg-[#B8E66A]/15 hover:text-[#B8E66A] border border-white/[0.08] hover:border-[#B8E66A]/30 transition-all whitespace-nowrap cursor-pointer"
            title="Open Settings Overlay"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
}
