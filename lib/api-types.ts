export interface ForexDataPoint {
  date: string;
  rate: number;
}

export interface ForexResponse {
  pair: string;
  timeframe: string;
  currentRate: number;
  change24h: number;
  changePercent24h: number;
  periodChange: number;
  periodChangePercent: number;
  high: number;
  low: number;
  updatedAt: string;
  source: string;
  series: ForexDataPoint[];
}

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

export interface PrayerSchedule {
  imsak: string;
  subuh: string;
  dhuha: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
}

export interface PrayerResponse {
  city: string;
  country: string;
  date: string;
  latitude: number;
  longitude: number;
  schedule: PrayerSchedule;
  source: string;
}
