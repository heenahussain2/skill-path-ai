import React, { useState, useEffect } from 'react';
import { DayPlan, LearningPlan, Task, Resource } from '../types';
import { Icons } from './Icons';
import { QuizModal } from './QuizModal';

interface PlanDetailProps {
  day: DayPlan | null;
  plan: LearningPlan;
  isVisible: boolean;
  onClose: () => void;
  onToggleTask: (dayNumber: number, taskId: string) => void;
  onUpdateNotes: (dayNumber: number, notes: string) => void;
  onToggleSession: (dayNumber: number) => void;
}

const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  
  const lines = text.split('\n');
  
  return (
    <div className="text-sm text-gray-600 space-y-1.5 leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        
        // Headers (###)
        if (trimmed.startsWith('### ')) {
            return <h4 key={i} className="font-bold text-gray-800 mt-4 mb-2 text-base">{trimmed.replace('### ', '')}</h4>
        }
        if (trimmed.startsWith('## ')) {
            return <h3 key={i} className="font-bold text-gray-800 mt-5 mb-2 text-lg">{trimmed.replace('## ', '')}</h3>
        }
        
        // Bold formatting (**text**)
        const renderBold = (str: string) => {
            const parts = str.split(/(\*\*.*?\*\*)/g);
            return parts.map((part, idx) => {
                 if (part.startsWith('**') && part.endsWith('**')) {
                     return <strong key={idx} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
                 }
                 return <span key={idx}>{part}</span>;
            });
        };

        // Lists
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return (
                <div key={i} className="flex gap-2 pl-2 items-start">
                    <span className="text-indigo-500 font-bold mt-1.5 text-[6px]">•</span>
                    <span>{renderBold(trimmed.substring(2))}</span>
                </div>
            );
        }
        
        // Numbered lists
        if (/^\d+\.\s/.test(trimmed)) {
            const match = trimmed.match(/^(\d+)\.\s(.*)/);
            if (match) {
                 return (
                    <div key={i} className="flex gap-2 pl-2 items-start">
                        <span className="text-indigo-500 font-semibold min-w-[16px]">{match[1]}.</span>
                        <span>{renderBold(match[2])}</span>
                    </div>
                );
            }
        }

        // Empty lines
        if (!trimmed) return <div key={i} className="h-2"></div>;

        // Paragraphs
        return <p key={i} className="mb-1">{renderBold(line)}</p>;
      })}
    </div>
  );
};

