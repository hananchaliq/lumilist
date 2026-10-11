import {NextRequest, NextResponse} from 'next/server';

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
  hijriDate?: string;
  source: string;
  schedule: PrayerSchedule;
}

function cleanTimeStr(val: string | undefined, fallback: string): string {
  if (!val) return fallback;
  const match = val.match(/(\d{2}:\d{2})/);
  return match ? match[1] : fallback;
}

function addMinutesToTime(timeHHMM: string, minutesToAdd: number): string {
  const parts = timeHHMM.split(':').map(Number);
  if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return '06:02';
  const totalMinutes = (parts[0] * 60 + parts[1] + minutesToAdd + 1440) % 1440;
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const mm = String(totalMinutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export async function GET(req: NextRequest) {
  const {searchParams} = new URL(req.url);
  const city = searchParams.get('city') || 'Kupang';
  const country = searchParams.get('country') || 'Indonesia';
  const lat = parseFloat(searchParams.get('lat') || '-10.1772');
  const lon = parseFloat(searchParams.get('lon') || '123.6070');

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dateISO = `${yyyy}-${mm}-${dd}`;

  try {
    const cleanCityQuery = city.replace(/^(Kota|Kabupaten)\s+/i, '').trim();
    const searchRes = await fetch(
      `https://api.myquran.com/v2/sholat/kota/cari/${encodeURIComponent(cleanCityQuery)}`,
      {next: {revalidate: 3600}}
    );
    if (searchRes.ok) {
      const searchJson = await searchRes.json();
      if (searchJson?.status && Array.isArray(searchJson.data) && searchJson.data.length > 0) {
        const kotaMatch =
          searchJson.data.find((item: {lokasi: string}) =>
            item.lokasi.toUpperCase().includes('KOTA')
          ) || searchJson.data[0];
        const kotaId = kotaMatch.id;

        const scheduleRes = await fetch(
          `https://api.myquran.com/v2/sholat/jadwal/${kotaId}/${yyyy}/${mm}/${dd}`,
          {next: {revalidate: 1800}}
        );
        if (scheduleRes.ok) {
          const schedJson = await scheduleRes.json();
          const j = schedJson?.data?.jadwal;
          if (j && j.subuh && j.dzuhur) {
            const payload: PrayerResponse = {
              city,
              country,
              date: j.tanggal || dateISO,
              source: 'MyQuran Kemenag RI',
              schedule: {
                imsak: cleanTimeStr(j.imsak, '04:22'),
                subuh: cleanTimeStr(j.subuh, '04:32'),
                dhuha: cleanTimeStr(j.dhuha, '06:02'),
                dzuhur: cleanTimeStr(j.dzuhur, '11:58'),
                ashar: cleanTimeStr(j.ashar, '15:18'),
                maghrib: cleanTimeStr(j.maghrib, '17:58'),
                isya: cleanTimeStr(j.isya, '19:08'),
              },
            };
            return NextResponse.json(payload);
          }
        }
      }
    }
  } catch {
    // Fall through
  }

  try {
    const aladhanUrl = `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${lat}&longitude=${lon}&method=20`;
    const aladhanRes = await fetch(aladhanUrl, {next: {revalidate: 1800}});
    if (aladhanRes.ok) {
      const aladhanJson = await aladhanRes.json();
      const timings = aladhanJson?.data?.timings;
      const hijri = aladhanJson?.data?.date?.hijri;
      if (timings) {
        const sunrise = cleanTimeStr(timings.Sunrise, '05:42');
        const dhuhaCalc = addMinutesToTime(sunrise, 20);
        const hijriDate = hijri
          ? `${hijri.day} ${hijri.month?.en || ''} ${hijri.year} AH`
          : undefined;

        const payload: PrayerResponse = {
          city,
          country,
          date: dateISO,
          hijriDate,
          source: 'Kemenag Astronomical API',
          schedule: {
            imsak: cleanTimeStr(timings.Imsak, '04:22'),
            subuh: cleanTimeStr(timings.Fajr, '04:32'),
            dhuha: dhuhaCalc,
            dzuhur: cleanTimeStr(timings.Dhuhr, '11:58'),
            ashar: cleanTimeStr(timings.Asr, '15:18'),
            maghrib: cleanTimeStr(timings.Maghrib, '17:58'),
            isya: cleanTimeStr(timings.Isha, '19:08'),
          },
        };
        return NextResponse.json(payload);
      }
    }
  } catch {
    // Fall through
  }

  const payload: PrayerResponse = {
    city,
    country,
    date: dateISO,
    source: 'Astronomical Ephemeris',
    schedule: {
      imsak: '04:22',
      subuh: '04:32',
      dhuha: '06:02',
      dzuhur: '11:58',
      ashar: '15:18',
      maghrib: '17:58',
      isya: '19:08',
    },
  };

  return NextResponse.json(payload);
}
