'use client';

import React, {useState, useEffect, useRef, useCallback} from 'react';
import ForestAtmosphereCanvas from '@/components/ForestAtmosphereCanvas';
import HeaderBar from '@/components/HeaderBar';
import FloatingSearchBar from '@/components/FloatingSearchBar';
import QuickLinksContainer from '@/components/QuickLinksContainer';
import UsdIdrChartContainer from '@/components/UsdIdrChartContainer';
import WeatherContainer from '@/components/WeatherContainer';
import DailyPlannerContainer from '@/components/DailyPlannerContainer';
import PrayerTimesContainer from '@/components/PrayerTimesContainer';
import MusicPlayerContainer from '@/components/MusicPlayerContainer';
import SettingsOverlayModal from '@/components/SettingsOverlayModal';
import {
  DEFAULT_LOCATION,
  DEFAULT_QUICK_LINKS,
  QuickLinkCategory,
  QuickLinkItem,
  RoutineStoreByDate,
  RoutineTask,
  UserLocation,
  createInitialRoutineStore,
} from '@/lib/lumilist-store';

const STORAGE_KEY_LINKS = 'lumilist_quicklinks_v1';
const STORAGE_KEY_ROUTINES = 'lumilist_routines_v1';
const STORAGE_KEY_LOCATION = 'lumilist_location_v1';
const STORAGE_KEY_BG_INTENSITY = 'lumilist_bg_intensity_v1';

