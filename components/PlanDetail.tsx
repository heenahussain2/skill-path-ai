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
  onSelectDay: (day: DayPlan) => void;
  onAddResource: (dayNumber: number, taskId: string, resource: Resource) => void;
  onRemoveResource: (dayNumber: number, taskId: string, index: number) => void;
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
  onToggle: (id: string) => void,
  onAddResource: (resource: Resource) => void,
  onRemoveResource: (index: number) => void
}> = ({ task, onToggle, onAddResource, onRemoveResource }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState<Resource['type']>('other');

  const hasResources = task.resources && task.resources.length > 0;

  const handleAdd = () => {
    if (!newTitle.trim() || !newUrl.trim()) return;
    onAddResource({
        title: newTitle,
        url: newUrl,
        type: newType
    });
    setNewTitle('');
    setNewUrl('');
    setNewType('other');
    setIsAdding(false);
  };

  return (
    <div className={`
      mb-2 rounded-lg border transition-all overflow-hidden group
      ${task.isCompleted ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200'}
    `}>
      <div 
        className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50/50"
        onClick={() => onToggle(task.id)}
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

        <button 
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className={`transition-colors p-1 rounded hover:bg-gray-100 ${hasResources ? 'text-indigo-500' : 'text-gray-300 hover:text-indigo-400'}`}
            title={hasResources ? "View resources" : "Add resources"}
        >
            {isExpanded ? <Icons.ChevronUp size={16} /> : (hasResources ? <Icons.ChevronDown size={16} /> : <Icons.Plus size={16} className="opacity-0 group-hover:opacity-100" />)}
        </button>
      </div>

      {isExpanded && (
        <div className="bg-gray-50/80 px-4 pb-3 pt-0 border-t border-gray-100/50">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-2 flex items-center gap-1">
             <Icons.BookOpen size={10} /> Resources
          </div>
          
          <div className="space-y-2 mb-3">
            {task.resources?.map((res, idx) => (
              <div key={idx} className="flex items-center gap-2 group/res">
                <a 
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center gap-2 p-2 rounded-md bg-white border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                    <div className="text-indigo-500">
                    {res.type === 'video' ? <Icons.Video size={14} /> : 
                    res.type === 'documentation' ? <Icons.FileText size={14} /> : 
                    <Icons.ExternalLink size={14} />}
                    </div>
                    <span className="text-xs text-gray-700 font-medium truncate flex-1 hover:text-indigo-700">
                    {res.title}
                    </span>
                    <Icons.ExternalLink size={10} className="text-gray-300" />
                </a>
                <button 
                    onClick={() => onRemoveResource(idx)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover/res:opacity-100 transition-all"
                    title="Remove resource"
                >
                    <Icons.Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {isAdding ? (
              <div className="bg-white p-3 rounded-md border border-indigo-100 shadow-sm animate-in fade-in zoom-in-95">
                  <div className="space-y-2">
                      <input 
                        type="text" 
                        value={newTitle} 
                        onChange={e => setNewTitle(e.target.value)}
                        placeholder="Resource Title"
                        className="w-full text-xs p-2 border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      />
                      <input 
                        type="text" 
                        value={newUrl} 
                        onChange={e => setNewUrl(e.target.value)}
                        placeholder="URL (https://...)"
                        className="w-full text-xs p-2 border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      />
                      <select 
                        value={newType} 
                        onChange={e => setNewType(e.target.value as any)}
                        className="w-full text-xs p-2 border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                      >
                          <option value="other">Other</option>
                          <option value="video">Video</option>
                          <option value="blog">Article/Blog</option>
                          <option value="documentation">Documentation</option>
                      </select>
                      <div className="flex gap-2 pt-1">
                          <button 
                            onClick={handleAdd}
                            disabled={!newTitle || !newUrl}
                            className="flex-1 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 disabled:opacity-50"
                          >
                              Add
                          </button>
                          <button 
                            onClick={() => setIsAdding(false)}
                            className="flex-1 py-1 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200"
                          >
                              Cancel
                          </button>
                      </div>
                  </div>
              </div>
          ) : (
             <button 
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium px-1 py-1 rounded hover:bg-indigo-50 transition-colors"
             >
                 <Icons.Plus size={12} /> Add Resource
             </button>
          )}
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
  onToggleSession,
  onSelectDay,
  onAddResource,
  onRemoveResource
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

  const handlePrevDay = () => {
    if (!day) return;
    const prevDay = plan.days.find(d => d.dayNumber === day.dayNumber - 1);
    if (prevDay) onSelectDay(prevDay);
  };

  const handleNextDay = () => {
    if (!day) return;
    const nextDay = plan.days.find(d => d.dayNumber === day.dayNumber + 1);
    if (nextDay) onSelectDay(nextDay);
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
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                            <button
                                onClick={handlePrevDay}
                                disabled={day.dayNumber <= 1}
                                className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                title="Previous Day"
                            >
                                <Icons.ChevronLeft size={16} />
                            </button>
                            <span className="px-3 text-sm font-bold text-indigo-700 min-w-[60px] text-center uppercase tracking-wide">
                                Day {day.dayNumber}
                            </span>
                            <button
                                onClick={handleNextDay}
                                disabled={day.dayNumber >= plan.days.length}
                                className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                title="Next Day"
                            >
                                <Icons.ChevronRight size={16} />
                            </button>
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
                                onAddResource={(res) => onAddResource(day.dayNumber, task.id, res)}
                                onRemoveResource={(idx) => onRemoveResource(day.dayNumber, task.id, idx)}
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