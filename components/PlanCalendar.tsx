import React, { useState, useEffect } from 'react';
import { LearningPlan, DayPlan } from '../types';
import { Icons } from './Icons';

interface PlanCalendarProps {
  plan: LearningPlan;
  selectedDay: DayPlan | null;
  onSelectDay: (day: DayPlan) => void;
}

export const PlanCalendar: React.FC<PlanCalendarProps> = ({ plan, selectedDay, onSelectDay }) => {
  
  // Calculate date helpers
  const startDate = new Date(plan.startDate);
  // Ensure we work with clean dates
  startDate.setHours(0,0,0,0);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // State for the currently viewed month
  const [viewDate, setViewDate] = useState(() => {
    // Default to showing the month of the selected day, or today, or start date
    if (selectedDay) {
       const d = new Date(startDate);
       d.setDate(d.getDate() + (selectedDay.dayNumber - 1));
       d.setDate(1); // First of month
       return d;
    }
    // Check if today is within plan range
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.durationDays);
    
    if (today >= startDate && today <= endDate) {
        const d = new Date(today);
        d.setDate(1);
        return d;
    }
    
    const d = new Date(startDate);
    d.setDate(1);
    return d;
  });

  // Update view when plan changes or selectedDay changes (optional, but good UX to jump to selection)
  useEffect(() => {
    if (selectedDay) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + (selectedDay.dayNumber - 1));
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        
        setViewDate(prev => {
            if (prev.getTime() !== monthStart.getTime()) return monthStart;
            return prev;
        });
    }
  }, [selectedDay, plan.id, plan.startDate]);

  const getDayDate = (dayNumber: number) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + (dayNumber - 1));
    return date;
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const getStatusColor = (day: DayPlan, date: Date, isSelected: boolean) => {
    const allCompleted = day.tasks.length > 0 && day.tasks.every(t => t.isCompleted);
    const isPast = date < today;
    const isToday = isSameDay(date, today);

    // If selected, we override the base border color logic in the render, 
    // but the background should still reflect status
    
    if (allCompleted) return 'bg-emerald-50 text-emerald-900';
    if (isPast && !allCompleted) return 'bg-red-50 text-red-900'; 
    if (isToday) return 'bg-white text-indigo-900'; // Today special handling handled below usually
    
    // Future / Default
    return 'bg-white text-gray-700';
  };
  
  const getBorderClass = (day: DayPlan, date: Date, isSelected: boolean) => {
    const allCompleted = day.tasks.length > 0 && day.tasks.every(t => t.isCompleted);
    const isPast = date < today;
    const isToday = isSameDay(date, today);

    if (isSelected) return 'border-2 border-indigo-600 ring-4 ring-indigo-50 shadow-md transform scale-[1.02] z-10';
    
    if (isToday) return 'border-2 border-indigo-300 ring-2 ring-indigo-50';
    if (allCompleted) return 'border border-emerald-200 hover:border-emerald-400';
    if (isPast) return 'border border-red-200 hover:border-red-300';
    
    return 'border border-gray-200 hover:border-indigo-300';
  }

  const formatShortDuration = (ms: number) => {
      const mins = Math.floor(ms / (1000 * 60));
      if (mins < 60) return `${mins}m`;
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}h ${remainingMins}m`;
  }

  // Pagination Logic
  const nextMonth = () => {
      const next = new Date(viewDate);
      next.setMonth(next.getMonth() + 1);
      setViewDate(next);
  };

  const prevMonth = () => {
      const prev = new Date(viewDate);
      prev.setMonth(prev.getMonth() - 1);
      setViewDate(prev);
  };

  // Filter days for current view
  const currentDays = plan.days.filter(day => {
      const date = getDayDate(day.dayNumber);
      return date.getMonth() === viewDate.getMonth() && date.getFullYear() === viewDate.getFullYear();
  });

  // Calculate plan bounds to disable buttons
  const planEndDate = new Date(startDate);
  planEndDate.setDate(planEndDate.getDate() + plan.durationDays - 1);
  const planEndMonth = new Date(planEndDate.getFullYear(), planEndDate.getMonth(), 1);
  const planStartMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  const canGoPrev = viewDate > planStartMonth;
  const canGoNext = viewDate < planEndMonth;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{plan.topic}</h2>
          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
            <span className="flex items-center gap-1"><Icons.Calendar size={14} /> {plan.durationDays} Days</span>
            <span className="flex items-center gap-1"><Icons.Clock size={14} /> {plan.dailyTime}/day</span>
          </div>
        </div>
        
        {/* Pagination Controls */}
        <div className="flex items-center gap-4 bg-gray-50 rounded-lg p-1 border border-gray-100">
            <button 
                onClick={prevMonth} 
                disabled={!canGoPrev}
                className={`p-1.5 rounded-md transition-all ${!canGoPrev ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-white hover:shadow-sm'}`}
            >
                <Icons.ChevronLeft size={20} />
            </button>
            <span className="text-sm font-semibold text-gray-700 min-w-[100px] text-center">
                {viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </span>
            <button 
                onClick={nextMonth} 
                disabled={!canGoNext}
                className={`p-1.5 rounded-md transition-all ${!canGoNext ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-white hover:shadow-sm'}`}
            >
                <Icons.ChevronRight size={20} />
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-2">
        {currentDays.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {currentDays.map((day) => {
                const date = getDayDate(day.dayNumber);
                const isSelected = selectedDay?.dayNumber === day.dayNumber;
                
                const bgClass = getStatusColor(day, date, isSelected);
                const borderClass = getBorderClass(day, date, isSelected);
                
                const completedCount = day.tasks.filter(t => t.isCompleted).length;
                const totalTasks = day.tasks.length;
                
                // Calculate time
                const sessions = day.sessions || [];
                const totalTimeMs = sessions.reduce((acc, s) => acc + ((s.end || Date.now()) - s.start), 0);
                const showTime = totalTimeMs > 60000; // Only show if > 1 min

                return (
                <button
                    key={day.dayNumber}
                    onClick={() => onSelectDay(day)}
                    className={`
                    relative flex flex-col items-start p-3 rounded-xl text-left transition-all duration-200
                    ${bgClass} ${borderClass}
                    `}
                >
                    <div className="flex justify-between w-full items-start mb-2">
                        <span className="text-xs font-bold uppercase opacity-60">
                            Day {day.dayNumber}
                        </span>
                        {completedCount === totalTasks && totalTasks > 0 && (
                            <Icons.CheckCircle size={16} className="text-emerald-600" />
                        )}
                        {showTime && (
                             <span className="text-[10px] font-medium bg-gray-900/10 px-1.5 py-0.5 rounded text-gray-700 flex items-center gap-0.5">
                                <Icons.Clock size={10} />
                                {formatShortDuration(totalTimeMs)}
                            </span>
                        )}
                    </div>
                    
                    <div className="text-xs opacity-50 mb-1 font-medium">
                        {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                    
                    <h3 className="text-sm font-semibold leading-tight line-clamp-2 mb-3 w-full">
                        {day.title}
                    </h3>

                    <div className="mt-auto w-full">
                        <div className="w-full bg-gray-900/10 rounded-full h-1.5 overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-500 ${completedCount === totalTasks ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                style={{ width: `${(completedCount / totalTasks) * 100}%` }}
                            />
                        </div>
                    </div>
                </button>
                );
            })}
            </div>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Icons.Calendar size={48} className="mb-4 opacity-20" />
                <p>No tasks scheduled for this month.</p>
            </div>
        )}
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-100 flex gap-4 text-xs text-gray-500 justify-end">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-emerald-50 border border-emerald-200 rounded"></div> Completed
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div> Missed
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 border-2 border-indigo-300 rounded"></div> Today
        </div>
      </div>
    </div>
  );
};