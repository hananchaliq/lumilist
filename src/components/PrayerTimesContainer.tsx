"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { PrayerResponse, PrayerSchedule } from "@/lib/api-types";
import type { UserLocation } from "@/lib/lumilist-store";

interface PrayerTimesContainerProps {
   location: UserLocation;
}

interface PrayerEntry {
   key: keyof PrayerSchedule;
   label: string;
   time: string;
}

const DEFAULT_SCHEDULE: PrayerSchedule = {
   imsak: "04:22",
   subuh: "04:32",
   dhuha: "06:02",
   dzuhur: "11:58",
   ashar: "15:18",
   maghrib: "17:58",
   isya: "19:08",
};

function parseHHMMToSeconds(hhmm: string): number {
   const [hh, mm] = hhmm.split(":").map(Number);
   return (hh || 0) * 3600 + (mm || 0) * 60;
}

function formatCountdown(totalSeconds: number): string {
   const safe = Math.max(0, Math.floor(totalSeconds));
   const h = String(Math.floor(safe / 3600)).padStart(2, "0");
   const m = String(Math.floor((safe % 3600) / 60)).padStart(2, "0");
   const s = String(safe % 60).padStart(2, "0");

   return `${h}:${m}:${s}`;
}

function getCurrentSeconds(): number {
   const now = new Date();

   return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
}

