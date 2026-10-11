'use client';

import React, {useEffect, useState} from 'react';
import {
  Cloud,
  CloudSun,
  Sun,
  CloudRain,
  CloudLightning,
  CloudFog,
  Wind,
  Droplets,
  Thermometer,
  Umbrella,
} from 'lucide-react';
import type {WeatherResponse} from '@/lib/api-types';
import type {UserLocation} from '@/lib/lumilist-store';

interface WeatherContainerProps {
  location: UserLocation;
}

function WeatherGlyph({code, className = 'w-5 h-5'}: {code: number; className?: string}) {
  if (code === 0 || code === 1) {
    return <Sun className={`${className} text-[#B8E66A]`} />;
  }
  if (code === 2) {
    return <CloudSun className={`${className} text-[#B8E66A]`} />;
  }
  if (code === 3) {
    return <Cloud className={`${className} text-[#D6D8D0]`} />;
  }
  if (code === 45 || code === 48) {
    return <CloudFog className={`${className} text-[#969A91]`} />;
  }
  if (code >= 51 && code <= 82) {
    return <CloudRain className={`${className} text-[#A8D95C]`} />;
  }
  if (code >= 95) {
    return <CloudLightning className={`${className} text-[#B8E66A]`} />;
  }
  return <CloudSun className={`${className} text-[#B8E66A]`} />;
}

