'use client';

import React, {useEffect, useState, useMemo, useCallback} from 'react';
import {TrendingUp, TrendingDown, RefreshCw, Activity} from 'lucide-react';
import type {ForexResponse} from '@/lib/api-types';

const TIMEFRAMES = ['7D', '1M', '3M', '6M', '1Y'] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

export default function UsdIdrChartContainer() {
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const [data, setData] = useState<ForexResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const fetchForex = useCallback(async (tf: Timeframe) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/forex?timeframe=${tf}`);
      if (res.ok) {
        const json: ForexResponse = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch realtime forex:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForex(timeframe);
    // Realtime polling every 60 seconds
    const interval = setInterval(() => {
      fetchForex(timeframe);
    }, 60000);
    return () => clearInterval(interval);
  }, [timeframe, fetchForex]);

  const series = data?.series || [];
  const isPositive24h = (data?.change24h ?? 0) >= 0;
  const isPositivePeriod =
    series.length >= 2
      ? series[series.length - 1].rate >= series[0].rate
      : isPositive24h;

  const chartColor = isPositivePeriod ? '#38D996' : '#FF4D57';

  const svgGeometry = useMemo(() => {
    const width = 260;
    const height = 118;
    const padTop = 10;
    const padBottom = 14;
    const usableH = height - padTop - padBottom;

    if (series.length < 2) {
      return {
        width,
        height,
        linePath: '',
        areaPath: '',
        points: [] as Array<{x: number; y: number; date: string; rate: number}>,
        lastY: height / 2,
      };
    }

    const rates = series.map((d) => d.rate);
    const minVal = Math.min(...rates);
    const maxVal = Math.max(...rates);
    const range = Math.max(1, maxVal - minVal);

    const pts = series.map((item, idx) => {
      const x = (idx / (series.length - 1)) * width;
      const y = padTop + usableH - ((item.rate - minVal) / range) * usableH;
      return {x, y, date: item.date, rate: item.rate};
    });

    const linePath = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');

    const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;
    const lastY = pts[pts.length - 1]?.y ?? height / 2;

    return {width, height, linePath, areaPath, points: pts, lastY};
  }, [series]);

  const activePoint =
    hoverIndex !== null && svgGeometry.points[hoverIndex]
      ? svgGeometry.points[hoverIndex]
      : svgGeometry.points[svgGeometry.points.length - 1] || null;

  const formatIdr = (num: number | undefined) => {
    if (num === undefined || num === null) return '—';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <section
      id="section-markets"
      className="h-full rounded-[24px] p-5 border border-white/[0.08] flex flex-col justify-between transition-all duration-300"
      style={{
        background: 'rgba(8, 11, 8, 0.62)',
        backdropFilter: 'blur(26px) saturate(145%)',
        WebkitBackdropFilter: 'blur(26px) saturate(145%)',
        boxShadow:
          '0 22px 54px rgba(0, 0, 0, 0.48), inset 0 1px 0 0 rgba(255, 255, 255, 0.09)',
      }}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B8E66A] shadow-[0_0_8px_#B8E66A] animate-pulse" />
            <h2
              className="text-xs font-semibold tracking-wider text-[#D6D8D0] whitespace-nowrap"
              style={{fontFamily: 'var(--font-syne), sans-serif'}}
            >
              USD / IDR
            </h2>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#38D996]/15 text-[#38D996] border border-[#38D996]/30 font-mono flex items-center gap-0.5">
              <Activity className="w-2.5 h-2.5" />
              LIVE
            </span>
          </div>

          <button
            type="button"
            onClick={() => fetchForex(timeframe)}
            className="text-[#969A91] hover:text-[#B8E66A] transition-colors p-1 rounded-lg cursor-pointer"
            title="Refresh Live Exchange Rate"
            aria-label="Refresh Live Exchange Rate"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-[#B8E66A]' : ''}`} />
          </button>
        </div>

        {/* Current Rate Display */}
        <div className="mb-3">
          {data ? (
            <>
              <div
                className="text-xl font-medium text-[#F4F5F0] tabular-nums tracking-tight"
                style={{fontFamily: 'var(--font-mono), monospace'}}
              >
                Rp {formatIdr(activePoint ? activePoint.rate : data.currentRate)}
              </div>

              <div
                className="flex items-center gap-2 mt-1 text-xs tabular-nums"
                style={{fontFamily: 'var(--font-mono), monospace'}}
              >
                {isPositive24h ? (
                  <span className="inline-flex items-center gap-1 text-[#38D996]">
                    <TrendingUp className="w-3 h-3" />
                    <span>+{formatIdr(Math.abs(data.change24h))}</span>
                    <span>(+{Math.abs(data.changePercent24h).toFixed(2)}%)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[#FF4D57]">
                    <TrendingDown className="w-3 h-3" />
                    <span>-{formatIdr(Math.abs(data.change24h))}</span>
                    <span>(-{Math.abs(data.changePercent24h).toFixed(2)}%)</span>
                  </span>
                )}
                <span className="text-[10px] text-[#6E726A]">24h Live</span>
              </div>
            </>
          ) : (
            <div className="animate-pulse space-y-1.5 py-1">
              <div className="h-6 w-32 bg-white/[0.08] rounded-md" />
              <div className="h-3.5 w-24 bg-white/[0.04] rounded-md" />
            </div>
          )}
        </div>

        {/* High / Low Stats */}
        <div
          className="grid grid-cols-2 gap-2 py-2 px-2.5 mb-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-[11px] tabular-nums"
          style={{fontFamily: 'var(--font-mono), monospace'}}
        >
          <div>
            <div className="text-[10px] text-[#6E726A]">High ({timeframe})</div>
            <div className="text-[#D6D8D0] font-medium">
              {data ? formatIdr(data.high) : '...'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-[#6E726A]">Low ({timeframe})</div>
            <div className="text-[#D6D8D0] font-medium">
              {data ? formatIdr(data.low) : '...'}
            </div>
          </div>
        </div>

        {/* Interactive SVG Chart */}
        <div className="relative rounded-xl bg-[#050706]/65 border border-white/[0.06] p-2 overflow-hidden">
          <div
            className="flex items-center justify-between text-[10px] text-[#969A91] mb-1 tabular-nums"
            style={{fontFamily: 'var(--font-mono), monospace'}}
          >
            <span>{activePoint ? activePoint.date : timeframe}</span>
            <span style={{color: chartColor}}>
              {activePoint ? `Rp ${formatIdr(activePoint.rate)}` : ''}
            </span>
          </div>

          <div
            className="relative w-full h-[118px] select-none"
            onMouseLeave={() => setHoverIndex(null)}
          >
            {series.length >= 2 ? (
              <svg
                viewBox={`0 0 ${svgGeometry.width} ${svgGeometry.height}`}
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id={`forexGrad-${timeframe}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColor} stopOpacity="0.24" />
                    <stop offset="85%" stopColor={chartColor} stopOpacity="0.02" />
                    <stop offset="100%" stopColor={chartColor} stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Area Gradient */}
                <path d={svgGeometry.areaPath} fill={`url(#forexGrad-${timeframe})`} />

                {/* Trend Line */}
                <path
                  d={svgGeometry.linePath}
                  fill="none"
                  stroke={chartColor}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Last point ping */}
                {svgGeometry.points.length > 0 && (
                  <circle
                    cx={svgGeometry.points[svgGeometry.points.length - 1].x}
                    cy={svgGeometry.points[svgGeometry.points.length - 1].y}
                    r="2.8"
                    fill={chartColor}
                    className="animate-pulse"
                  />
                )}

                {/* Active Hover Marker */}
                {activePoint && (
                  <>
                    <line
                      x1={activePoint.x}
                      y1={6}
                      x2={activePoint.x}
                      y2={svgGeometry.height - 4}
                      stroke="rgba(255,255,255,0.16)"
                      strokeDasharray="2 2"
                      strokeWidth="1"
                    />
                    <circle
                      cx={activePoint.x}
                      cy={activePoint.y}
                      r="3.2"
                      fill={chartColor}
                      stroke="#050706"
                      strokeWidth="1.5"
                    />
                  </>
                )}
              </svg>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-[#6E726A] animate-pulse">
                Loading live chart data...
              </div>
            )}

            <div className="absolute inset-0 flex">
              {svgGeometry.points.map((pt, idx) => (
                <div
                  key={pt.date + idx}
                  onMouseEnter={() => setHoverIndex(idx)}
                  className="flex-1 h-full cursor-crosshair"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Timeframe Selector */}
      <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-1">
        {TIMEFRAMES.map((tf) => {
          const isActive = timeframe === tf;
          return (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`flex-1 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer tabular-nums whitespace-nowrap ${
                isActive
                  ? 'bg-[#B8E66A]/18 text-[#B8E66A] border border-[#B8E66A]/35 shadow-[0_0_12px_rgba(184,230,106,0.12)]'
                  : 'text-[#969A91] hover:text-[#F4F5F0] hover:bg-white/[0.05] border border-transparent'
              }`}
              style={{fontFamily: 'var(--font-mono), monospace'}}
            >
              {tf}
            </button>
          );
        })}
      </div>
    </section>
  );
}
