import React, { useState, useEffect, useRef } from 'react';
import { LearningPlan } from '../types';
import { Icons } from './Icons';
import { updatePlanWithChat } from '../services/geminiService';

interface EditPlanModalProps {
  plan: LearningPlan;
  isOpen: boolean;
  onClose: () => void;
  onPlanUpdate: (updatedPlan: LearningPlan) => void;
}

export const EditPlanModal: React.FC<EditPlanModalProps> = ({ 
  plan, 
  isOpen, 
  onClose, 
  onPlanUpdate 
}) => {
  const [chatInput, setChatInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [messages, setMessages] = useState<{role: 'user'|'model', text: string}[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
        setMessages([
            { role: 'model', text: `I can help you adjust the learning plan for "${plan.topic}". Need to make it shorter, harder, or focus on a specific sub-topic? Just ask!` }
        ]);
    }
  }, [isOpen, plan.topic]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!isOpen) return null;

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isUpdating) return;
    
    const userMsg = chatInput;
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsUpdating(true);

    try {
      const updatedPlan = await updatePlanWithChat(plan, userMsg);
      onPlanUpdate(updatedPlan);
      setMessages(prev => [...prev, { role: 'model', text: 'Plan updated successfully! The calendar has been refreshed with the new schedule.' }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error updating the plan. Please try again.' }]);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Icons.Sparkles className="text-indigo-600" size={20} />
                Edit Plan with AI
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <Icons.X size={20} />
            </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>
                        {msg.text}
                    </div>
                </div>
            ))}
             {isUpdating && (
                <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-lg rounded-bl-none flex items-center gap-2 text-xs text-gray-500">
                    <div className="animate-spin h-3 w-3 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                    Updating plan structure...
                </div>
            </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-gray-100 rounded-b-xl">
             <div className="flex gap-2">
                <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="e.g. Add more practical exercises..."
                    className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={isUpdating}
                />
                <button 
                    onClick={handleSendMessage}
                    disabled={isUpdating || !chatInput.trim()}
                    className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Icons.Send size={18} />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};