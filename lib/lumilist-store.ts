export interface QuickLinkItem {
  id: string;
  title: string;
  url: string;
  categoryId: string;
  shortcut?: string;
}

export interface QuickLinkCategory {
  id: string;
  name: string;
}

export interface QuickLinksState {
  categories: QuickLinkCategory[];
  links: QuickLinkItem[];
}

export interface RoutineTask {
  id: string;
  title: string;
  time: string;
  category?: string;
  completed: boolean;
}

export type RoutineStoreByDate = Record<string, RoutineTask[]>;

export interface UserLocation {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  isAutoDetected?: boolean;
}

export const DEFAULT_LOCATION: UserLocation = {
  city: 'Kupang',
  country: 'Indonesia',
  latitude: -10.1772,
  longitude: 123.607,
  isAutoDetected: false,
};

export const PRESET_LOCATIONS: UserLocation[] = [
  {city: 'Kupang', country: 'Indonesia', latitude: -10.1772, longitude: 123.607},
  {city: 'Jakarta', country: 'Indonesia', latitude: -6.2088, longitude: 106.8456},
  {city: 'Bandung', country: 'Indonesia', latitude: -6.9175, longitude: 107.6191},
  {city: 'Surabaya', country: 'Indonesia', latitude: -7.2575, longitude: 112.7521},
  {city: 'Yogyakarta', country: 'Indonesia', latitude: -7.7956, longitude: 110.3695},
  {city: 'Denpasar', country: 'Indonesia', latitude: -8.6705, longitude: 115.2126},
  {city: 'Makassar', country: 'Indonesia', latitude: -5.1477, longitude: 119.4327},
];

export const DEFAULT_QUICK_LINKS: QuickLinksState = {
  categories: [
    {id: 'dev', name: 'Development'},
    {id: 'finance', name: 'Finance'},
    {id: 'education', name: 'Education'},
    {id: 'social', name: 'Social'},
    {id: 'tools', name: 'Tools'},
  ],
  links: [
    // Development
    {id: 'l-github', title: 'GitHub', url: 'https://github.com', categoryId: 'dev'},
    {id: 'l-vercel', title: 'Vercel', url: 'https://vercel.com', categoryId: 'dev'},
    {id: 'l-laravel', title: 'Laravel', url: 'https://laravel.com', categoryId: 'dev'},
    {id: 'l-vscode', title: 'VS Code', url: 'https://vscode.dev', categoryId: 'dev'},
    {id: 'l-tailwind', title: 'Tailwind CSS', url: 'https://tailwindcss.com', categoryId: 'dev'},
    {id: 'l-nextjs', title: 'Next.js Docs', url: 'https://nextjs.org/docs', categoryId: 'dev'},
    {id: 'l-supabase', title: 'Supabase', url: 'https://supabase.com', categoryId: 'dev'},
    {id: 'l-mdn', title: 'MDN Web Docs', url: 'https://developer.mozilla.org', categoryId: 'dev'},

    // Finance
    {id: 'l-tradingview', title: 'TradingView', url: 'https://www.tradingview.com', categoryId: 'finance'},
    {id: 'l-bloomberg', title: 'Bloomberg', url: 'https://www.bloomberg.com', categoryId: 'finance'},
    {id: 'l-wise', title: 'Wise', url: 'https://wise.com', categoryId: 'finance'},
    {id: 'l-stripe', title: 'Stripe', url: 'https://dashboard.stripe.com', categoryId: 'finance'},
    {id: 'l-idx', title: 'IDX Indonesia', url: 'https://www.idx.co.id', categoryId: 'finance'},
    {id: 'l-investing', title: 'Investing.com', url: 'https://www.investing.com', categoryId: 'finance'},

    // Education
    {id: 'l-scholar', title: 'Google Scholar', url: 'https://scholar.google.com', categoryId: 'education'},
    {id: 'l-arxiv', title: 'arXiv Research', url: 'https://arxiv.org', categoryId: 'education'},
    {id: 'l-coursera', title: 'Coursera', url: 'https://www.coursera.org', categoryId: 'education'},
    {id: 'l-mit', title: 'MIT OpenCourse', url: 'https://ocw.mit.edu', categoryId: 'education'},
    {id: 'l-roadmap', title: 'Roadmap.sh', url: 'https://roadmap.sh', categoryId: 'education'},

    // Social
    {id: 'l-youtube', title: 'YouTube', url: 'https://www.youtube.com', categoryId: 'social'},
    {id: 'l-x', title: 'X / Twitter', url: 'https://x.com', categoryId: 'social'},
    {id: 'l-linkedin', title: 'LinkedIn', url: 'https://www.linkedin.com', categoryId: 'social'},
    {id: 'l-reddit', title: 'Reddit', url: 'https://www.reddit.com', categoryId: 'social'},
    {id: 'l-discord', title: 'Discord', url: 'https://discord.com/app', categoryId: 'social'},

    // Tools
    {id: 'l-google', title: 'Google', url: 'https://www.google.com', categoryId: 'tools'},
    {id: 'l-figma', title: 'Figma', url: 'https://www.figma.com', categoryId: 'tools'},
    {id: 'l-notion', title: 'Notion', url: 'https://www.notion.so', categoryId: 'tools'},
    {id: 'l-linear', title: 'Linear', url: 'https://linear.app', categoryId: 'tools'},
    {id: 'l-excalidraw', title: 'Excalidraw', url: 'https://excalidraw.com', categoryId: 'tools'},
    {id: 'l-raycast', title: 'Raycast', url: 'https://www.raycast.com', categoryId: 'tools'},
  ],
};

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/**
 * Returns the 7 days (Monday -> Sunday) of the week containing `targetDate`
 */
