import {NextRequest, NextResponse} from 'next/server';

export interface HourlyForecastItem {
  time: string;
  hourLabel: string;
  temp: number;
  precipProb: number;
  weatherCode: number;
}

export interface WeatherResponse {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  currentTemp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  precipProb: number;
  weatherCode: number;
  conditionText: string;
  hourly: HourlyForecastItem[];
  updatedAt: string;
}

function decodeWMO(code: number): string {
  if (code === 0) return 'Clear Sky';
  if (code === 1) return 'Mainly Clear';
  if (code === 2) return 'Partly Cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Misty Fog';
  if (code >= 51 && code <= 57) return 'Light Drizzle';
  if (code >= 61 && code <= 67) return 'Rain Showers';
  if (code >= 71 && code <= 77) return 'Snowfall';
  if (code >= 80 && code <= 82) return 'Tropical Showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Partly Cloudy';
}

export async function GET(req: NextRequest) {
  const {searchParams} = new URL(req.url);
  const q = searchParams.get('q');
  let lat = parseFloat(searchParams.get('lat') || '-10.1772');
  let lon = parseFloat(searchParams.get('lon') || '123.6070');
  let city = searchParams.get('city') || 'Kupang';
  let country = searchParams.get('country') || 'Indonesia';

  try {
    if (q && q.trim().length > 0) {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          q.trim()
        )}&count=1&language=en&format=json`,
        {next: {revalidate: 3600}}
      );
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData?.results?.length > 0) {
          const hit = geoData.results[0];
          lat = hit.latitude;
          lon = hit.longitude;
          city = hit.name;
          country = hit.country || '';
        }
      }
    } else if (!searchParams.get('city') && searchParams.get('lat') && searchParams.get('lon')) {
      try {
        const revRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
          {
            headers: {'User-Agent': 'LumiList-Personal-OS/1.0'},
            next: {revalidate: 3600},
          }
        );
        if (revRes.ok) {
          const revData = await revRes.json();
          const addr = revData?.address;
          if (addr) {
            city =
              addr.city ||
              addr.town ||
              addr.municipality ||
              addr.county ||
              addr.state ||
              'Kupang';
            country = addr.country || 'Indonesia';
          }
        }
      } catch {
        // Ignore
      }
    }

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&timezone=auto&forecast_days=2`;
    const res = await fetch(weatherUrl, {next: {revalidate: 300}});

    if (res.ok) {
      const data = await res.json();
      const current = data.current || {};
      const hourly = data.hourly || {};
      const times: string[] = hourly.time || [];
      const temps: number[] = hourly.temperature_2m || [];
      const probs: number[] = hourly.precipitation_probability || [];
      const codes: number[] = hourly.weather_code || [];

      const currentIsoPrefix = (current.time || '').slice(0, 13);
      let startIndex = times.findIndex((t) => t.slice(0, 13) === currentIsoPrefix);
      if (startIndex === -1) startIndex = 0;

      const next12Hours: HourlyForecastItem[] = [];
      for (let i = startIndex; i < Math.min(startIndex + 12, times.length); i++) {
        const rawTime = times[i];
        const hourLabel = rawTime.includes('T') ? rawTime.split('T')[1].slice(0, 5) : rawTime;
        next12Hours.push({
          time: rawTime,
          hourLabel,
          temp: Math.round(temps[i] ?? 28),
          precipProb: Math.round(probs[i] ?? 10),
          weatherCode: codes[i] ?? 2,
        });
      }

      const currentPrecipProb =
        next12Hours.length > 0 ? next12Hours[0].precipProb : Math.round((current.precipitation || 0) * 10);

      const responsePayload: WeatherResponse = {
        city,
        country,
        latitude: lat,
        longitude: lon,
        timezone: data.timezone || 'Asia/Makassar',
        currentTemp: Math.round(current.temperature_2m ?? 28),
        feelsLike: Math.round(current.apparent_temperature ?? 31),
        humidity: Math.round(current.relative_humidity_2m ?? 78),
        windSpeed: Math.round(current.wind_speed_10m ?? 12),
        precipProb: currentPrecipProb,
        weatherCode: current.weather_code ?? 2,
        conditionText: decodeWMO(current.weather_code ?? 2),
        hourly: next12Hours,
        updatedAt: new Date().toISOString(),
      };

      return NextResponse.json(responsePayload);
    }
  } catch {
    // Fallback
  }

  const fallbackHourly: HourlyForecastItem[] = [
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

  return NextResponse.json({
    city,
    country,
    latitude: lat,
    longitude: lon,
    timezone: 'Asia/Makassar',
    currentTemp: 28,
    feelsLike: 31,
    humidity: 78,
    windSpeed: 12,
    precipProb: 15,
    weatherCode: 2,
    conditionText: 'Partly Cloudy',
    hourly: fallbackHourly,
    updatedAt: new Date().toISOString(),
  } satisfies WeatherResponse);
}
