import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { PlanWizard } from './components/PlanWizard';
import { PlanCalendar } from './components/PlanCalendar';
import { PlanDetail } from './components/PlanDetail';
import { EditPlanModal } from './components/EditPlanModal';
import { QuizModal } from './components/QuizModal';
import { Icons } from './components/Icons';
import { LearningPlan, DayPlan } from './types';

// Storage key
const STORAGE_KEY = 'skillpath_plans_v1';

// Background Images (Digital Art)
const BG_LANDING = "url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')";
const BG_PLAN = "url('https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=2574&auto=format&fit=crop')";

const App: React.FC = () => {
  const [plans, setPlans] = useState<LearningPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'create' | 'view'>('view');
  
  // UI State
  const [selectedDay, setSelectedDay] = useState<DayPlan | null>(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Quiz State
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [quizContext, setQuizContext] = useState('');
  const [quizTitle, setQuizTitle] = useState('');

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsedPlans = JSON.parse(saved);
        setPlans(parsedPlans);
        if (parsedPlans.length > 0) {
          setActivePlanId(parsedPlans[0].id);
        } else {
          setViewMode('create');
        }
      } catch (e) {
        console.error("Failed to parse saved plans");
      }
    } else {
        setViewMode('create');
    }
  }, []);

  // Save to local storage whenever plans change
  useEffect(() => {
    if (plans.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    }
  }, [plans]);

  // Select today's day automatically when opening a plan
  useEffect(() => {
    if (activePlanId && plans.length > 0) {
      const plan = plans.find(p => p.id === activePlanId);
      if (plan) {
        const today = new Date();
        today.setHours(0,0,0,0);
        const startDate = new Date(plan.startDate);
        
        // Calculate diff in days
        const diffTime = Math.abs(today.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // If today is within the plan range, select it
        if (today >= startDate && diffDays < plan.days.length) {
            // Find the day with index matches today relative to start
            const targetDay = plan.days.find(d => d.dayNumber === diffDays + 1);
            if (targetDay) {
                setSelectedDay(targetDay);
            }
        }
      }
    }
  }, [activePlanId, plans]);

  const handleCreatePlan = (newPlan: LearningPlan) => {
    setPlans(prev => [newPlan, ...prev]);
    setActivePlanId(newPlan.id);
    setViewMode('view');
    // Select first day by default for new plan
    setSelectedDay(newPlan.days[0]);
    setIsSidePanelOpen(true);
  };

  const handleDeletePlan = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this plan?")) {
      const newPlans = plans.filter(p => p.id !== id);
      setPlans(newPlans);
      if (activePlanId === id) {
        setActivePlanId(newPlans.length > 0 ? newPlans[0].id : null);
        if (newPlans.length === 0) setViewMode('create');
      }
    }
  };

  const handleToggleTask = (dayNumber: number, taskId: string) => {
    if (!activePlanId) return;

    setPlans(prevPlans => prevPlans.map(plan => {
      if (plan.id !== activePlanId) return plan;
      
      return {
        ...plan,
        days: plan.days.map(day => {
          if (day.dayNumber !== dayNumber) return day;
          return {
            ...day,
            tasks: day.tasks.map(task => 
              task.id === taskId ? { ...task, isCompleted: !task.isCompleted } : task
            )
          };
        })
      };
    }));

    // Update selected day reference to trigger re-renders in side panel
    if (selectedDay && selectedDay.dayNumber === dayNumber) {
        // Force re-render not needed as props will update
    }
  };

  const handleUpdateNotes = (dayNumber: number, notes: string) => {
    if (!activePlanId) return;

    setPlans(prevPlans => prevPlans.map(plan => {
      if (plan.id !== activePlanId) return plan;

      return {
        ...plan,
        days: plan.days.map(day => {
          if (day.dayNumber !== dayNumber) return day;
          return { ...day, notes };
        })
      };
    }));
  };

  const handleSessionToggle = (dayNumber: number) => {
    if (!activePlanId) return;

    setPlans(prevPlans => prevPlans.map(plan => {
      if (plan.id !== activePlanId) return plan;

      return {
        ...plan,
        days: plan.days.map(day => {
          if (day.dayNumber !== dayNumber) return day;

          const sessions = day.sessions || [];
          const lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;
          const isRunning = lastSession && lastSession.end === null;

          let newSessions;
          if (isRunning) {
            // Stop session
            newSessions = [...sessions];
            newSessions[sessions.length - 1] = { ...lastSession, end: Date.now() };
          } else {
            // Start session
            newSessions = [...sessions, { start: Date.now(), end: null }];
          }

          return { ...day, sessions: newSessions };
        })
      };
    }));
  };
  
  // Need to ensure SelectedDay stays in sync with plans state
  const activePlan = plans.find(p => p.id === activePlanId);
  const currentSelectedDay = activePlan?.days.find(d => d.dayNumber === selectedDay?.dayNumber) || null;

  const handleUpdatePlan = (updatedPlan: LearningPlan) => {
      setPlans(prev => prev.map(p => p.id === updatedPlan.id ? updatedPlan : p));
  };

  const handleStartPlanQuiz = () => {
    if (!activePlan) return;
    
    // Construct context for the entire plan
    const context = `
      Topic: ${activePlan.topic}
      
      ${activePlan.days.map(day => `Day ${day.dayNumber}: ${day.title}\n${day.description}`).join('\n\n')}
    `;
    
    setQuizTitle(`Full Plan - ${activePlan.topic}`);
    setQuizContext(context);
    setIsQuizOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row h-screen overflow-hidden font-sans">
      
      {/* Sidebar Navigation */}
      <div 
        className={`bg-white border-r border-gray-200 flex flex-col h-auto md:h-full z-20 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'} w-full`}
      >
        <div className={`p-4 border-b border-gray-100 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-2 overflow-hidden">
                <div className="bg-indigo-600 p-1.5 rounded-lg flex-shrink-0">
                    <Icons.BookOpen className="text-white" size={20} />
                </div>
                <h1 className={`font-bold text-xl text-gray-800 tracking-tight whitespace-nowrap transition-opacity duration-200 ${isSidebarCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                    SkillPath
                </h1>
            </div>
            <button 
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={`text-gray-400 hover:text-indigo-600 p-1 rounded-md hover:bg-gray-100 transition-colors hidden md:block`}
            >
                <Icons.PanelLeft size={18} />
            </button>
        </div>

        <div className="p-3 flex-1 overflow-y-auto">
          {!isSidebarCollapsed && (
             <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">Your Plans</div>
          )}
          
          <div className="space-y-2">
            {plans.map(plan => (
              <div 
                key={plan.id}
                onClick={() => {
                  setActivePlanId(plan.id);
                  setViewMode('view');
                }}
                className={`
                    group flex items-center p-2.5 rounded-lg cursor-pointer transition-all
                    ${activePlanId === plan.id && viewMode === 'view' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}
                    ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}
                `}
                title={isSidebarCollapsed ? plan.topic : ''}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${activePlanId === plan.id ? 'bg-indigo-500' : 'bg-gray-300'}`}></div>
                  <span className={`font-medium text-sm truncate transition-all duration-200 ${isSidebarCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                    {plan.topic}
                  </span>
                </div>
                {!isSidebarCollapsed && (
                    <button 
                        onClick={(e) => handleDeletePlan(plan.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1"
                    >
                        <Icons.Trash2 size={14} />
                    </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => setViewMode('create')}
            className={`
                w-full mt-4 flex items-center gap-2 p-3 rounded-lg text-sm font-medium border border-dashed border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-all 
                ${viewMode === 'create' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : ''}
                ${isSidebarCollapsed ? 'justify-center px-0' : ''}
            `}
            title={isSidebarCollapsed ? "Create New Plan" : ""}
          >
            <Icons.Plus size={isSidebarCollapsed ? 20 : 16} />
            {!isSidebarCollapsed && <span>New Plan</span>}
          </button>
        </div>
      </div>

      {/* Main Content Area with Background */}
      <div 
        className="flex-1 flex flex-col h-full relative overflow-hidden bg-gray-50 transition-all duration-500"
        style={{ 
            backgroundImage: viewMode === 'create' ? BG_LANDING : BG_PLAN,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
        }}
      >
        {/* Overlay for better readability */}
        <div className="absolute inset-0 bg-white/30 backdrop-blur-[2px] z-0 pointer-events-none"></div>

        {viewMode === 'create' ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-8 flex items-center justify-center relative z-10">
            <PlanWizard 
                onPlanCreated={handleCreatePlan} 
                onCancel={() => plans.length > 0 ? setViewMode('view') : null}
            />
          </div>
        ) : (
          activePlan && (
            <div className="flex-1 flex flex-col h-full overflow-hidden p-4 md:p-6 relative z-10">
              {/* Toolbar */}
              <div className="flex justify-between items-center mb-4 bg-white/80 backdrop-blur-md p-3 rounded-xl border border-white/50 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-800 hidden md:block px-2">Learning Progress</h2>
                  <div className="flex gap-3 ml-auto md:ml-0">
                    <button 
                        onClick={handleStartPlanQuiz}
                        className="flex items-center gap-2 px-3 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 text-sm font-medium transition-all shadow-sm"
                    >
                        <Icons.BrainCircuit size={16} />
                        Generate Quiz
                    </button>
                    <button 
                        onClick={() => setIsEditModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-all shadow-sm shadow-indigo-200"
                    >
                        <Icons.Sparkles size={16} />
                        Edit Plan
                    </button>
                    <button 
                        onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
                        className={`md:hidden p-2 rounded-lg border ${isSidePanelOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-600'}`}
                    >
                        <Icons.Layout size={20} />
                    </button>
                  </div>
              </div>

              {/* Calendar Grid - Wrapped in transculent bg handled by component or here */}
              <div className="flex-1 overflow-hidden rounded-xl shadow-lg border border-white/50 bg-white/90 backdrop-blur-sm">
                <PlanCalendar 
                    plan={activePlan} 
                    selectedDay={currentSelectedDay}
                    onSelectDay={(day) => {
                        setSelectedDay(day);
                        setIsSidePanelOpen(true);
                    }}
                />
              </div>

              {/* Side Panel */}
              <PlanDetail 
                day={currentSelectedDay}
                plan={activePlan}
                isVisible={isSidePanelOpen}
                onClose={() => setIsSidePanelOpen(false)}
                onToggleTask={handleToggleTask}
                onUpdateNotes={handleUpdateNotes}
                onToggleSession={handleSessionToggle}
              />
              
              {/* Edit Plan Modal */}
              <EditPlanModal 
                plan={activePlan}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onPlanUpdate={handleUpdatePlan}
              />

              {/* Quiz Modal */}
              <QuizModal
                isOpen={isQuizOpen}
                onClose={() => setIsQuizOpen(false)}
                contextText={quizContext}
                title={quizTitle}
              />
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default App;