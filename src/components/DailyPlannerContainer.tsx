'use client';

import React, {useState, useMemo, useEffect} from 'react';
import {AnimatePresence, motion} from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  BarChart3,
  ArrowLeft,
  Check,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  RoutineStoreByDate,
  RoutineTask,
  formatDateKey,
  getWeekDatesForDate,
  buildDefaultTasksForDayIndex,
} from '@/lib/lumilist-store';

interface DailyPlannerContainerProps {
  routineStore: RoutineStoreByDate;
  onUpdateTasksForDate: (dateKey: string, tasks: RoutineTask[]) => void;
}

const WEEKDAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAY_FULL = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export default function DailyPlannerContainer({
  routineStore,
  onUpdateTasksForDate,
}: DailyPlannerContainerProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [viewMonthDate, setViewMonthDate] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [isWeeklyProgressMode, setIsWeeklyProgressMode] = useState(false);

  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('08:00');
  const [newTaskCategory, setNewTaskCategory] = useState('Personal');

  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => formatDateKey(today), [today]);
  const selectedDateKey = useMemo(() => formatDateKey(selectedDate), [selectedDate]);

  const currentTasks: RoutineTask[] = useMemo(() => {
    if (routineStore[selectedDateKey]) {
      return routineStore[selectedDateKey];
    }
    return buildDefaultTasksForDayIndex(selectedDateKey, []);
  }, [routineStore, selectedDateKey]);

  const completedCount = currentTasks.filter((t) => t.completed).length;
  const totalCount = currentTasks.length;
  const completionPct =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleToggleTask = (taskId: string) => {
    const updated = currentTasks.map((t) =>
      t.id === taskId ? {...t, completed: !t.completed} : t
    );
    onUpdateTasksForDate(selectedDateKey, updated);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTaskTitle.trim();
    if (!trimmed) return;
    const newTask: RoutineTask = {
      id: `${selectedDateKey}-${Date.now()}`,
      title: trimmed,
      time: newTaskTime || '09:00',
      category: newTaskCategory.trim() || 'Personal',
      completed: false,
    };
    const updated = [...currentTasks, newTask].sort((a, b) =>
      (a.time || '').localeCompare(b.time || '')
    );
    onUpdateTasksForDate(selectedDateKey, updated);
    setNewTaskTitle('');
    setIsAddingTask(false);
  };

  const handleDeleteTask = (taskId: string) => {
    const updated = currentTasks.filter((t) => t.id !== taskId);
    onUpdateTasksForDate(selectedDateKey, updated);
  };

  const calendarDays = useMemo(() => {
    const year = viewMonthDate.getFullYear();
    const month = viewMonthDate.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: Array<{date: Date | null; key: string}> = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({date: null, key: `empty-start-${i}`});
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      cells.push({date: d, key: formatDateKey(d)});
    }
    return cells;
  }, [viewMonthDate]);

  const monthTitle = viewMonthDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const selectedDateReadable = selectedDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const weeklyStats = useMemo(() => {
    const weekDates = getWeekDatesForDate(selectedDate);
    const daysData = weekDates.map((d, idx) => {
      const key = formatDateKey(d);
      const tasks = routineStore[key] || buildDefaultTasksForDayIndex(key, []);
      const done = tasks.filter((t) => t.completed).length;
      const total = tasks.length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      return {
        index: idx,
        shortLabel: WEEKDAY_SHORT[idx],
        fullLabel: WEEKDAY_FULL[idx],
        dateKey: key,
        shortDate: d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'}),
        completed: done,
        total,
        pct,
      };
    });

    const sumPct = daysData.reduce((acc, item) => acc + item.pct, 0);
    const averagePct = Math.round(sumPct / 7);

    let highest = daysData[0];
    let lowest = daysData[0];
    daysData.forEach((item) => {
      if (item.pct > highest.pct) highest = item;
      if (item.pct < lowest.pct) lowest = item;
    });

    return {
      daysData,
      averagePct,
      highest,
      lowest,
    };
  }, [selectedDate, routineStore]);

  const weeklyChartSvg = useMemo(() => {
    const width = 540;
    const height = 165;
    const padLeft = 36;
    const padRight = 18;
    const padTop = 14;
    const padBottom = 26;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const pts = weeklyStats.daysData.map((d, i) => {
      const x = padLeft + (i / 6) * plotW;
      const y = padTop + plotH - (d.pct / 100) * plotH;
      return {...d, x, y};
    });

    let linePath = '';
    pts.forEach((pt, idx) => {
      if (idx === 0) {
        linePath += `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
      } else {
        const prev = pts[idx - 1];
        const cx1 = prev.x + (pt.x - prev.x) * 0.45;
        const cy1 = prev.y;
        const cx2 = prev.x + (pt.x - prev.x) * 0.55;
        const cy2 = pt.y;
        linePath += ` C ${cx1.toFixed(1)} ${cy1.toFixed(1)}, ${cx2.toFixed(1)} ${cy2.toFixed(
          1
        )}, ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
      }
    });

    const baselineY = padTop + plotH;
    const areaPath = `${linePath} L ${pts[pts.length - 1].x.toFixed(
      1
    )} ${baselineY} L ${pts[0].x.toFixed(1)} ${baselineY} Z`;

    return {
      width,
      height,
      padLeft,
      padRight,
      padTop,
      plotW,
      plotH,
      baselineY,
      pts,
      linePath,
      areaPath,
    };
  }, [weeklyStats]);

  return (
    <section
      id="section-planner"
      className="h-full rounded-[24px] p-5 sm:p-6 border border-white/[0.08] flex flex-col justify-between transition-all duration-300 overflow-hidden"
      style={{
        background: 'rgba(8, 11, 8, 0.60)',
        backdropFilter: 'blur(26px) saturate(145%)',
        WebkitBackdropFilter: 'blur(26px) saturate(145%)',
        boxShadow:
          '0 22px 54px rgba(0, 0, 0, 0.48), inset 0 1px 0 0 rgba(255, 255, 255, 0.09)',
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {!isWeeklyProgressMode ? (
          <motion.div
            key="planner-split-view"
            initial={{opacity: 0, y: 6}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: -6}}
            transition={{duration: 0.22, ease: [0.16, 1, 0.3, 1]}}
            className="flex flex-col h-full justify-between"
          >
            <div className="flex items-center justify-between gap-2 pb-3.5 mb-4 border-b border-white/[0.07]">
              <div className="flex items-baseline gap-2.5">
                <h2
                  className="text-sm font-semibold tracking-tight text-[#F4F5F0]"
                  style={{fontFamily: 'var(--font-syne), sans-serif'}}
                >
                  Daily Planner
                </h2>
                <span className="text-xs text-[#969A91]">·</span>
                <span className="text-xs text-[#B8E66A] font-medium">
                  {selectedDateReadable}
                </span>
              </div>

              <div
                className="text-xs text-[#969A91] tabular-nums"
                style={{fontFamily: 'var(--font-mono), monospace'}}
              >
                {completedCount} / {totalCount} completed ·{' '}
                <span className="text-[#B8E66A]">{completionPct}%</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start flex-1">
              {/* LEFT: CALENDAR */}
              <div className="md:col-span-5 md:pr-4 md:border-r border-white/[0.07]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-[#F4F5F0]">
                    {monthTitle}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setViewMonthDate(
                          new Date(
                            viewMonthDate.getFullYear(),
                            viewMonthDate.getMonth() - 1,
                            1
                          )
                        )
                      }
                      className="p-1 rounded-lg text-[#969A91] hover:text-[#F4F5F0] hover:bg-white/[0.06] transition-colors cursor-pointer"
                      title="Previous Month"
                      aria-label="Previous Month"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate(today);
                        setViewMonthDate(
                          new Date(today.getFullYear(), today.getMonth(), 1)
                        );
                      }}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium text-[#D6D8D0] hover:text-[#B8E66A] bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
                    >
                      Today
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setViewMonthDate(
                          new Date(
                            viewMonthDate.getFullYear(),
                            viewMonthDate.getMonth() + 1,
                            1
                          )
                        )
                      }
                      className="p-1 rounded-lg text-[#969A91] hover:text-[#F4F5F0] hover:bg-white/[0.06] transition-colors cursor-pointer"
                      title="Next Month"
                      aria-label="Next Month"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                  {WEEKDAY_HEADERS.map((d, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-medium text-[#6E726A] py-0.5"
                    >
                      {d}
                    </span>
                  ))}
                </div>

                <div
                  className="grid grid-cols-7 gap-1 text-center tabular-nums"
                  style={{fontFamily: 'var(--font-mono), monospace'}}
                >
                  {calendarDays.map((cell) => {
                    if (!cell.date) {
                      return <div key={cell.key} className="h-7" />;
                    }
                    const isSelected = cell.key === selectedDateKey;
                    const isToday = cell.key === todayKey;
                    const dayTasks = routineStore[cell.key];
                    const hasCompleted =
                      dayTasks && dayTasks.some((t) => t.completed);

                    return (
                      <button
                        key={cell.key}
                        type="button"
                        onClick={() => setSelectedDate(cell.date!)}
                        className={`relative h-7 rounded-lg text-[11px] flex flex-col items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#B8E66A]/22 text-[#B8E66A] border border-[#B8E66A]/45 font-semibold shadow-[0_0_14px_rgba(184,230,106,0.16)]'
                            : isToday
                            ? 'bg-white/[0.07] text-[#F4F5F0] border border-white/[0.15]'
                            : 'text-[#D6D8D0] hover:bg-white/[0.05] hover:text-[#F4F5F0]'
                        }`}
                      >
                        <span>{cell.date.getDate()}</span>
                        {hasCompleted && !isSelected && (
                          <span className="w-1 h-1 rounded-full bg-[#B8E66A]/70 absolute bottom-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-[#969A91]">
                  <span>Selected Date</span>
                  <span
                    className="text-[#D6D8D0] tabular-nums"
                    style={{fontFamily: 'var(--font-mono), monospace'}}
                  >
                    {selectedDateKey}
                  </span>
                </div>
              </div>

              {/* RIGHT: DAILY ROUTINE */}
              <div className="md:col-span-7 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-semibold tracking-wider text-[#D6D8D0] uppercase">
                        Daily Routine
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsAddingTask((prev) => !prev)}
                        className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] text-[#969A91] hover:text-[#B8E66A] bg-white/[0.03] hover:bg-white/[0.07] transition-colors cursor-pointer"
                        title="Add routine item for this date"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsWeeklyProgressMode(true)}
                      title="Weekly Progress"
                      aria-label="Weekly Progress"
                      className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-[#B8E66A]/18 text-[#D6D8D0] hover:text-[#B8E66A] border border-white/[0.08] hover:border-[#B8E66A]/35 transition-all cursor-pointer shadow-sm"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {isAddingTask && (
                    <form
                      onSubmit={handleAddTask}
                      className="mb-2.5 p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-wrap sm:flex-nowrap items-center gap-1.5 text-xs"
                    >
                      <input
                        type="time"
                        value={newTaskTime}
                        onChange={(e) => setNewTaskTime(e.target.value)}
                        className="px-2 py-1 rounded-lg bg-[#050706]/70 border border-white/[0.08] text-[#D6D8D0] text-[11px] focus:outline-none focus:border-[#B8E66A]/40"
                        style={{fontFamily: 'var(--font-mono), monospace'}}
                      />
                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Routine task name..."
                        className="flex-1 min-w-[120px] px-2.5 py-1 rounded-lg bg-[#050706]/70 border border-white/[0.08] text-[#F4F5F0] placeholder-[#6E726A] text-xs focus:outline-none focus:border-[#B8E66A]/40"
                      />
                      <input
                        type="text"
                        value={newTaskCategory}
                        onChange={(e) => setNewTaskCategory(e.target.value)}
                        placeholder="Category"
                        className="w-20 px-2 py-1 rounded-lg bg-[#050706]/70 border border-white/[0.08] text-[#D6D8D0] placeholder-[#6E726A] text-[11px] focus:outline-none focus:border-[#B8E66A]/40"
                      />
                      <button
                        type="submit"
                        className="px-2.5 py-1 rounded-lg bg-[#B8E66A]/20 text-[#B8E66A] border border-[#B8E66A]/35 hover:bg-[#B8E66A]/30 text-xs font-medium cursor-pointer whitespace-nowrap"
                      >
                        Save
                      </button>
                    </form>
                  )}

                  <div className="space-y-1.5 max-h-[195px] overflow-y-auto pr-1">
                    {currentTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => handleToggleTask(task.id)}
                        className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-xl border transition-all cursor-pointer ${
                          task.completed
                            ? 'bg-[#B8E66A]/[0.07] border-[#B8E66A]/20 text-[#D6D8D0]'
                            : 'bg-white/[0.025] hover:bg-white/[0.05] border-white/[0.05] text-[#F4F5F0]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="text-[11px] text-[#969A91] tabular-nums shrink-0"
                            style={{fontFamily: 'var(--font-mono), monospace'}}
                          >
                            {task.time}
                          </span>

                          <span
                            className={`w-4 h-4 rounded-md flex items-center justify-center transition-all shrink-0 ${
                              task.completed
                                ? 'bg-[#B8E66A] text-[#050706]'
                                : 'border border-white/25 group-hover:border-[#B8E66A]/60 bg-transparent'
                            }`}
                          >
                            {task.completed && <Check className="w-3 h-3 stroke-[2.5]" />}
                          </span>

                          <span
                            className={`text-xs truncate transition-colors ${
                              task.completed
                                ? 'line-through text-[#969A91]'
                                : 'text-[#F4F5F0] font-medium'
                            }`}
                          >
                            {task.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {task.category && (
                            <span className="text-[11px] text-[#6E726A] hidden sm:inline">
                              {task.category}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTask(task.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-[#6E726A] hover:text-[#FF4D57] transition-opacity p-0.5 cursor-pointer"
                            title="Remove routine item"
                            aria-label="Remove routine item"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs">
                  <div
                    className="flex items-center gap-2 text-[#D6D8D0] tabular-nums"
                    style={{fontFamily: 'var(--font-mono), monospace'}}
                  >
                    <span>
                      {completedCount} / {totalCount} completed
                    </span>
                    <span className="text-[#6E726A]">·</span>
                    <span className="text-[#B8E66A] font-medium">{completionPct}%</span>
                  </div>

                  <div className="w-24 h-1 rounded-full bg-white/[0.07] overflow-hidden">
                    <div
                      className="h-full bg-[#B8E66A] transition-all duration-300"
                      style={{width: `${completionPct}%`}}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="planner-weekly-graph"
            initial={{opacity: 0, y: 6}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: -6}}
            transition={{duration: 0.22, ease: [0.16, 1, 0.3, 1]}}
            className="flex flex-col h-full justify-between"
          >
            {/* Header with Title, Live Hover Inspector, & Back Button */}
            <div className="flex items-center justify-between gap-2 pb-3 mb-2.5 border-b border-white/[0.07]">
              <div className="flex items-center gap-3">
                <div>
                  <h2
                    className="text-sm font-semibold tracking-tight text-[#F4F5F0]"
                    style={{fontFamily: 'var(--font-syne), sans-serif'}}
                  >
                    Weekly Routine Progress
                  </h2>
                  <p className="text-[11px] text-[#969A91]">
                    Week of {weeklyStats.daysData[0]?.shortDate} –{' '}
                    {weeklyStats.daysData[6]?.shortDate}
                  </p>
                </div>

                {/* Live Hover/Selected Day Readout Badge */}
                {hoveredDayIndex !== null && weeklyStats.daysData[hoveredDayIndex] && (
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#B8E66A]/10 border border-[#B8E66A]/25 text-xs text-[#B8E66A] tabular-nums">
                    <span className="font-medium">
                      {weeklyStats.daysData[hoveredDayIndex].fullLabel}:
                    </span>
                    <span>
                      {weeklyStats.daysData[hoveredDayIndex].completed}/
                      {weeklyStats.daysData[hoveredDayIndex].total} completed
                    </span>
                    <span>({weeklyStats.daysData[hoveredDayIndex].pct}%)</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsWeeklyProgressMode(false)}
                title="Back to Calendar & Daily Routine"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-[#B8E66A]/18 text-xs font-medium text-[#D6D8D0] hover:text-[#B8E66A] border border-white/[0.08] hover:border-[#B8E66A]/35 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            </div>

            {/* Financial Terminal Styled Weekly Routine SVG Chart (Option B) */}
            <div
              className="relative rounded-2xl bg-[#050706]/75 border border-white/[0.07] p-3 mb-2.5 shadow-inner"
              onMouseLeave={() => setHoveredDayIndex(null)}
            >
              <svg
                viewBox={`0 0 ${weeklyChartSvg.width} ${weeklyChartSvg.height}`}
                className="w-full h-[155px] overflow-visible"
              >
                <defs>
                  <linearGradient id="weeklyProgressGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#B8E66A" stopOpacity="0.32" />
                    <stop offset="80%" stopColor="#8EBB4D" stopOpacity="0.04" />
                    <stop offset="100%" stopColor="#8EBB4D" stopOpacity="0.0" />
                  </linearGradient>
                  <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#B8E66A" floodOpacity="0.45" />
                  </filter>
                </defs>

                {/* Y-Axis Horizontal Grid Lines & Percentage Marks */}
                {[0, 20, 40, 60, 80, 100].map((pctVal) => {
                  const y =
                    weeklyChartSvg.padTop +
                    weeklyChartSvg.plotH -
                    (pctVal / 100) * weeklyChartSvg.plotH;
                  return (
                    <g key={pctVal}>
                      <line
                        x1={weeklyChartSvg.padLeft}
                        y1={y}
                        x2={weeklyChartSvg.width - weeklyChartSvg.padRight}
                        y2={y}
                        stroke="rgba(255,255,255,0.06)"
                        strokeDasharray={pctVal === 0 ? undefined : '2 3'}
                        strokeWidth="1"
                      />
                      <text
                        x={weeklyChartSvg.padLeft - 8}
                        y={y + 3}
                        textAnchor="end"
                        fill="#6E726A"
                        fontSize="9"
                        style={{fontFamily: 'var(--font-mono), monospace'}}
                      >
                        {pctVal}%
                      </text>
                    </g>
                  );
                })}

                {/* Average Threshold Line */}
                <line
                  x1={weeklyChartSvg.padLeft}
                  y1={
                    weeklyChartSvg.padTop +
                    weeklyChartSvg.plotH -
                    (weeklyStats.averagePct / 100) * weeklyChartSvg.plotH
                  }
                  x2={weeklyChartSvg.width - weeklyChartSvg.padRight}
                  y2={
                    weeklyChartSvg.padTop +
                    weeklyChartSvg.plotH -
                    (weeklyStats.averagePct / 100) * weeklyChartSvg.plotH
                  }
                  stroke="#B8E66A"
                  strokeOpacity="0.25"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />

                {/* Shaded Area Under Line */}
                <path d={weeklyChartSvg.areaPath} fill="url(#weeklyProgressGrad)" />

                {/* Primary Glowing Line */}
                <path
                  d={weeklyChartSvg.linePath}
                  fill="none"
                  stroke="#B8E66A"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  filter="url(#lineGlow)"
                />

                {/* Interactive Day Nodes, Vertical Guides, & Values */}
                {weeklyChartSvg.pts.map((pt, idx) => {
                  const isHovered = hoveredDayIndex === idx;
                  const isSelectedDay = pt.dateKey === selectedDateKey;
                  return (
                    <g
                      key={pt.dateKey}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredDayIndex(idx)}
                      onClick={() => {
                        const [y, m, d] = pt.dateKey.split('-').map(Number);
                        setSelectedDate(new Date(y, m - 1, d));
                      }}
                    >
                      {/* Vertical Crosshair Line */}
                      {isHovered && (
                        <line
                          x1={pt.x}
                          y1={weeklyChartSvg.padTop}
                          x2={pt.x}
                          y2={weeklyChartSvg.baselineY}
                          stroke="#B8E66A"
                          strokeOpacity="0.45"
                          strokeDasharray="2 2"
                          strokeWidth="1.2"
                        />
                      )}

                      {/* Halo ring on hover/selected */}
                      {(isHovered || isSelectedDay) && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="8"
                          fill="rgba(184, 230, 106, 0.18)"
                        />
                      )}

                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered || isSelectedDay ? 4.5 : 3}
                        fill={isHovered || isSelectedDay ? '#B8E66A' : '#080B08'}
                        stroke="#B8E66A"
                        strokeWidth="2"
                      />

                      {/* Floating Percentage Indicator */}
                      <text
                        x={pt.x}
                        y={Math.max(10, pt.y - 7)}
                        textAnchor="middle"
                        fill={isHovered || isSelectedDay ? '#B8E66A' : '#969A91'}
                        fontSize={isHovered || isSelectedDay ? '10' : '8.5'}
                        fontWeight={isHovered || isSelectedDay ? '600' : '400'}
                        style={{fontFamily: 'var(--font-mono), monospace'}}
                      >
                        {pt.pct}%
                      </text>

                      {/* X-Axis Day Label */}
                      <text
                        x={pt.x}
                        y={weeklyChartSvg.height - 6}
                        textAnchor="middle"
                        fill={isSelectedDay ? '#B8E66A' : isHovered ? '#F4F5F0' : '#969A91'}
                        fontSize="10"
                        fontWeight={isSelectedDay || isHovered ? '600' : '400'}
                        style={{fontFamily: 'var(--font-mono), monospace'}}
                      >
                        {pt.shortLabel}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Daily Breakdown Cards (Mon–Sun) */}
            <div className="grid grid-cols-7 gap-1.5 mb-2.5">
              {weeklyStats.daysData.map((d, idx) => {
                const isSelected = d.dateKey === selectedDateKey;
                const isHovered = hoveredDayIndex === idx;
                return (
                  <button
                    key={d.dateKey}
                    type="button"
                    onMouseEnter={() => setHoveredDayIndex(idx)}
                    onMouseLeave={() => setHoveredDayIndex(null)}
                    onClick={() => {
                      const [y, m, day] = d.dateKey.split('-').map(Number);
                      setSelectedDate(new Date(y, m - 1, day));
                    }}
                    className={`p-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#B8E66A]/18 border-[#B8E66A]/40 text-[#B8E66A] shadow-[0_0_12px_rgba(184,230,106,0.12)]'
                        : isHovered
                        ? 'bg-white/[0.06] border-white/[0.12] text-[#F4F5F0]'
                        : 'bg-white/[0.025] border-white/[0.05] text-[#969A91]'
                    }`}
                  >
                    <div className="text-[10px] font-medium">{d.shortLabel}</div>
                    <div
                      className="text-xs font-semibold tabular-nums mt-0.5"
                      style={{fontFamily: 'var(--font-mono), monospace'}}
                    >
                      {d.pct}%
                    </div>
                    <div className="w-full h-1 rounded-full bg-white/[0.08] mt-1 overflow-hidden">
                      <div
                        className="h-full bg-[#B8E66A] rounded-full transition-all"
                        style={{width: `${d.pct}%`}}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Weekly Summary Statistics Bar */}
            <div
              className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs tabular-nums"
              style={{fontFamily: 'var(--font-mono), monospace'}}
            >
              <div className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
                <span className="text-[#969A91] text-[11px]">Weekly Average</span>
                <span className="text-[#B8E66A] font-semibold">
                  {weeklyStats.averagePct}%
                </span>
              </div>

              <div className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
                <span className="text-[#969A91] text-[11px]">Highest Day</span>
                <span className="text-[#F4F5F0]">
                  {weeklyStats.highest.shortLabel} ·{' '}
                  <span className="text-[#38D996] font-medium">{weeklyStats.highest.pct}%</span>
                </span>
              </div>

              <div className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
                <span className="text-[#969A91] text-[11px]">Lowest Day</span>
                <span className="text-[#F4F5F0]">
                  {weeklyStats.lowest.shortLabel} ·{' '}
                  <span className="text-[#D6D8D0]">{weeklyStats.lowest.pct}%</span>
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
