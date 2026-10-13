"use client";

import React, { useMemo, useState } from "react";
import { Plus, ArrowUpRight } from "lucide-react";
import {
  QuickLinkCategory,
  QuickLinkItem,
  getDomainFromUrl,
} from "@/lib/lumilist-store";

interface QuickLinksContainerProps {
  categories: QuickLinkCategory[];
  links: QuickLinkItem[];
  onOpenManage: () => void;
}

function LinkFavicon({ url, title }: { url: string; title: string }) {
  const [faviconIndex, setFaviconIndex] = useState(0);

  const faviconCandidates = useMemo(() => {
    try {
      const parsedUrl = new URL(url);
      const origin = parsedUrl.origin;
      const hostname = parsedUrl.hostname;
      const domain = getDomainFromUrl(url);

      if (!domain || !["http:", "https:"].includes(parsedUrl.protocol)) {
        return [];
      }

      return [
        `${origin}/favicon.ico`,
        `${origin}/favicon.png`,
        `${origin}/favicon.svg`,
        `${origin}/apple-touch-icon.png`,
        `https://${hostname}/favicon.ico`,
        `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`,
        `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`,
      ];
    } catch {
      return [];
    }
  }, [url]);

  if (faviconCandidates.length === 0 || faviconIndex >= faviconCandidates.length) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-[#B8E66A]/25 bg-[#B8E66A]/15 text-[11px] font-semibold text-[#B8E66A]">
        {(title.trim().slice(0, 1) || "?").toUpperCase()}
      </span>
    );
  }

  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.06]">
      <img
        key={faviconCandidates[faviconIndex]}
        src={faviconCandidates[faviconIndex]}
        alt={`${title} icon`}
        referrerPolicy="no-referrer"
        onError={() => setFaviconIndex((index) => index + 1)}
        className="h-3.5 w-3.5 object-contain"
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
    categories[0]?.id || "all",
  );

  const resolvedCategoryId =
    activeCategoryId === "all" ||
    categories.some((category) => category.id === activeCategoryId)
      ? activeCategoryId
      : categories[0]?.id || "all";

  const displayedLinks =
    resolvedCategoryId === "all"
      ? links
      : links.filter((link) => link.categoryId === resolvedCategoryId);

  const activeCategoryName =
    resolvedCategoryId === "all"
      ? "All Folders"
      : categories.find((category) => category.id === resolvedCategoryId)?.name ||
        "Links";

  const activePillClass =
    "border border-[#B8E66A]/35 bg-[#B8E66A]/15 text-[#B8E66A] shadow-[0_0_18px_rgba(184,230,106,0.12)]";
  const inactivePillClass =
    "border border-white/[0.06] bg-white/[0.04] text-[#D6D8D0] hover:bg-white/[0.07] hover:text-[#F4F5F0]";

  return (
    <section
      id="section-launcher"
      className="flex h-full flex-col justify-between rounded-[24px] border border-white/[0.08] p-5 transition-all duration-300 sm:p-6"
      style={{
        background: "rgba(8, 11, 8, 0.58)",
        backdropFilter: "blur(26px) saturate(145%)",
        WebkitBackdropFilter: "blur(26px) saturate(145%)",
        boxShadow:
          "0 22px 54px rgba(0, 0, 0, 0.48), inset 0 1px 0 0 rgba(255, 255, 255, 0.09)",
      }}
    >
      <div>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-baseline gap-3">
            <h2
              className="whitespace-nowrap text-base font-semibold tracking-tight text-[#F4F5F0]"
              style={{ fontFamily: "var(--font-syne), sans-serif" }}
            >
              Quick Links
            </h2>
            <div className="hidden min-w-0 items-center gap-1.5 truncate text-xs text-[#969A91] sm:flex">
              <span>{activeCategoryName}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{displayedLinks.length} items</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenManage}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-[#D6D8D0] transition-all hover:border-[#B8E66A]/30 hover:bg-[#B8E66A]/15 hover:text-[#B8E66A]"
          >
            <Plus className="h-3.5 w-3.5 text-[#B8E66A]" />
            <span>Manage</span>
          </button>
        </div>

        <div className="no-scrollbar mb-4 flex items-center gap-1.5 overflow-x-auto border-b border-white/[0.06] pb-2">
          {categories.map((category) => {
            const isActive = resolvedCategoryId === category.id;
            const count = links.filter(
              (link) => link.categoryId === category.id,
            ).length;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategoryId(category.id)}
                className={`flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                  isActive ? activePillClass : inactivePillClass
                }`}
              >
                <span>{category.name}</span>
                <span
                  className={`text-[10px] tabular-nums ${
                    isActive ? "text-[#B8E66A]/85" : "text-[#6E726A]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setActiveCategoryId("all")}
            className={`flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
              resolvedCategoryId === "all"
                ? activePillClass
                : "border border-white/[0.06] bg-white/[0.04] text-[#969A91] hover:bg-white/[0.07] hover:text-[#F4F5F0]"
            }`}
          >
            <span>All</span>
            <span className="text-[10px] tabular-nums opacity-75">
              {links.length}
            </span>
          </button>
        </div>

        {displayedLinks.length > 0 ? (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {displayedLinks.map((link) => {
              const domain = getDomainFromUrl(link.url);

              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex items-center justify-between gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 transition-all duration-200 hover:border-[#B8E66A]/25 hover:bg-white/[0.07]"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <LinkFavicon url={link.url} title={link.title} />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium text-[#F4F5F0] transition-colors group-hover:text-[#B8E66A]">
                        {link.title}
                      </div>
                      <div className="truncate text-[10px] text-[#6E726A] transition-colors group-hover:text-[#969A91]">
                        {domain}
                      </div>
                    </div>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[#6E726A] opacity-0 transition-all group-hover:text-[#B8E66A] group-hover:opacity-100" />
                </a>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] py-10 text-center">
            <p className="mb-2 text-xs text-[#969A91]">
              No quick links in this folder yet.
            </p>
            <button
              type="button"
              onClick={onOpenManage}
              className="cursor-pointer rounded-full border border-[#B8E66A]/30 bg-[#B8E66A]/15 px-3.5 py-1.5 text-xs font-medium text-[#B8E66A] transition-colors hover:bg-[#B8E66A]/25"
            >
              + Add Links in Settings
            </button>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-white/[0.05] pt-3 text-[11px] text-[#6E726A]">
        <span>Launcher locked in dashboard view</span>
        <span>Open Manage to edit folders or reorder</span>
      </div>
    </section>
  );
}
