import React, { useState, useEffect } from 'react';
import { QuizQuestion } from '../types';
import { Icons } from './Icons';
import { generateQuiz } from '../services/geminiService';

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextText: string;
  title: string;
}

export const QuizModal: React.FC<QuizModalProps> = ({ isOpen, onClose, contextText, title }) => {
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset state
      setQuestions([]);
      setCurrentIndex(0);
      setUserAnswers([]);
      setShowResults(false);
      setError(null);
      setLoading(true);

      // Generate quiz
      generateQuiz(contextText, 5)
        .then(qs => {
          if (!qs || qs.length === 0) {
            throw new Error("No questions generated.");
          }
          setQuestions(qs);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setError("Failed to generate quiz. Please try again.");
          setLoading(false);
        });
    }
  }, [isOpen, contextText]);

  if (!isOpen) return null;

  const handleAnswer = (optionIndex: number) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentIndex] = optionIndex;
    setUserAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowResults(true);
    }
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctAnswerIndex) score++;
    });
    return score;
  };

  // Safe access to current question
  const currentQuestion = questions[currentIndex];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-indigo-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/50 rounded-lg">
                <Icons.BrainCircuit size={24} className="text-white" />
            </div>
            <div>
                <h3 className="font-bold text-lg leading-tight">Quiz: {title}</h3>
                <p className="text-indigo-200 text-xs">Test your knowledge</p>
            </div>
          </div>
          <button onClick={onClose} className="text-indigo-200 hover:text-white transition-colors">
            <Icons.X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {loading || questions.length === 0 ? (
                // Show loading state if loading OR if questions haven't loaded yet (preventing the crash)
                !error ? (
                    <div className="flex flex-col items-center justify-center h-64 space-y-4">
                        <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
                        <p className="text-gray-500 font-medium">Generating questions based on your plan...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <Icons.HelpCircle size={48} className="text-red-300 mb-4" />
                        <p className="text-gray-800 font-medium mb-2">{error}</p>
                        <button onClick={onClose} className="text-indigo-600 hover:underline">Close</button>
                    </div>
                )
            ) : showResults ? (
                <div className="space-y-6">
                    <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                        <div className="text-gray-500 uppercase tracking-wider text-xs font-bold mb-2">Final Score</div>
                        <div className="text-5xl font-bold text-indigo-600 mb-2">
                            {calculateScore()} / {questions.length}
                        </div>
                        <p className="text-gray-600">
                            {calculateScore() === questions.length ? "Perfect! You've mastered this topic." : 
                             calculateScore() > questions.length / 2 ? "Great job! Keep learning." : "Good effort. Review the material and try again."}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-bold text-gray-800">Review Answers</h4>
                        {questions.map((q, idx) => {
                            const isCorrect = userAnswers[idx] === q.correctAnswerIndex;
                            return (
                                <div key={idx} className={`p-4 rounded-lg border ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                    <div className="flex gap-3">
                                        <div className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${isCorrect ? 'bg-emerald-500' : 'bg-red-500'}`}>
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 mb-2">{q.question}</p>
                                            <p className="text-sm text-gray-600 mb-1">
                                                Your answer: <span className={isCorrect ? 'text-emerald-700 font-semibold' : 'text-red-700 font-semibold'}>{q.options[userAnswers[idx]]}</span>
                                            </p>
                                            {!isCorrect && (
                                                <p className="text-sm text-emerald-700">
                                                    Correct answer: <span className="font-semibold">{q.options[q.correctAnswerIndex]}</span>
                                                </p>
                                            )}
                                            <div className="mt-2 text-xs bg-white/50 p-2 rounded text-gray-600 border border-black/5">
                                                <span className="font-bold">Explanation:</span> {q.explanation}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : currentQuestion ? (
                <div className="max-w-xl mx-auto">
                    <div className="mb-6 flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-500">Question {currentIndex + 1} of {questions.length}</span>
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-indigo-500 transition-all duration-300" 
                                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} 
                            />
                        </div>
                    </div>

                    <h4 className="text-xl font-bold text-gray-900 mb-6 leading-relaxed">
                        {currentQuestion.question}
                    </h4>

                    <div className="space-y-3 mb-8">
                        {currentQuestion.options.map((option, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleAnswer(idx)}
                                className={`w-full p-4 text-left rounded-xl border-2 transition-all duration-200 flex items-center justify-between group
                                    ${userAnswers[currentIndex] === idx 
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900' 
                                        : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-gray-50'
                                    }
                                `}
                            >
                                <span className="font-medium">{option}</span>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                                     ${userAnswers[currentIndex] === idx ? 'border-indigo-600' : 'border-gray-300 group-hover:border-indigo-400'}
                                `}>
                                    {userAnswers[currentIndex] === idx && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full" />}
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={handleNext}
                            disabled={userAnswers[currentIndex] === undefined}
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all"
                        >
                            {currentIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                            <Icons.ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-64">
                   <p className="text-gray-500">Preparing quiz...</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};