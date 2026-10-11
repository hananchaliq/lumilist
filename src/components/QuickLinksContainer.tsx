'use client';

import React, {useState} from 'react';
import {Plus, ArrowUpRight} from 'lucide-react';
import {
  QuickLinkCategory,
  QuickLinkItem,
  getDomainFromUrl,
} from '@/lib/lumilist-store';

interface QuickLinksContainerProps {
  categories: QuickLinkCategory[];
  links: QuickLinkItem[];
  onOpenManage: () => void;
}

function LinkFavicon({url, title}: {url: string; title: string}) {
  const [failed, setFailed] = useState(false);
  const domain = getDomainFromUrl(url);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    domain
  )}&sz=64`;

  if (failed || !domain) {
    return (
      <span className="w-6 h-6 rounded-lg bg-[#B8E66A]/15 border border-[#B8E66A]/25 flex items-center justify-center text-[11px] font-semibold text-[#B8E66A] shrink-0">
        {title.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return (
    <span className="w-6 h-6 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center overflow-hidden shrink-0">
      <img
        src={faviconUrl}
        alt={`${title} icon`}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="w-3.5 h-3.5 object-contain"
      />
    </span>
  );
}

export default function QuickLinksContainer({
  categories,
  links,
  onOpenManage,
}: QuickLinksContainerProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    categories[0]?.id || 'all'
  );

  const resolvedCategoryId =
    activeCategoryId === 'all' || categories.some((c) => c.id === activeCategoryId)
      ? activeCategoryId
      : categories[0]?.id || 'all';

  const displayedLinks =
    resolvedCategoryId === 'all'
      ? links
      : links.filter((link) => link.categoryId === resolvedCategoryId);

  const activeCategoryName =
    resolvedCategoryId === 'all'
      ? 'All Folders'
      : categories.find((c) => c.id === resolvedCategoryId)?.name || 'Links';

  return (
    <section
      id="section-launcher"
      className="h-full rounded-[24px] p-5 sm:p-6 border border-white/[0.08] flex flex-col justify-between transition-all duration-300"
      style={{
        background: 'rgba(8, 11, 8, 0.58)',
        backdropFilter: 'blur(26px) saturate(145%)',
        WebkitBackdropFilter: 'blur(26px) saturate(145%)',
        boxShadow:
          '0 22px 54px rgba(0, 0, 0, 0.48), inset 0 1px 0 0 rgba(255, 255, 255, 0.09)',
      }}
    >
      <div>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-baseline gap-3 min-w-0">
            <h2
              className="text-base font-semibold tracking-tight text-[#F4F5F0] whitespace-nowrap"
              style={{fontFamily: 'var(--font-syne), sans-serif'}}
            >
              Quick Links
            </h2>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#969A91] truncate">
              <span>{activeCategoryName}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{displayedLinks.length} items</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenManage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-[#D6D8D0] hover:text-[#B8E66A] bg-white/[0.05] hover:bg-[#B8E66A]/15 border border-white/[0.08] hover:border-[#B8E66A]/30 transition-all whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#B8E66A]" />
            <span>Manage</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 border-b border-white/[0.06] no-scrollbar">
          {categories.map((cat) => {
            const isActive = resolvedCategoryId === cat.id;
            const count = links.filter((l) => l.categoryId === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategoryId(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#B8E66A]/15 text-[#B8E66A] border border-[#B8E66A]/35 shadow-[0_0_18px_rgba(184,230,106,0.12)]'
                    : 'bg-white/[0.04] text-[#D6D8D0] hover:text-[#F4F5F0] hover:bg-white/[0.07] border border-white/[0.06]'
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`text-[10px] tabular-nums ${
                    isActive ? 'text-[#B8E66A]/85' : 'text-[#6E726A]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setActiveCategoryId('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
              resolvedCategoryId === 'all'
                ? 'bg-[#B8E66A]/15 text-[#B8E66A] border border-[#B8E66A]/35 shadow-[0_0_18px_rgba(184,230,106,0.12)]'
                : 'bg-white/[0.04] text-[#969A91] hover:text-[#F4F5F0] hover:bg-white/[0.07] border border-white/[0.06]'
            }`}
          >
            <span>All</span>
            <span className="text-[10px] tabular-nums opacity-75">{links.length}</span>
          </button>
        </div>

        {displayedLinks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {displayedLinks.map((link) => {
              const domain = getDomainFromUrl(link.url);
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-[#B8E66A]/25 transition-all duration-200"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <LinkFavicon url={link.url} title={link.title} />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-[#F4F5F0] group-hover:text-[#B8E66A] transition-colors truncate">
                        {link.title}
                      </div>
                      <div className="text-[10px] text-[#6E726A] group-hover:text-[#969A91] transition-colors truncate">
                        {domain}
                      </div>
                    </div>
                  </div>

                  <ArrowUpRight className="w-3.5 h-3.5 text-[#6E726A] opacity-0 group-hover:opacity-100 group-hover:text-[#B8E66A] transition-all shrink-0" />
                </a>
              );
            })}
          </div>
        ) : (
          <div className="py-10 text-center rounded-2xl bg-white/[0.02] border border-white/[0.05]">
            <p className="text-xs text-[#969A91] mb-2">
              No quick links in this folder yet.
            </p>
            <button
              type="button"
              onClick={onOpenManage}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-[#B8E66A] bg-[#B8E66A]/15 border border-[#B8E66A]/30 hover:bg-[#B8E66A]/25 transition-colors cursor-pointer"
            >
              + Add Links in Settings
            </button>
          </div>
        )}
      </div>

      <div className="mt-5 pt-3 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-[#6E726A]">
        <span>Launcher locked in dashboard view</span>
        <span>Open Manage to edit folders or reorder</span>
      </div>
    </section>
  );
}
