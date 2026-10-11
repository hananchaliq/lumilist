'use client';

import React, {useState, useEffect, useMemo} from 'react';
import {Search, ArrowUpRight, Globe} from 'lucide-react';
import {QuickLinkItem, QuickLinkCategory, getDomainFromUrl} from '@/lib/lumilist-store';

interface FloatingSearchBarProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  links: QuickLinkItem[];
  categories: QuickLinkCategory[];
}

type SearchEngine = {
  id: string;
  name: string;
  searchUrl: (q: string) => string;
};

const SEARCH_ENGINES: SearchEngine[] = [
  {
    id: 'google',
    name: 'Google',
    searchUrl: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    id: 'ddg',
    name: 'DuckDuckGo',
    searchUrl: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
  },
  {
    id: 'github',
    name: 'GitHub',
    searchUrl: (q) => `https://github.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    searchUrl: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
  },
];

export default function FloatingSearchBar({
  inputRef,
  links,
  categories,
}: FloatingSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [engineIdx, setEngineIdx] = useState(0);

  const activeEngine = SEARCH_ENGINES[engineIdx] || SEARCH_ENGINES[0];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
        setIsFocused(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputRef]);

  const matchingLinks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return links
      .filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.url.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [query, links]);

  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    const targetUrl = activeEngine.searchUrl(trimmed);
    window.location.assign(targetUrl);
  };

  return (
    <div className="relative z-30 w-full max-w-[560px] mx-auto px-4">
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-300 ${
            isFocused
              ? 'border-[#B8E66A]/35 shadow-[0_18px_48px_rgba(0,0,0,0.6),0_0_28px_rgba(184,230,106,0.1)]'
              : 'border-white/[0.1] shadow-[0_16px_42px_rgba(0,0,0,0.48)]'
          } border`}
          style={{
            background: isFocused
              ? 'rgba(12, 16, 12, 0.72)'
              : 'rgba(8, 11, 8, 0.58)',
            backdropFilter: 'blur(26px) saturate(150%)',
            WebkitBackdropFilter: 'blur(26px) saturate(150%)',
            boxShadow: isFocused
              ? '0 18px 48px rgba(0,0,0,0.6), 0 0 24px rgba(184, 230, 106, 0.08), inset 0 1px 0 0 rgba(184, 230, 106, 0.22)'
              : '0 16px 42px rgba(0,0,0,0.48), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          <Search
            className={`w-4 h-4 shrink-0 transition-colors ${
              isFocused ? 'text-[#B8E66A]' : 'text-[#969A91]'
            }`}
          />

          <input
            ref={inputRef}
            type="text"
            value={query}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 180)}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${activeEngine.name} or filter quick links...`}
            className="w-full bg-transparent text-sm text-[#F4F5F0] placeholder-[#969A91] focus:outline-none"
          />

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setEngineIdx((prev) => (prev + 1) % SEARCH_ENGINES.length)}
              className="px-2 py-0.5 rounded-full text-[11px] font-medium text-[#D6D8D0] hover:text-[#B8E66A] bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.07] transition-colors whitespace-nowrap cursor-pointer"
              title="Click to cycle search engine"
            >
              {activeEngine.name}
            </button>

            <kbd
              className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] text-[#969A91] bg-white/[0.04] border border-white/[0.07] whitespace-nowrap"
              style={{fontFamily: 'var(--font-mono), monospace'}}
            >
              ⌘ K
            </kbd>
          </div>
        </div>
      </form>

      {isFocused && query.trim().length > 0 && (
        <div
          className="absolute left-4 right-4 mt-2.5 rounded-2xl p-2 border border-white/[0.1] z-50"
          style={{
            background: 'rgba(8, 11, 8, 0.88)',
            backdropFilter: 'blur(28px) saturate(160%)',
            boxShadow: '0 24px 54px rgba(0, 0, 0, 0.65)',
          }}
        >
          {matchingLinks.length > 0 && (
            <div className="mb-1.5">
              <div className="px-2.5 py-1 text-[11px] text-[#969A91] flex items-center justify-between">
                <span>Quick Links Matches</span>
                <span>{matchingLinks.length} found</span>
              </div>
              <div className="space-y-0.5">
                {matchingLinks.map((item) => (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-[#B8E66A]/12 text-xs text-[#F4F5F0] group transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-white/[0.06] flex items-center justify-center text-[10px] font-semibold text-[#B8E66A] shrink-0">
                        {item.title.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="font-medium truncate group-hover:text-[#B8E66A] transition-colors">
                        {item.title}
                      </span>
                      <span className="text-[#6E726A]">·</span>
                      <span className="text-[#969A91] truncate text-[11px]">
                        {categoryMap[item.categoryId] || 'Link'} / {getDomainFromUrl(item.url)}
                      </span>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#969A91] group-hover:text-[#B8E66A] shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              const targetUrl = activeEngine.searchUrl(query.trim());
              window.location.assign(targetUrl);
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl bg-white/[0.04] hover:bg-[#B8E66A]/15 text-xs text-[#D6D8D0] hover:text-[#B8E66A] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate">
              <Globe className="w-3.5 h-3.5 text-[#B8E66A] shrink-0" />
              <span className="truncate">
                Search {activeEngine.name} for &ldquo;{query.trim()}&rdquo;
              </span>
            </div>
            <span className="text-[11px] text-[#969A91] shrink-0">Enter ↵</span>
          </button>
        </div>
      )}
    </div>
  );
}