export default function PrayerTimesContainer({ location }: PrayerTimesContainerProps) {
   // Nilai awal harus konsisten antara server dan browser.
   const [mounted, setMounted] = useState(false);
   const [nowSeconds, setNowSeconds] = useState<number | null>(null);
   const [prayerData, setPrayerData] = useState<PrayerResponse | null>(null);

   // Aktifkan jam setelah komponen terpasang di browser.
   useEffect(() => {
      setMounted(true);

      const tick = () => {
         setNowSeconds(getCurrentSeconds());
      };

      tick();

      const intervalId = window.setInterval(tick, 1000);

      return () => {
         window.clearInterval(intervalId);
      };
   }, []);

   // Muat jadwal salat sesuai lokasi.
   useEffect(() => {
      const controller = new AbortController();
      let active = true;

      async function loadPrayers() {
         try {
            const params = new URLSearchParams({
               city: location.city,
               country: location.country,
               lat: String(location.latitude),
               lon: String(location.longitude),
            });

            const response = await fetch(`/api/prayer?${params.toString()}`, {
               signal: controller.signal,
            });

            if (!response.ok) {
               throw new Error(`Prayer API returned ${response.status}`);
            }

            const data: PrayerResponse = await response.json();

            if (active) {
               setPrayerData(data);
            }
         } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
               return;
            }

            // Jadwal default tetap digunakan jika API gagal.
            console.error("Gagal memuat jadwal salat:", error);
         }
      }

      loadPrayers();

      return () => {
         active = false;
         controller.abort();
      };
   }, [location.city, location.country, location.latitude, location.longitude]);

   const schedule = prayerData?.schedule ?? DEFAULT_SCHEDULE;

   const entries: PrayerEntry[] = useMemo(
      () => [
         { key: "imsak", label: "Imsak", time: schedule.imsak },
         { key: "subuh", label: "Subuh", time: schedule.subuh },
         { key: "dhuha", label: "Dhuha", time: schedule.dhuha },
         { key: "dzuhur", label: "Dzuhur", time: schedule.dzuhur },
         { key: "ashar", label: "Ashar", time: schedule.ashar },
         { key: "maghrib", label: "Maghrib", time: schedule.maghrib },
         { key: "isya", label: "Isya", time: schedule.isya },
      ],
      [schedule]
   );

   const nextPrayerInfo = useMemo(() => {
      // Jangan membaca waktu aktual saat render server atau render awal browser.
      const currentSeconds = nowSeconds ?? 0;

      for (let i = 0; i < entries.length; i++) {
         const targetSeconds = parseHHMMToSeconds(entries[i].time);

         if (targetSeconds > currentSeconds) {
            const previousSeconds = i === 0 ? parseHHMMToSeconds(entries[entries.length - 1].time) - 86400 : parseHHMMToSeconds(entries[i - 1].time);

            const span = Math.max(1, targetSeconds - previousSeconds);
            const elapsed = Math.max(0, currentSeconds - previousSeconds);
            const progress = Math.min(1, Math.max(0, elapsed / span));

            return {
               entry: entries[i],
               remainingSeconds: targetSeconds - currentSeconds,
               progress,
            };
         }
      }

      const firstEntry = entries[0];
      const targetSeconds = parseHHMMToSeconds(firstEntry.time) + 86400;
      const previousSeconds = parseHHMMToSeconds(entries[entries.length - 1].time);

      const span = Math.max(1, targetSeconds - previousSeconds);
      const elapsed = Math.max(0, currentSeconds - previousSeconds);
      const progress = Math.min(1, Math.max(0, elapsed / span));

      return {
         entry: firstEntry,
         remainingSeconds: targetSeconds - currentSeconds,
         progress,
      };
   }, [entries, nowSeconds]);

   const circumference = 2 * Math.PI * 18;
   const strokeDashoffset = circumference * (1 - nextPrayerInfo.progress);

   const countdown = mounted && nowSeconds !== null ? `-${formatCountdown(nextPrayerInfo.remainingSeconds)}` : "--:--:--";

   return (
      <section
         id="section-prayer"
         className="h-full rounded-[24px] p-5 border border-white/[0.08] flex flex-col justify-between transition-all duration-300"
         style={{
            background: "rgba(8, 11, 8, 0.58)",
            backdropFilter: "blur(26px) saturate(145%)",
            WebkitBackdropFilter: "blur(26px) saturate(145%)",
            boxShadow: "0 22px 54px rgba(0, 0, 0, 0.48), inset 0 1px 0 0 rgba(255, 255, 255, 0.09)",
         }}>
         <div>
            <div className="flex items-center justify-between gap-2 mb-3">
               <span className="text-[11px] font-medium text-[#969A91] truncate">
                  {location.city}, {location.country || "ID"}
               </span>

               <span className="w-1.5 h-1.5 rounded-full bg-[#B8E66A] shadow-[0_0_8px_#B8E66A]" />
            </div>

            <div
               className="relative rounded-2xl p-3.5 mb-3.5 border border-[#B8E66A]/25 flex items-center justify-between"
               style={{
                  background: "linear-gradient(135deg, rgba(184, 230, 106, 0.11) 0%, rgba(12, 16, 12, 0.55) 100%)",
               }}>
               <div>
                  <div className="text-[10px] font-medium tracking-wider text-[#B8E66A] uppercase">Next Prayer</div>

                  <div className="text-xl font-semibold tracking-tight text-[#F4F5F0] uppercase mt-0.5" style={{ fontFamily: "var(--font-syne), sans-serif" }}>
                     {nextPrayerInfo.entry.label}
                  </div>

                  <div className="text-sm font-medium text-[#B8E66A] tabular-nums mt-0.5" style={{ fontFamily: "var(--font-mono), monospace" }} aria-live="off" suppressHydrationWarning>
                     {countdown}
                  </div>
               </div>

               <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44" aria-hidden="true">
                     <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />

                     <circle cx="22" cy="22" r="18" fill="none" stroke="#B8E66A" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} />
                  </svg>

                  <span className="absolute text-[10px] font-medium text-[#F4F5F0] tabular-nums" style={{ fontFamily: "var(--font-mono), monospace" }}>
                     {nextPrayerInfo.entry.time}
                  </span>
               </div>
            </div>

            <div className="space-y-1 text-xs tabular-nums" style={{ fontFamily: "var(--font-mono), monospace" }}>
               {entries.map(item => {
                  const isNext = item.key === nextPrayerInfo.entry.key;

                  return (
                     <div key={item.key} className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-all ${isNext ? "bg-[#B8E66A]/15 text-[#B8E66A] border border-[#B8E66A]/30 font-medium shadow-[0_0_14px_rgba(184,230,106,0.1)]" : "text-[#D6D8D0] hover:bg-white/[0.03] border border-transparent"}`}>
                        <div className="flex items-center gap-2">
                           <span className={`w-1.5 h-1.5 rounded-full ${isNext ? "bg-[#B8E66A]" : "bg-white/15"}`} />

                           <span
                              style={{
                                 fontFamily: "var(--font-jakarta), sans-serif",
                              }}>
                              {item.label}
                           </span>
                        </div>

                        <span className={isNext ? "text-[#B8E66A]" : "text-[#969A91]"}>{item.time}</span>
                     </div>
                  );
               })}
            </div>
         </div>

         <div className="mt-3 pt-2.5 border-t border-white/[0.05] flex items-center justify-between text-[10px] text-[#6E726A]">
            <span className="truncate">{prayerData?.source || "MyQuran Kemenag RI"}</span>

            <span>Real-Time</span>
         </div>
      </section>
   );
}
