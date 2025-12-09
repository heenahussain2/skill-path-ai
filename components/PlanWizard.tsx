import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './Icons';
import { generateLearningPlan, updatePlanWithChat } from '../services/geminiService';
import { LearningPlan, DayPlan } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface PlanWizardProps {
  onPlanCreated: (plan: LearningPlan) => void;
  onCancel: () => void;
}

export const PlanWizard: React.FC<PlanWizardProps> = ({ onPlanCreated, onCancel }) => {
  // Form State
  const [topic, setTopic] = useState('');
  const [days, setDays] = useState(7);
  const [timePerDay, setTimePerDay] = useState('30 mins');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Review & Refine State
  const [generatedPlan, setGeneratedPlan] = useState<LearningPlan | null>(null);
  const [refineInput, setRefineInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of list when plan updates
  useEffect(() => {
    if (generatedPlan && scrollRef.current) {
        scrollRef.current.scrollTop = 0;
    }
  }, [generatedPlan?.lastUpdated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const planData = await generateLearningPlan(topic, days, timePerDay);
      
      const newPlan: LearningPlan = {
        ...planData,
        id: uuidv4(),
        startDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      setGeneratedPlan(newPlan);
    } catch (err: any) {
      setError(err.message || "Failed to generate plan. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!refineInput.trim() || !generatedPlan) return;

    setIsRefining(true);
    setError(null);
    const originalPlan = generatedPlan;

    try {
        // Optimistic UI updates or loading states happen here
        const updated = await updatePlanWithChat(generatedPlan, refineInput);
        setGeneratedPlan(updated);
        setRefineInput('');
    } catch (err: any) {
        setError("Failed to update plan. Please try again.");
        setGeneratedPlan(originalPlan);
    } finally {
        setIsRefining(false);
    }
  };

  const handleConfirm = () => {
      if (generatedPlan) {
          onPlanCreated(generatedPlan);
      }
  };

  // --------------------------------------------------------------------------
  // RENDER: PREVIEW MODE
  // --------------------------------------------------------------------------
  if (generatedPlan) {
    return (
        <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-indigo-600 text-white">
                <div>
                    <div className="flex items-center gap-2 mb-1 opacity-90 text-sm font-medium uppercase tracking-wider">
                        <Icons.Sparkles size={14} /> Plan Preview
                    </div>
                    <h2 className="text-2xl font-bold">{generatedPlan.topic}</h2>
                    <div className="flex gap-4 mt-2 text-indigo-100 text-sm">
                        <span className="flex items-center gap-1"><Icons.Calendar size={14} /> {generatedPlan.durationDays} Days</span>
                        <span className="flex items-center gap-1"><Icons.Clock size={14} /> {generatedPlan.dailyTime}/day</span>
                    </div>
                </div>
                <button onClick={() => setGeneratedPlan(null)} className="text-indigo-200 hover:text-white transition-colors bg-indigo-700/50 p-2 rounded-lg">
                    <Icons.X size={20} />
                </button>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Left: Plan Content List */}
                <div className="flex-1 overflow-y-auto bg-gray-50 p-6" ref={scrollRef}>
                    <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <Icons.BookOpen size={18} className="text-indigo-600" />
                        Curriculum Overview
                    </h3>
                    <div className="space-y-4">
                        {generatedPlan.days.map((day) => (
                            <div key={day.dayNumber} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Day {day.dayNumber}</span>
                                </div>
                                <h4 className="font-bold text-gray-800 mb-2">{day.title}</h4>
                                <p className="text-sm text-gray-600 line-clamp-3 mb-3">{day.description}</p>
                                <div className="flex gap-2 flex-wrap">
                                    {day.tasks.slice(0, 2).map((task, i) => (
                                        <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md border border-gray-200 truncate max-w-[200px]">
                                            {task.text}
                                        </span>
                                    ))}
                                    {day.tasks.length > 2 && (
                                        <span className="text-xs text-gray-400 px-1 py-1">+{day.tasks.length - 2} more</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Actions & Refine */}
                <div className="w-full md:w-80 bg-white border-l border-gray-200 flex flex-col z-10 shadow-lg">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="font-semibold text-gray-800 mb-1">Not quite right?</h3>
                        <p className="text-xs text-gray-500">Ask AI to adjust the duration, difficulty, or content.</p>
                    </div>
                    
                    <div className="p-4 flex-1 flex flex-col gap-2">
                         <textarea
                            value={refineInput}
                            onChange={(e) => setRefineInput(e.target.value)}
                            placeholder="e.g. 'Make it 5 days instead', 'Focus more on practical examples', 'Remove the advanced topics'"
                            className="w-full flex-1 p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-none"
                            disabled={isRefining}
                        />
                        <button
                            onClick={handleRefine}
                            disabled={!refineInput.trim() || isRefining}
                            className="flex items-center justify-center gap-2 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 font-medium text-sm transition-colors disabled:opacity-50"
                        >
                            {isRefining ? <div className="animate-spin h-4 w-4 border-2 border-indigo-700 border-t-transparent rounded-full"></div> : <Icons.Sparkles size={16} />}
                            Update Plan
                        </button>
                    </div>

                    <div className="p-4 border-t border-gray-100 bg-gray-50">
                        <button
                            onClick={handleConfirm}
                            className="w-full py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            <Icons.CheckCircle size={18} />
                            Confirm & Start Learning
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: WIZARD FORM
  // --------------------------------------------------------------------------
  return (
    <div className="max-w-2xl w-full mx-auto bg-white rounded-xl shadow-lg p-8 border border-gray-100 animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Icons.Sparkles className="text-indigo-600" />
          Create New Learning Plan
        </h2>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <Icons.X size={24} />
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What do you want to learn?
          </label>
          <input
            type="text"
            required
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Advanced React Patterns, Introduction to Pottery, Python for Data Science..."
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration (Days)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time per Day
            </label>
            <select
              value={timePerDay}
              onChange={(e) => setTimePerDay(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
            >
              <option value="15 mins">15 mins</option>
              <option value="30 mins">30 mins</option>
              <option value="45 mins">45 mins</option>
              <option value="1 hour">1 hour</option>
              <option value="2 hours">2 hours</option>
              <option value="3+ hours">3+ hours</option>
            </select>
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full flex items-center justify-center gap-2 py-4 rounded-lg text-white font-medium transition-all ${
              isLoading
                ? 'bg-indigo-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg'
            }`}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Generating Plan with Gemini...
              </>
            ) : (
              <>
                Generate Plan
                <Icons.ChevronRight size={20} />
              </>
            )}
          </button>
          <p className="text-center text-xs text-gray-500 mt-3">
            Powered by Gemini 2.5 Flash with Google Search Grounding for up-to-date content.
          </p>
        </div>
      </form>
    </div>
  );
};