export default function LumiListPage() {
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [categories, setCategories] = useState<QuickLinkCategory[]>(
    DEFAULT_QUICK_LINKS.categories
  );
  const [links, setLinks] = useState<QuickLinkItem[]>(DEFAULT_QUICK_LINKS.links);
  const [routineStore, setRoutineStore] = useState<RoutineStoreByDate>(() =>
    createInitialRoutineStore(new Date())
  );
  const [location, setLocation] = useState<UserLocation>(DEFAULT_LOCATION);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [backgroundIntensity, setBackgroundIntensity] = useState<number>(1);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<
    'links' | 'categories' | 'environment'
  >('links');
  const [hydrated, setHydrated] = useState(false);

  const detectBrowserLocation = useCallback((silent = false) => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) return;
    if (!silent) setIsDetectingGps(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        try {
          const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
          if (res.ok) {
            const data = await res.json();
            const detectedLoc: UserLocation = {
              city: data.city || 'Kupang',
              country: data.country || 'Indonesia',
              latitude: lat,
              longitude: lon,
              isAutoDetected: true,
            };
            setLocation(detectedLoc);
            localStorage.setItem(STORAGE_KEY_LOCATION, JSON.stringify(detectedLoc));
          }
        } catch {
          // Keep current location
        } finally {
          setIsDetectingGps(false);
        }
      },
      () => {
        setIsDetectingGps(false);
      },
      {timeout: 6000, maximumAge: 600000}
    );
  }, []);

  useEffect(() => {
    try {
      const savedLinksRaw = localStorage.getItem(STORAGE_KEY_LINKS);
      if (savedLinksRaw) {
        const parsed = JSON.parse(savedLinksRaw);
        if (Array.isArray(parsed.categories) && parsed.categories.length > 0) {
          setCategories(parsed.categories);
        }
        if (Array.isArray(parsed.links)) {
          setLinks(parsed.links);
        }
      }

      const savedRoutinesRaw = localStorage.getItem(STORAGE_KEY_ROUTINES);
      if (savedRoutinesRaw) {
        const parsedRoutines = JSON.parse(savedRoutinesRaw);
        if (parsedRoutines && typeof parsedRoutines === 'object') {
          setRoutineStore((prev) => ({...prev, ...parsedRoutines}));
        }
      } else {
        const initial = createInitialRoutineStore(new Date());
        setRoutineStore(initial);
        localStorage.setItem(STORAGE_KEY_ROUTINES, JSON.stringify(initial));
      }

      const savedBgRaw = localStorage.getItem(STORAGE_KEY_BG_INTENSITY);
      if (savedBgRaw) {
        const val = parseFloat(savedBgRaw);
        if (!Number.isNaN(val)) setBackgroundIntensity(val);
      }

      const savedLocRaw = localStorage.getItem(STORAGE_KEY_LOCATION);
      if (savedLocRaw) {
        const parsedLoc = JSON.parse(savedLocRaw);
        if (parsedLoc && parsedLoc.city) {
          setLocation(parsedLoc);
        }
      } else {
        detectBrowserLocation(true);
      }
    } catch {
      // Ignore
    } finally {
      setHydrated(true);
    }
  }, [detectBrowserLocation]);

  const handleUpdateCategories = (nextCategories: QuickLinkCategory[]) => {
    setCategories(nextCategories);
    try {
      localStorage.setItem(
        STORAGE_KEY_LINKS,
        JSON.stringify({categories: nextCategories, links})
      );
    } catch {
      // Ignore
    }
  };

  const handleUpdateLinks = (nextLinks: QuickLinkItem[]) => {
    setLinks(nextLinks);
    try {
      localStorage.setItem(
        STORAGE_KEY_LINKS,
        JSON.stringify({categories, links: nextLinks})
      );
    } catch {
      // Ignore
    }
  };

  const handleResetDefaults = () => {
    setCategories(DEFAULT_QUICK_LINKS.categories);
    setLinks(DEFAULT_QUICK_LINKS.links);
    try {
      localStorage.setItem(
        STORAGE_KEY_LINKS,
        JSON.stringify(DEFAULT_QUICK_LINKS)
      );
    } catch {
      // Ignore
    }
  };

  const handleUpdateTasksForDate = (dateKey: string, tasks: RoutineTask[]) => {
    setRoutineStore((prev) => {
      const next = {...prev, [dateKey]: tasks};
      try {
        localStorage.setItem(STORAGE_KEY_ROUTINES, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const handleSelectLocation = (loc: UserLocation) => {
    setLocation(loc);
    try {
      localStorage.setItem(STORAGE_KEY_LOCATION, JSON.stringify(loc));
    } catch {
      // Ignore
    }
  };

  const handleChangeBgIntensity = (val: number) => {
    setBackgroundIntensity(val);
    try {
      localStorage.setItem(STORAGE_KEY_BG_INTENSITY, String(val));
    } catch {
      // Ignore
    }
  };

  const handleOpenSettings = (
    tab: 'links' | 'categories' | 'environment' = 'links'
  ) => {
    setSettingsInitialTab(tab);
    setSettingsOpen(true);
  };

  const handleFocusSearch = () => {
    searchInputRef.current?.focus();
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  return (
    <div id="top" className="relative min-h-screen w-full text-[#F4F5F0]">
      <ForestAtmosphereCanvas backgroundIntensity={backgroundIntensity} />

      <div className="relative z-10 flex flex-col min-h-screen">
        <HeaderBar
          location={location}
          onSelectLocation={handleSelectLocation}
          onDetectGps={() => detectBrowserLocation(false)}
          isDetectingGps={isDetectingGps}
          onOpenSettings={handleOpenSettings}
          onFocusSearch={handleFocusSearch}
        />

        <section
          aria-label="Search and Command"
          className="w-full pt-24 sm:pt-32 md:pt-40 pb-12 sm:pb-16 md:pb-20 flex flex-col items-center justify-center"
        >
          <div className="mb-4 flex items-center gap-2 text-xs text-[#D6D8D0]/75 tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B8E66A]/80" />
            <span>{location.city}, {location.country}</span>
            <span aria-hidden="true" className="text-[#6E726A]">·</span>
            <span className="text-[#969A91]">Personal Operating Environment</span>
          </div>

          <FloatingSearchBar
            inputRef={searchInputRef}
            links={links}
            categories={categories}
          />
        </section>

        <main className="mx-auto w-full max-w-[1380px] px-4 sm:px-6 space-y-6 sm:space-y-8 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-8 gap-6 items-stretch">
            <div className="col-span-1 md:col-span-8 lg:col-span-4">
              <QuickLinksContainer
                categories={categories}
                links={links}
                onOpenManage={() => handleOpenSettings('links')}
              />
            </div>

            <div className="col-span-1 md:col-span-4 lg:col-span-2">
              <UsdIdrChartContainer />
            </div>

            <div className="col-span-1 md:col-span-4 lg:col-span-2">
              <MusicPlayerContainer />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-10 gap-6 items-stretch">
            <div className="md:col-span-1 lg:col-span-2 order-2 lg:order-1">
              <WeatherContainer location={location} />
            </div>

            <div className="md:col-span-2 lg:col-span-6 order-1 lg:order-2">
              <DailyPlannerContainer
                routineStore={routineStore}
                onUpdateTasksForDate={handleUpdateTasksForDate}
              />
            </div>

            <div className="md:col-span-1 lg:col-span-2 order-3 lg:order-3">
              <PrayerTimesContainer location={location} />
            </div>
          </div>
        </main>

        <footer className="mt-auto mx-auto w-full max-w-[1380px] px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#6E726A]">
          <div className="flex items-center gap-2">
            <span className="text-[#969A91] font-medium">LumiList</span>
            <span>·</span>
            <span>Liquid-Glass Personal Workspace</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleFocusSearch}
              className="hover:text-[#D6D8D0] transition-colors cursor-pointer"
            >
              Press ⌘K to Search
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => handleOpenSettings('links')}
              className="hover:text-[#B8E66A] transition-colors cursor-pointer"
            >
              Manage Quick Links
            </button>
          </div>
        </footer>
      </div>

      {hydrated && (
        <SettingsOverlayModal
          isOpen={settingsOpen}
          initialTab={settingsInitialTab}
          onClose={() => setSettingsOpen(false)}
          categories={categories}
          links={links}
          onUpdateCategories={handleUpdateCategories}
          onUpdateLinks={handleUpdateLinks}
          onResetDefaults={handleResetDefaults}
          location={location}
          onSelectLocation={handleSelectLocation}
          onDetectGps={() => detectBrowserLocation(false)}
          isDetectingGps={isDetectingGps}
          backgroundIntensity={backgroundIntensity}
          onChangeBackgroundIntensity={handleChangeBgIntensity}
        />
      )}
    </div>
  );
}
