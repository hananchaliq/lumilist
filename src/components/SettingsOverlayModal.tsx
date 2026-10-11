'use client';

import React, {useState} from 'react';
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Edit3,
  Check,
  FolderPlus,
  Link2,
  MapPin,
  RotateCcw,
  Compass,
} from 'lucide-react';
import {
  QuickLinkCategory,
  QuickLinkItem,
  UserLocation,
  PRESET_LOCATIONS,
} from '@/lib/lumilist-store';

interface SettingsOverlayModalProps {
  isOpen: boolean;
  initialTab?: 'links' | 'categories' | 'environment';
  onClose: () => void;
  categories: QuickLinkCategory[];
  links: QuickLinkItem[];
  onUpdateCategories: (cats: QuickLinkCategory[]) => void;
  onUpdateLinks: (links: QuickLinkItem[]) => void;
  onResetDefaults: () => void;
  location: UserLocation;
  onSelectLocation: (loc: UserLocation) => void;
  onDetectGps: () => void;
  isDetectingGps: boolean;
  backgroundIntensity: number;
  onChangeBackgroundIntensity: (val: number) => void;
}

export default function SettingsOverlayModal({
  isOpen,
  initialTab = 'links',
  onClose,
  categories,
  links,
  onUpdateCategories,
  onUpdateLinks,
  onResetDefaults,
  location,
  onSelectLocation,
  onDetectGps,
  isDetectingGps,
  backgroundIntensity,
  onChangeBackgroundIntensity,
}: SettingsOverlayModalProps) {
  const [activeTab, setActiveTab] = useState<'links' | 'categories' | 'environment'>(
    initialTab
  );

  const [selectedCatFilter, setSelectedCatFilter] = useState<string>(
    categories[0]?.id || 'all'
  );

  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkCatId, setNewLinkCatId] = useState<string>(categories[0]?.id || 'dev');

  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editLinkTitle, setEditLinkTitle] = useState('');
  const [editLinkUrl, setEditLinkUrl] = useState('');
  const [editLinkCatId, setEditLinkCatId] = useState('');

  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');

  const [cityQuery, setCityQuery] = useState('');
  const [searchingCity, setSearchingCity] = useState(false);

  if (!isOpen) return null;

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newLinkTitle.trim();
    let url = newLinkUrl.trim();
    if (!title || !url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    const targetCat =
      categories.some((c) => c.id === newLinkCatId)
        ? newLinkCatId
        : categories[0]?.id || 'dev';

    const created: QuickLinkItem = {
      id: `l-${Date.now()}`,
      title,
      url,
      categoryId: targetCat,
    };
    onUpdateLinks([...links, created]);
    setNewLinkTitle('');
    setNewLinkUrl('');
  };

  const handleStartEditLink = (item: QuickLinkItem) => {
    setEditingLinkId(item.id);
    setEditLinkTitle(item.title);
    setEditLinkUrl(item.url);
    setEditLinkCatId(item.categoryId);
  };

  const handleSaveEditLink = (id: string) => {
    const title = editLinkTitle.trim();
    let url = editLinkUrl.trim();
    if (!title || !url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    const updated = links.map((l) =>
      l.id === id ? {...l, title, url, categoryId: editLinkCatId} : l
    );
    onUpdateLinks(updated);
    setEditingLinkId(null);
  };

  const handleDeleteLink = (id: string) => {
    onUpdateLinks(links.filter((l) => l.id !== id));
  };

  const handleMoveLinkOrder = (id: string, direction: 'up' | 'down') => {
    const idx = links.findIndex((l) => l.id === id);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= links.length) return;
    const copy = [...links];
    const temp = copy[idx];
    copy[idx] = copy[swapIdx];
    copy[swapIdx] = temp;
    onUpdateLinks(copy);
  };

  const handleMoveLinkCategory = (id: string, newCatId: string) => {
    onUpdateLinks(
      links.map((l) => (l.id === id ? {...l, categoryId: newCatId} : l))
    );
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    const newCat: QuickLinkCategory = {
      id: `cat-${Date.now()}`,
      name,
    };
    onUpdateCategories([...categories, newCat]);
    setNewCategoryName('');
  };

  const handleSaveCategoryName = (id: string) => {
    const trimmed = editCatName.trim();
    if (!trimmed) return;
    onUpdateCategories(
      categories.map((c) => (c.id === id ? {...c, name: trimmed} : c))
    );
    setEditingCatId(null);
  };

  const handleDeleteCategory = (id: string) => {
    if (categories.length <= 1) return;
    const remaining = categories.filter((c) => c.id !== id);
    const fallbackCatId = remaining[0].id;
    onUpdateCategories(remaining);
    onUpdateLinks(
      links.map((l) =>
        l.categoryId === id ? {...l, categoryId: fallbackCatId} : l
      )
    );
  };

  const handleMoveCategoryOrder = (idx: number, direction: 'up' | 'down') => {
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= categories.length) return;
    const copy = [...categories];
    const temp = copy[idx];
    copy[idx] = copy[swapIdx];
    copy[swapIdx] = temp;
    onUpdateCategories(copy);
  };

  const handleSearchCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityQuery.trim()) return;
    setSearchingCity(true);
    try {
      const res = await fetch(`/api/weather?q=${encodeURIComponent(cityQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        onSelectLocation({
          city: data.city || cityQuery.trim(),
          country: data.country || '',
          latitude: data.latitude ?? -10.1772,
          longitude: data.longitude ?? 123.607,
          isAutoDetected: false,
        });
        setCityQuery('');
      }
    } finally {
      setSearchingCity(false);
    }
  };

  const filteredLinks =
    selectedCatFilter === 'all'
      ? links
      : links.filter((l) => l.categoryId === selectedCatFilter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />

      <div
        className="relative z-10 w-full max-w-3xl max-h-[86vh] rounded-[26px] border border-white/[0.12] flex flex-col overflow-hidden"
        style={{
          background: 'rgba(8, 11, 8, 0.90)',
          backdropFilter: 'blur(32px) saturate(160%)',
          WebkitBackdropFilter: 'blur(32px) saturate(160%)',
          boxShadow:
            '0 32px 80px rgba(0, 0, 0, 0.75), inset 0 1px 0 0 rgba(255, 255, 255, 0.12)',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <div>
            <h2
              className="text-base font-semibold text-[#F4F5F0]"
              style={{fontFamily: 'var(--font-syne), sans-serif'}}
            >
              LumiList System Settings
            </h2>
            <p className="text-xs text-[#969A91]">
              Configure quick-link folders, application launchers, and location telemetry
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#969A91] hover:text-[#F4F5F0] hover:bg-white/[0.07] transition-colors cursor-pointer"
            aria-label="Close Settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between px-6 py-2.5 bg-white/[0.02] border-b border-white/[0.07]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('links')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'links'
                  ? 'bg-[#B8E66A]/18 text-[#B8E66A] border border-[#B8E66A]/35'
                  : 'text-[#D6D8D0] hover:bg-white/[0.05]'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Quick Links ({links.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'categories'
                  ? 'bg-[#B8E66A]/18 text-[#B8E66A] border border-[#B8E66A]/35'
                  : 'text-[#D6D8D0] hover:bg-white/[0.05]'
              }`}
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Categories ({categories.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('environment')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'environment'
                  ? 'bg-[#B8E66A]/18 text-[#B8E66A] border border-[#B8E66A]/35'
                  : 'text-[#D6D8D0] hover:bg-white/[0.05]'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Location & Atmosphere</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onResetDefaults}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-[#969A91] hover:text-[#FF4D57] hover:bg-white/[0.04] transition-colors cursor-pointer"
            title="Restore default Quick Links and Categories"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'links' && (
            <div className="space-y-5">
              <form
                onSubmit={handleAddLink}
                className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] space-y-3"
              >
                <div className="text-xs font-medium text-[#D6D8D0]">
                  Add New Quick Link
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <input
                    type="text"
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    placeholder="Website Name (e.g. GitHub)"
                    className="sm:col-span-4 px-3 py-2 rounded-xl bg-[#050706]/80 border border-white/[0.09] text-xs text-[#F4F5F0] placeholder-[#6E726A] focus:outline-none focus:border-[#B8E66A]/45"
                  />
                  <input
                    type="text"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="URL (e.g. https://github.com)"
                    className="sm:col-span-4 px-3 py-2 rounded-xl bg-[#050706]/80 border border-white/[0.09] text-xs text-[#F4F5F0] placeholder-[#6E726A] focus:outline-none focus:border-[#B8E66A]/45"
                  />
                  <select
                    value={newLinkCatId}
                    onChange={(e) => setNewLinkCatId(e.target.value)}
                    className="sm:col-span-2 px-2.5 py-2 rounded-xl bg-[#050706]/80 border border-white/[0.09] text-xs text-[#D6D8D0] focus:outline-none focus:border-[#B8E66A]/45"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#080B08]">
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="sm:col-span-2 flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-[#B8E66A]/20 text-[#B8E66A] border border-[#B8E66A]/40 hover:bg-[#B8E66A]/30 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Link</span>
                  </button>
                </div>
              </form>

              <div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setSelectedCatFilter('all')}
                    className={`px-3 py-1 rounded-full text-xs cursor-pointer whitespace-nowrap ${
                      selectedCatFilter === 'all'
                        ? 'bg-[#B8E66A]/18 text-[#B8E66A] border border-[#B8E66A]/35'
                        : 'bg-white/[0.04] text-[#969A91] hover:text-[#F4F5F0]'
                    }`}
                  >
                    All ({links.length})
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCatFilter(cat.id)}
                      className={`px-3 py-1 rounded-full text-xs cursor-pointer whitespace-nowrap ${
                        selectedCatFilter === cat.id
                          ? 'bg-[#B8E66A]/18 text-[#B8E66A] border border-[#B8E66A]/35'
                          : 'bg-white/[0.04] text-[#969A91] hover:text-[#F4F5F0]'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
                  {filteredLinks.map((item) => {
                    const isEditing = editingLinkId === item.id;
                    return (
                      <div
                        key={item.id}
                        className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                      >
                        {isEditing ? (
                          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full">
                            <input
                              type="text"
                              value={editLinkTitle}
                              onChange={(e) => setEditLinkTitle(e.target.value)}
                              className="px-2.5 py-1 rounded-lg bg-[#050706] border border-white/[0.12] text-xs text-[#F4F5F0]"
                            />
                            <input
                              type="text"
                              value={editLinkUrl}
                              onChange={(e) => setEditLinkUrl(e.target.value)}
                              className="flex-1 px-2.5 py-1 rounded-lg bg-[#050706] border border-white/[0.12] text-xs text-[#F4F5F0]"
                            />
                            <select
                              value={editLinkCatId}
                              onChange={(e) => setEditLinkCatId(e.target.value)}
                              className="px-2 py-1 rounded-lg bg-[#050706] border border-white/[0.12] text-xs text-[#D6D8D0]"
                            >
                              {categories.map((c) => (
                                <option key={c.id} value={c.id} className="bg-[#080B08]">
                                  {c.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleSaveEditLink(item.id)}
                              className="p-1.5 rounded-lg bg-[#B8E66A]/20 text-[#B8E66A] hover:bg-[#B8E66A]/30 cursor-pointer"
                              title="Save changes"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium text-[#F4F5F0] truncate">
                                {item.title}
                              </div>
                              <div className="text-[11px] text-[#969A91] truncate">
                                {item.url}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <select
                                value={item.categoryId}
                                onChange={(e) =>
                                  handleMoveLinkCategory(item.id, e.target.value)
                                }
                                className="px-2 py-1 rounded-lg bg-[#050706]/80 border border-white/[0.08] text-[11px] text-[#D6D8D0] focus:outline-none"
                                title="Move link to another category"
                              >
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id} className="bg-[#080B08]">
                                    {c.name}
                                  </option>
                                ))}
                              </select>

                              <button
                                type="button"
                                onClick={() => handleMoveLinkOrder(item.id, 'up')}
                                className="p-1.5 rounded-lg text-[#969A91] hover:text-[#F4F5F0] hover:bg-white/[0.06] cursor-pointer"
                                title="Move Up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveLinkOrder(item.id, 'down')}
                                className="p-1.5 rounded-lg text-[#969A91] hover:text-[#F4F5F0] hover:bg-white/[0.06] cursor-pointer"
                                title="Move Down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartEditLink(item)}
                                className="p-1.5 rounded-lg text-[#969A91] hover:text-[#B8E66A] hover:bg-white/[0.06] cursor-pointer"
                                title="Edit Link"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLink(item.id)}
                                className="p-1.5 rounded-lg text-[#969A91] hover:text-[#FF4D57] hover:bg-white/[0.06] cursor-pointer"
                                title="Delete Link"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-5">
              <form
                onSubmit={handleAddCategory}
                className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center gap-2.5"
              >
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New Category Folder Name (e.g. Design, Cloud)..."
                  className="flex-1 px-3 py-2 rounded-xl bg-[#050706]/80 border border-white/[0.09] text-xs text-[#F4F5F0] placeholder-[#6E726A] focus:outline-none focus:border-[#B8E66A]/45"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#B8E66A]/20 text-[#B8E66A] border border-[#B8E66A]/40 hover:bg-[#B8E66A]/30 text-xs font-medium cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Category</span>
                </button>
              </form>

              <div className="space-y-2">
                {categories.map((cat, idx) => {
                  const isEditing = editingCatId === cat.id;
                  const linkCount = links.filter((l) => l.categoryId === cat.id).length;

                  return (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editCatName}
                            onChange={(e) => setEditCatName(e.target.value)}
                            className="flex-1 px-2.5 py-1 rounded-lg bg-[#050706] border border-white/[0.15] text-xs text-[#F4F5F0]"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveCategoryName(cat.id)}
                            className="px-2.5 py-1 rounded-lg bg-[#B8E66A]/20 text-[#B8E66A] text-xs font-medium cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-medium text-[#F4F5F0]">
                              {cat.name}
                            </span>
                            <span className="text-[11px] text-[#6E726A]">
                              · {linkCount} links
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveCategoryOrder(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1.5 rounded-lg text-[#969A91] hover:text-[#F4F5F0] disabled:opacity-30 cursor-pointer"
                              title="Move Category Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveCategoryOrder(idx, 'down')}
                              disabled={idx === categories.length - 1}
                              className="p-1.5 rounded-lg text-[#969A91] hover:text-[#F4F5F0] disabled:opacity-30 cursor-pointer"
                              title="Move Category Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCatId(cat.id);
                                setEditCatName(cat.name);
                              }}
                              className="p-1.5 rounded-lg text-[#969A91] hover:text-[#B8E66A] cursor-pointer"
                              title="Rename Category"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.id)}
                              disabled={categories.length <= 1}
                              className="p-1.5 rounded-lg text-[#969A91] hover:text-[#FF4D57] disabled:opacity-30 cursor-pointer"
                              title="Delete Category"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'environment' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-[#F4F5F0]">
                      Active Weather & Prayer Location
                    </div>
                    <div className="text-[11px] text-[#969A91]">
                      Currently set to {location.city}, {location.country} (
                      {location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onDetectGps}
                    disabled={isDetectingGps}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#B8E66A]/18 text-[#B8E66A] border border-[#B8E66A]/35 text-xs font-medium cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>{isDetectingGps ? 'Locating...' : 'Detect GPS'}</span>
                  </button>
                </div>

                <form onSubmit={handleSearchCity} className="flex gap-2">
                  <input
                    type="text"
                    value={cityQuery}
                    onChange={(e) => setCityQuery(e.target.value)}
                    placeholder="Search any city worldwide..."
                    className="flex-1 px-3 py-2 rounded-xl bg-[#050706]/80 border border-white/[0.09] text-xs text-[#F4F5F0] placeholder-[#6E726A] focus:outline-none focus:border-[#B8E66A]/45"
                  />
                  <button
                    type="submit"
                    disabled={searchingCity}
                    className="px-4 py-2 rounded-xl bg-white/[0.07] hover:bg-[#B8E66A]/20 text-xs text-[#F4F5F0] hover:text-[#B8E66A] transition-colors cursor-pointer"
                  >
                    {searchingCity ? 'Searching...' : 'Apply City'}
                  </button>
                </form>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {PRESET_LOCATIONS.map((preset) => (
                    <button
                      key={preset.city}
                      type="button"
                      onClick={() => onSelectLocation(preset)}
                      className={`px-3 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                        preset.city.toLowerCase() === location.city.toLowerCase()
                          ? 'bg-[#B8E66A]/20 text-[#B8E66A] border border-[#B8E66A]/40'
                          : 'bg-white/[0.04] text-[#D6D8D0] hover:bg-white/[0.08]'
                      }`}
                    >
                      {preset.city}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#F4F5F0] font-medium">
                    Forest Environment Luminance
                  </span>
                  <span
                    className="text-[#B8E66A] tabular-nums"
                    style={{fontFamily: 'var(--font-mono), monospace'}}
                  >
                    {Math.round(backgroundIntensity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="1.25"
                  step="0.05"
                  value={backgroundIntensity}
                  onChange={(e) =>
                    onChangeBackgroundIntensity(parseFloat(e.target.value))
                  }
                  className="w-full accent-[#B8E66A] cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