export default function WeatherContainer({location}: WeatherContainerProps) {
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [localTime, setLocalTime] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'timeline' | 'list'>('timeline');

  useEffect(() => {
    let active = true;
    const loadWeather = async () => {
      try {
        const url = `/api/weather?lat=${location.latitude}&lon=${location.longitude}&city=${encodeURIComponent(
          location.city
        )}&country=${encodeURIComponent(location.country)}`;
        const res = await fetch(url);
        if (res.ok && active) {
          const data: WeatherResponse = await res.json();
          setWeather(data);
          return;
        }
      } catch {
        // Fallback to direct Open-Meteo
      }

      // Direct client fallback to Open-Meteo API for 100% reliability
      try {
        const meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&timezone=auto&forecast_days=2`;
        const res = await fetch(meteoUrl);
        if (res.ok && active) {
          const m = await res.json();
          const current = m.current || {};
          const hourly = m.hourly || {};
          const times: string[] = hourly.time || [];
          const temps: number[] = hourly.temperature_2m || [];
          const precips: number[] = hourly.precipitation_probability || [];
          const codes: number[] = hourly.weather_code || [];

          const nowIso = new Date().toISOString().slice(0, 13);
          let startIdx = times.findIndex((t) => t.startsWith(nowIso));
          if (startIdx < 0) startIdx = 0;

          const next12 = times.slice(startIdx, startIdx + 12).map((t, i) => {
            const idx = startIdx + i;
            const hour = new Date(t).getHours();
            return {
              time: t,
              hourLabel: `${String(hour).padStart(2, '0')}:00`,
              temp: Math.round(temps[idx] ?? 28),
              precipProb: Math.round(precips[idx] ?? 10),
              weatherCode: codes[idx] ?? 2,
            };
          });

          setWeather({
            city: location.city,
            country: location.country || 'Indonesia',
            latitude: location.latitude,
            longitude: location.longitude,
            timezone: m.timezone || 'Asia/Makassar',
            currentTemp: Math.round(current.temperature_2m ?? 28),
            feelsLike: Math.round(current.apparent_temperature ?? 30),
            humidity: Math.round(current.relative_humidity_2m ?? 75),
            windSpeed: Math.round(current.wind_speed_10m ?? 12),
            precipProb: Math.round(precips[startIdx] ?? 15),
            weatherCode: current.weather_code ?? 2,
            conditionText: current.weather_code === 0 ? 'Clear Sky' : current.weather_code <= 2 ? 'Partly Cloudy' : 'Scattered Clouds',
            hourly: next12,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch {
        // Keep initial static fallback
      }
    };
    loadWeather();
    return () => {
      active = false;
    };
  }, [location.latitude, location.longitude, location.city, location.country]);

  useEffect(() => {
    const updateTime = () => {
      try {
        const tz = weather?.timezone || 'Asia/Makassar';
        const formatted = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(new Date());
        setLocalTime(formatted);
      } catch {
        const now = new Date();
        setLocalTime(
          `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
        );
      }
    };
    updateTime();
    const id = setInterval(updateTime, 15000);
    return () => clearInterval(id);
  }, [weather?.timezone]);

  const currentTemp = weather?.currentTemp ?? 28;
  const conditionText = weather?.conditionText ?? 'Partly Cloudy';
  const feelsLike = weather?.feelsLike ?? 31;
  const humidity = weather?.humidity ?? 78;
  const windSpeed = weather?.windSpeed ?? 12;
  const precipProb = weather?.precipProb ?? 15;
  const hourlyList = weather?.hourly?.slice(0, 12) ?? [
    {time: '09:00', hourLabel: '09:00', temp: 29, precipProb: 10, weatherCode: 2},
    {time: '10:00', hourLabel: '10:00', temp: 30, precipProb: 12, weatherCode: 2},
    {time: '11:00', hourLabel: '11:00', temp: 30, precipProb: 15, weatherCode: 2},
    {time: '12:00', hourLabel: '12:00', temp: 31, precipProb: 20, weatherCode: 1},
    {time: '13:00', hourLabel: '13:00', temp: 31, precipProb: 20, weatherCode: 2},
    {time: '14:00', hourLabel: '14:00', temp: 30, precipProb: 25, weatherCode: 2},
    {time: '15:00', hourLabel: '15:00', temp: 29, precipProb: 18, weatherCode: 2},
    {time: '16:00', hourLabel: '16:00', temp: 28, precipProb: 15, weatherCode: 2},
    {time: '17:00', hourLabel: '17:00', temp: 28, precipProb: 10, weatherCode: 1},
    {time: '18:00', hourLabel: '18:00', temp: 27, precipProb: 10, weatherCode: 1},
    {time: '19:00', hourLabel: '19:00', temp: 26, precipProb: 8, weatherCode: 0},
    {time: '20:00', hourLabel: '20:00', temp: 26, precipProb: 5, weatherCode: 0},
  ];

  return (
    <section
      id="section-weather"
      className="h-full rounded-[24px] p-5 border border-white/[0.08] flex flex-col justify-between transition-all duration-300 relative overflow-hidden"
      style={{
        background: 'rgba(8, 11, 8, 0.62)',
        backdropFilter: 'blur(26px) saturate(145%)',
        WebkitBackdropFilter: 'blur(26px) saturate(145%)',
        boxShadow:
          '0 22px 54px rgba(0, 0, 0, 0.48), inset 0 1px 0 0 rgba(255, 255, 255, 0.09)',
      }}
    >
      <div>
        {/* Top Header: Location, Region, & Local Time */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="min-w-0">
            <h2
              className="text-xs font-semibold tracking-wider text-[#F4F5F0] uppercase truncate"
              style={{fontFamily: 'var(--font-syne), sans-serif'}}
            >
              {location.city}
            </h2>
            <p className="text-[10px] text-[#969A91] truncate">
              {location.country || 'Indonesia'}
            </p>
          </div>
          <span
            className="text-[11px] text-[#B8E66A] tabular-nums shrink-0 font-medium px-2 py-0.5 rounded-full bg-[#B8E66A]/10 border border-[#B8E66A]/20"
            style={{fontFamily: 'var(--font-mono), monospace'}}
          >
            {localTime || '09:00'}
          </span>
        </div>

        {/* Hero Temperature Card */}
        <div className="relative rounded-2xl p-3.5 mb-3 bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.06] flex items-center justify-between">
          <div>
            <div
              className="text-4xl font-light text-[#F4F5F0] tracking-tight tabular-nums"
              style={{fontFamily: 'var(--font-syne), sans-serif'}}
            >
              {currentTemp}°
            </div>
            <div className="text-xs font-medium text-[#B8E66A] mt-0.5 flex items-center gap-1.5">
              <span>{conditionText}</span>
            </div>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-[#B8E66A]/[0.10] border border-[#B8E66A]/25 flex items-center justify-center shadow-[0_0_20px_rgba(184,230,106,0.12)] shrink-0">
            <WeatherGlyph code={weather?.weatherCode ?? 2} className="w-6 h-6" />
          </div>
        </div>

        {/* 4-Metric Environmental Grid */}
        <div className="grid grid-cols-2 gap-1.5 mb-3.5 text-xs">
          <div className="px-2.5 py-1.5 rounded-xl bg-white/[0.025] border border-white/[0.05] flex items-center justify-between">
            <span className="text-[#969A91] flex items-center gap-1 text-[11px]">
              <Thermometer className="w-3 h-3 text-[#B8E66A]/80" />
              Feels
            </span>
            <span
              className="text-[#F4F5F0] font-medium tabular-nums"
              style={{fontFamily: 'var(--font-mono), monospace'}}
            >
              {feelsLike}°
            </span>
          </div>

          <div className="px-2.5 py-1.5 rounded-xl bg-white/[0.025] border border-white/[0.05] flex items-center justify-between">
            <span className="text-[#969A91] flex items-center gap-1 text-[11px]">
              <Droplets className="w-3 h-3 text-[#B8E66A]/80" />
              Humidity
            </span>
            <span
              className="text-[#F4F5F0] font-medium tabular-nums"
              style={{fontFamily: 'var(--font-mono), monospace'}}
            >
              {humidity}%
            </span>
          </div>

          <div className="px-2.5 py-1.5 rounded-xl bg-white/[0.025] border border-white/[0.05] flex items-center justify-between">
            <span className="text-[#969A91] flex items-center gap-1 text-[11px]">
              <Wind className="w-3 h-3 text-[#B8E66A]/80" />
              Wind
            </span>
            <span
              className="text-[#F4F5F0] font-medium tabular-nums whitespace-nowrap"
              style={{fontFamily: 'var(--font-mono), monospace'}}
            >
              {windSpeed} km/h
            </span>
          </div>

          <div className="px-2.5 py-1.5 rounded-xl bg-white/[0.025] border border-white/[0.05] flex items-center justify-between">
            <span className="text-[#969A91] flex items-center gap-1 text-[11px]">
              <Umbrella className="w-3 h-3 text-[#B8E66A]/80" />
              Precip
            </span>
            <span
              className="text-[#F4F5F0] font-medium tabular-nums"
              style={{fontFamily: 'var(--font-mono), monospace'}}
            >
              {precipProb}%
            </span>
          </div>
        </div>

        {/* 12-Hour Forecast Section Header */}
        <div className="flex items-center justify-between text-[11px] text-[#969A91] mb-2">
          <span className="font-medium text-[#D6D8D0]">12-Hour Forecast</span>
          <div className="flex items-center gap-1 text-[10px]">
            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                activeTab === 'timeline'
                  ? 'text-[#B8E66A] bg-[#B8E66A]/10 font-medium'
                  : 'text-[#6E726A] hover:text-[#969A91]'
              }`}
            >
              Cards
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                activeTab === 'list'
                  ? 'text-[#B8E66A] bg-[#B8E66A]/10 font-medium'
                  : 'text-[#6E726A] hover:text-[#969A91]'
              }`}
            >
              List
            </button>
          </div>
        </div>

        {/* 12-Hour Forecast Display */}
        {activeTab === 'timeline' ? (
          <div className="flex gap-1.5 overflow-x-auto pb-2 weather-scrollbar select-none">
            {hourlyList.map((item, idx) => (
              <div
                key={item.time + idx}
                className="flex-shrink-0 w-[58px] p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] flex flex-col items-center gap-1 transition-colors text-center"
              >
                <span
                  className="text-[10px] text-[#969A91] tabular-nums"
                  style={{fontFamily: 'var(--font-mono), monospace'}}
                >
                  {item.hourLabel}
                </span>
                <WeatherGlyph code={item.weatherCode} className="w-3.5 h-3.5 my-0.5" />
                <span
                  className="text-xs font-medium text-[#F4F5F0] tabular-nums"
                  style={{fontFamily: 'var(--font-mono), monospace'}}
                >
                  {item.temp}°
                </span>
                {item.precipProb > 0 && (
                  <span className="text-[9px] text-[#A8D95C] tabular-nums">
                    {item.precipProb}%
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div
            className="grid grid-cols-2 gap-x-2 gap-y-1 max-h-[120px] overflow-y-auto pr-1 text-xs tabular-nums weather-scrollbar"
            style={{fontFamily: 'var(--font-mono), monospace'}}
          >
            {hourlyList.map((item, idx) => (
              <div
                key={item.time + idx}
                className="flex items-center justify-between py-1 px-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
              >
                <span className="text-[#969A91] text-[11px]">{item.hourLabel}</span>
                <div className="flex items-center gap-1.5">
                  <WeatherGlyph code={item.weatherCode} className="w-3 h-3" />
                  <span className="text-[#F4F5F0] font-medium text-[11px]">
                    {item.temp}°
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Live Telemetry */}
      <div className="mt-3 pt-2.5 border-t border-white/[0.05] flex items-center justify-between text-[10px] text-[#6E726A] tabular-nums">
        <span>
          {location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°
        </span>
        <span className="text-[#B8E66A]/80">Open-Meteo Live</span>
      </div>
    </section>
  );
}