const TaskItem: React.FC<{ 
  task: Task, 
  onToggle: (id: string) => void 
}> = ({ task, onToggle }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasResources = task.resources && task.resources.length > 0;

  return (
    <div className={`
      mb-2 rounded-lg border transition-all overflow-hidden
      ${task.isCompleted ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200'}
    `}>
      <div 
        className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50/50"
        onClick={() => hasResources ? setIsExpanded(!isExpanded) : onToggle(task.id)}
      >
         <div 
          onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
          className="mt-1"
        >
          <div className={`
             w-4 h-4 rounded border flex items-center justify-center transition-colors
             ${task.isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 bg-white hover:border-indigo-400'}
          `}>
             {task.isCompleted && <Icons.CheckCircle size={12} className="text-white" />}
          </div>
        </div>

        <div className="flex-1">
          <span className={`text-sm ${task.isCompleted ? 'text-emerald-800 line-through opacity-70' : 'text-gray-700'}`}>
              {task.text}
          </span>
        </div>

        {hasResources && (
          <button 
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className="text-gray-400 hover:text-indigo-600 transition-colors"
          >
            {isExpanded ? <Icons.ChevronUp size={16} /> : <Icons.ChevronDown size={16} />}
          </button>
        )}
      </div>

      {isExpanded && hasResources && (
        <div className="bg-gray-50/80 px-4 pb-3 pt-0 border-t border-gray-100/50">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-2 flex items-center gap-1">
             <Icons.BookOpen size={10} /> Suggested Resources
          </div>
          <div className="space-y-2">
            {task.resources?.map((res, idx) => (
              <a 
                key={idx}
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 rounded-md bg-white border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all group"
              >
                <div className="text-indigo-500">
                  {res.type === 'video' ? <Icons.Video size={14} /> : 
                   res.type === 'documentation' ? <Icons.FileText size={14} /> : 
                   <Icons.ExternalLink size={14} />}
                </div>
                <span className="text-xs text-gray-700 font-medium truncate flex-1 group-hover:text-indigo-700">
                  {res.title}
                </span>
                <Icons.ExternalLink size={10} className="text-gray-300 group-hover:text-indigo-400" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const PlanDetail: React.FC<PlanDetailProps> = ({ 
  day, 
  plan, 
  isVisible, 
  onClose, 
  onToggleTask,
  onUpdateNotes,
  onToggleSession
}) => {
  const [notesInput, setNotesInput] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [isQuizOpen, setIsQuizOpen] = useState(false);

  // Reset notes when day changes
  useEffect(() => {
      if (day) {
          setNotesInput(day.notes || '');
      }
  }, [day]);

  // Timer logic
  useEffect(() => {
    let interval: any;
    if (day && isVisible) {
        const calculateTotal = () => {
             const sessions = day.sessions || [];
             let total = 0;
             let running = false;
             const now = Date.now();

             sessions.forEach(s => {
                 if (s.end) {
                     total += s.end - s.start;
                 } else {
                     total += now - s.start;
                     running = true;
                 }
             });
             return { total, running };
        };

        setElapsed(calculateTotal().total);

        interval = setInterval(() => {
            const { total } = calculateTotal();
            setElapsed(total);
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [day, isVisible]);

  if (!isVisible) return null;
  
  const handleNotesBlur = () => {
      if (day && notesInput !== day.notes) {
          onUpdateNotes(day.dayNumber, notesInput);
      }
  };

  const isSessionRunning = day?.sessions && day.sessions.length > 0 && day.sessions[day.sessions.length - 1].end === null;

  const formatTime = (ms: number) => {
      const seconds = Math.floor((ms / 1000) % 60);
      const minutes = Math.floor((ms / (1000 * 60)) % 60);
      const hours = Math.floor((ms / (1000 * 60 * 60)));
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
        <div className={`
        fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-30 flex flex-col
        ${isVisible ? 'translate-x-0' : 'translate-x-full'}
        `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white">
            <h2 className="text-lg font-bold text-gray-800">Daily Plan Details</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <Icons.X size={20} />
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
            
            {day ? (
                <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-indigo-600 font-semibold text-sm uppercase tracking-wide">
                            Day {day.dayNumber}
                        </div>
                        <button
                            onClick={() => setIsQuizOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors"
                        >
                            <Icons.BrainCircuit size={14} />
                            Take Quiz
                        </button>
                    </div>
                    
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">{day.title}</h2>
                    
                    {/* Timer Section */}
                    <div className="bg-indigo-900 rounded-xl p-5 text-white mb-8 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Icons.Timer size={80} />
                        </div>
                        <div className="relative z-10">
                            <div className="text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1">Time Spent Today</div>
                            <div className="text-4xl font-mono font-bold mb-4 tracking-wider">
                                {formatTime(elapsed)}
                            </div>
                            <button 
                                onClick={() => onToggleSession(day.dayNumber)}
                                className={`
                                    w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all
                                    ${isSessionRunning 
                                        ? 'bg-red-500 hover:bg-red-600 text-white shadow-md' 
                                        : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md'}
                                `}
                            >
                                {isSessionRunning ? (
                                    <>
                                        <Icons.Square size={16} fill="currentColor" /> Stop Session
                                    </>
                                ) : (
                                    <>
                                        <Icons.Play size={16} fill="currentColor" /> Start Learning
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Tasks Section */}
                    <div className="space-y-3 mb-8">
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                            <Icons.CheckCircle size={18} className="text-indigo-600" />
                            Tasks Checklist
                        </h3>
                        <div className="bg-gray-50 rounded-xl p-2 border border-gray-100">
                            {day.tasks.map((task) => (
                            <TaskItem 
                                key={task.id} 
                                task={task} 
                                onToggle={(id) => onToggleTask(day.dayNumber, id)} 
                            />
                            ))}
                        </div>
                    </div>

                    {/* Description Section */}
                    <div className="mb-8">
                            <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                            <Icons.BookOpen size={18} className="text-indigo-600" />
                            Step-by-Step Guide
                        </h3>
                        <div className="prose prose-sm prose-indigo max-w-none bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <SimpleMarkdown text={day.description} />
                        </div>
                    </div>
                    
                    {/* Notes Section */}
                    <div className="mb-8">
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                            <Icons.MessageSquare size={18} className="text-indigo-600" />
                            My Learning Notes
                        </h3>
                        <textarea
                            value={notesInput}
                            onChange={(e) => setNotesInput(e.target.value)}
                            onBlur={handleNotesBlur}
                            placeholder="Write down your key takeaways, code snippets, or ideas here..."
                            className="w-full h-32 p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-700 placeholder-gray-400 resize-y"
                        />
                        <p className="text-xs text-gray-400 mt-1 text-right">Saved automatically on blur</p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center">
                    <Icons.Calendar size={48} className="mb-4 opacity-20" />
                    <p>Select a day from the calendar to view details.</p>
                </div>
            )}
        </div>
        </div>

        {/* Quiz Modal Integration for specific day */}
        {day && (
            <QuizModal 
                isOpen={isQuizOpen}
                onClose={() => setIsQuizOpen(false)}
                contextText={`Topic: ${plan.topic}\n\nDay ${day.dayNumber}: ${day.title}\n${day.description}\n\nTasks:\n${day.tasks.map(t => `- ${t.text}`).join('\n')}`}
                title={`Day ${day.dayNumber} - ${day.title}`}
            />
        )}
    </>
  );
};