export function getWeekDatesForDate(targetDate: Date): Date[] {
  const d = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);

  const week: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    week.push(cur);
  }
  return week;
}

export function buildDefaultTasksForDayIndex(
  dateKey: string,
  completedIndices: number[]
): RoutineTask[] {
  const base = [
    {title: 'Morning routine', time: '07:00', category: 'Wellness'},
    {title: 'Study', time: '09:00', category: 'Education'},
    {title: 'Programming', time: '13:00', category: 'Development'},
    {title: 'Exercise', time: '16:00', category: 'Fitness'},
    {title: 'Reading', time: '20:00', category: 'Personal'},
  ];

  return base.map((item, idx) => ({
    id: `${dateKey}-t${idx + 1}`,
    title: item.title,
    time: item.time,
    category: item.category,
    completed: completedIndices.includes(idx),
  }));
}

/**
 * Generates initial week data so the user immediately sees realistic daily routines
 * and authentic weekly progress percentages across Monday–Sunday.
 */
export function createInitialRoutineStore(anchorDate: Date): RoutineStoreByDate {
  const store: RoutineStoreByDate = {};
  const weekDates = getWeekDatesForDate(anchorDate);
  const todayKey = formatDateKey(anchorDate);

  // Weekly completion pattern:
  // Mon: 3/5 (60%), Tue: 4/5 (80%), Wed: 2/5 (40%), Thu: 5/5 (100%), Fri: 4/5 (80%), Sat: 4/5 (80%), Sun: 3/5 (60%)
  const weeklyPatterns: number[][] = [
    [0, 1, 2], // Mon: 60%
    [0, 1, 2, 4], // Tue: 80%
    [0, 2], // Wed: 40%
    [0, 1, 2, 3, 4], // Thu: 100%
    [0, 1, 2, 4], // Fri: 80%
    [0, 1, 3, 4], // Sat: 80%
    [0, 1, 4], // Sun: 60%
  ];

  weekDates.forEach((d, idx) => {
    const key = formatDateKey(d);
    if (key === todayKey) {
      store[key] = buildDefaultTasksForDayIndex(key, [0, 1, 2, 4]);
    } else {
      store[key] = buildDefaultTasksForDayIndex(key, weeklyPatterns[idx] || [0, 1, 2]);
    }
  });

  if (!store['2026-10-08']) {
    store['2026-10-08'] = buildDefaultTasksForDayIndex('2026-10-08', [0, 1, 2, 4]);
  }

  return store;
}

export function getDomainFromUrl(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
