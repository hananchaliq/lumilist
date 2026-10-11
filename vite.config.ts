import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'lumi-api-dev-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith('/api/')) {
            return next();
          }

          const parsedUrl = new URL(req.url, 'http://localhost:3000');

          // 1. Weather API
          if (parsedUrl.pathname === '/api/weather') {
            try {
              const lat = parsedUrl.searchParams.get('lat') || '-10.1772';
              const lon = parsedUrl.searchParams.get('lon') || '123.6070';
              const city = parsedUrl.searchParams.get('city') || 'Kupang';
              const country = parsedUrl.searchParams.get('country') || 'Indonesia';

              const meteoRes = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&timezone=auto&forecast_days=2`
              );

              if (meteoRes.ok) {
                const data = await meteoRes.json();
                const current = data.current || {};
                const hourly = data.hourly || {};
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

                const code = current.weather_code ?? 2;
                const conditionText =
                  code === 0 ? 'Clear Sky' : code <= 2 ? 'Partly Cloudy' : code <= 48 ? 'Misty Fog' : 'Scattered Showers';

                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    city,
                    country,
                    latitude: parseFloat(lat),
                    longitude: parseFloat(lon),
                    timezone: data.timezone || 'Asia/Makassar',
                    currentTemp: Math.round(current.temperature_2m ?? 28),
                    feelsLike: Math.round(current.apparent_temperature ?? 30),
                    humidity: Math.round(current.relative_humidity_2m ?? 75),
                    windSpeed: Math.round(current.wind_speed_10m ?? 12),
                    precipProb: Math.round(precips[startIdx] ?? 15),
                    weatherCode: code,
                    conditionText,
                    hourly: next12,
                    updatedAt: new Date().toISOString(),
                  })
                );
                return;
              }
            } catch (err) {
              console.error('Weather API error:', err);
            }
          }

          // 2. Forex USD/IDR API - Real-time from live market APIs
          if (parsedUrl.pathname === '/api/forex') {
            const tf = (parsedUrl.searchParams.get('timeframe') || '1M').toUpperCase();
            const days =
              tf === '7D' ? 7 : tf === '1M' ? 30 : tf === '3M' ? 90 : tf === '6M' ? 180 : 365;
            const now = new Date();
            const start = new Date(now.getTime() - days * 86400000);
            const formatDate = (d: Date) => d.toISOString().slice(0, 10);
            const startStr = formatDate(start);
            const endStr = formatDate(now);

            try {
              const [seriesRes, spotRes] = await Promise.allSettled([
                fetch(`https://api.frankfurter.dev/v1/${startStr}..${endStr}?base=USD&symbols=IDR`),
                fetch('https://open.er-api.com/v6/latest/USD'),
              ]);

              let series: Array<{ date: string; rate: number }> = [];
              let latestSpot: number | null = null;

              if (seriesRes.status === 'fulfilled' && seriesRes.value.ok) {
                const data = await seriesRes.value.json();
                if (data?.rates) {
                  const dates = Object.keys(data.rates).sort();
                  series = dates
                    .map((d) => ({
                      date: d,
                      rate: Math.round(Number(data.rates[d]?.IDR) * 100) / 100,
                    }))
                    .filter((item) => !Number.isNaN(item.rate) && item.rate > 0);
                }
              }

              // Backup if frankfurter.dev had an issue
              if (series.length < 3) {
                try {
                  const backupRes = await fetch(
                    `https://api.frankfurter.app/${startStr}..${endStr}?from=USD&to=IDR`
                  );
                  if (backupRes.ok) {
                    const bData = await backupRes.json();
                    if (bData?.rates) {
                      const dates = Object.keys(bData.rates).sort();
                      series = dates
                        .map((d) => ({
                          date: d,
                          rate: Math.round(Number(bData.rates[d]?.IDR) * 100) / 100,
                        }))
                        .filter((item) => !Number.isNaN(item.rate) && item.rate > 0);
                    }
                  }
                } catch {
                  // ignore backup error
                }
              }

              if (spotRes.status === 'fulfilled' && spotRes.value.ok) {
                const spotData = await spotRes.value.json();
                if (spotData?.rates?.IDR) {
                  latestSpot = Math.round(Number(spotData.rates.IDR) * 100) / 100;
                }
              }

              if (latestSpot && series.length > 0) {
                const todayStr = formatDate(now);
                const last = series[series.length - 1];
                if (last.date === todayStr) {
                  last.rate = latestSpot;
                } else {
                  series.push({ date: todayStr, rate: latestSpot });
                }
              }

              if (series.length >= 2) {
                const currentRate = latestSpot || series[series.length - 1].rate;
                const prevRate = series[series.length - 2].rate;
                const firstRate = series[0].rate;
                const change24h = Math.round((currentRate - prevRate) * 100) / 100;
                const changePercent24h =
                  prevRate > 0 ? Math.round(((currentRate - prevRate) / prevRate) * 10000) / 100 : 0;
                const periodChange = Math.round((currentRate - firstRate) * 100) / 100;
                const periodChangePercent =
                  firstRate > 0 ? Math.round(((currentRate - firstRate) / firstRate) * 10000) / 100 : 0;
                const rates = series.map((s) => s.rate);

                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    pair: 'USD/IDR',
                    timeframe: tf,
                    currentRate,
                    change24h,
                    changePercent24h,
                    periodChange,
                    periodChangePercent,
                    high: Math.max(...rates),
                    low: Math.min(...rates),
                    updatedAt: new Date().toISOString(),
                    source: 'European Central Bank & Live Interbank FX',
                    series,
                  })
                );
                return;
              }
            } catch (err) {
              console.error('Forex live fetch error:', err);
            }
          }

          // 3. Prayer Times API
          if (parsedUrl.pathname === '/api/prayer') {
            try {
              const lat = parsedUrl.searchParams.get('lat') || '-10.1772';
              const lon = parsedUrl.searchParams.get('lon') || '123.6070';
              const city = parsedUrl.searchParams.get('city') || 'Kupang';
              const country = parsedUrl.searchParams.get('country') || 'Indonesia';

              const aladhanRes = await fetch(
                `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=20`
              );
              if (aladhanRes.ok) {
                const j = await aladhanRes.json();
                const t = j.data?.timings || {};
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    city,
                    country,
                    date: new Date().toISOString().slice(0, 10),
                    latitude: parseFloat(lat),
                    longitude: parseFloat(lon),
                    schedule: {
                      imsak: t.Imsak?.slice(0, 5) || '04:22',
                      subuh: t.Fajr?.slice(0, 5) || '04:32',
                      dhuha: t.Sunrise?.slice(0, 5) || '05:48',
                      dzuhur: t.Dhuhr?.slice(0, 5) || '11:58',
                      ashar: t.Asr?.slice(0, 5) || '15:18',
                      maghrib: t.Maghrib?.slice(0, 5) || '17:58',
                      isya: t.Isha?.slice(0, 5) || '19:08',
                    },
                    source: 'Kemenag RI / Aladhan API',
                  })
                );
                return;
              }
            } catch (err) {
              console.error('Prayer API error:', err);
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                city: parsedUrl.searchParams.get('city') || 'Kupang',
                country: 'Indonesia',
                date: new Date().toISOString().slice(0, 10),
                latitude: -10.1772,
                longitude: 123.607,
                schedule: {
                  imsak: '04:22',
                  subuh: '04:32',
                  dhuha: '05:48',
                  dzuhur: '11:58',
                  ashar: '15:18',
                  maghrib: '17:58',
                  isya: '19:08',
                },
                source: 'Kemenag RI (Standard Fallback)',
              })
            );
            return;
          }

          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(fileURLToPath(new URL('.', import.meta.url)), './'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});
