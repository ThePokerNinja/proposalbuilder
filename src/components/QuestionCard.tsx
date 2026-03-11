import React from 'react';
import { Question, Answer } from '../types';
import { Mic, MicOff, Sparkles } from 'lucide-react';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';

interface QuestionCardProps {
  question: Question;
  answer: Answer | null;
  onAnswer: (answer: Answer) => void;
  questionNumber: number;
  totalQuestions: number;
  prediction?: string | string[];
  hasPrediction?: boolean;
}

export function QuestionCard({ question, answer, onAnswer, questionNumber, totalQuestions, prediction, hasPrediction }: QuestionCardProps) {
  const [textInput, setTextInput] = React.useState('');
  const [voiceTranscript, setVoiceTranscript] = React.useState('');

  const handleVoiceResult = (transcript: string) => {
    setVoiceTranscript(transcript);
    setTextInput(transcript);
    if (question.type === 'text') {
      onAnswer({ questionId: question.id, value: transcript });
    }
  };

  const { isListening, isSupported, startListening, stopListening } = useVoiceRecognition({
    onResult: handleVoiceResult,
  });

  const handleSelectChange = (value: string) => {
    if (question.type === 'multi-select') {
      const currentValues = Array.isArray(answer?.value) ? (answer.value as string[]) : [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];
      onAnswer({ questionId: question.id, value: newValues });
    } else {
      onAnswer({ questionId: question.id, value });
    }
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      onAnswer({ questionId: question.id, value: textInput });
    }
  };

  return (
    <div className="portfolio-card p-8 md:p-10 max-w-2xl mx-auto">
      <div className="mb-6 flex items-center flex-wrap gap-3">
        <span className="text-sm font-semibold text-portfolio-blue">
          Question {questionNumber} of {totalQuestions}
        </span>
        <span className="text-gray-300">•</span>
        <span className="text-sm text-gray-600 capitalize font-medium">{question.category}</span>
        <span className="text-gray-300">•</span>
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
          question.type === 'multi-select'
            ? 'bg-purple-100 text-purple-700'
            : question.type === 'select'
            ? 'bg-blue-100 text-blue-700'
            : 'bg-gray-100 text-gray-700'
        }`}>
          {question.type === 'multi-select' ? 'Multiple Selection' : question.type === 'select' ? 'Single Selection' : 'Text Input'}
        </span>
      </div>

      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2 leading-tight">{question.text}</h2>
        {hasPrediction && !answer && prediction && (
          <div className="flex items-center gap-2 text-sm text-portfolio-blue bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
            <Sparkles className="w-4 h-4" />
            <span className="font-medium">AI Suggestion: Based on your project description</span>
          </div>
        )}
      </div>

      {question.type === 'text' && (
        <div className="space-y-4">
          <div className="relative">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleTextSubmit();
                }
              }}
              placeholder="Type your answer or use voice input..."
              className="w-full px-5 py-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-portfolio-blue focus:border-portfolio-blue resize-none text-gray-900"
              rows={4}
            />
            {isSupported && (
              <button
                onClick={isListening ? stopListening : startListening}
                className={`absolute bottom-4 right-4 p-2.5 rounded-full transition-all shadow-lg ${
                  isListening
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-portfolio-blue text-white hover:bg-portfolio-blue-dark'
                }`}
                title={isListening ? 'Stop listening' : 'Start voice input'}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
            )}
          </div>
          {voiceTranscript && (
            <p className="text-sm text-gray-600 italic">Voice input: "{voiceTranscript}"</p>
          )}
          <button
            onClick={handleTextSubmit}
            disabled={!textInput.trim()}
            className="w-full bg-portfolio-blue text-white py-4 rounded-lg font-semibold text-lg hover:bg-portfolio-blue-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            Continue
          </button>
        </div>
      )}

      {question.type === 'select' && (
        <div className="space-y-3">
          {question.options?.map((option) => (
            <button
              key={option}
              onClick={() => handleSelectChange(option)}
              className={`w-full text-left px-5 py-4 rounded-lg border-2 transition-all font-medium ${
                answer?.value === option
                  ? 'border-portfolio-blue bg-blue-50 text-portfolio-blue shadow-md'
                  : 'border-gray-200 hover:border-portfolio-blue hover:bg-gray-50 text-gray-900'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {question.type === 'multi-select' && (
        <div className="space-y-3">
          {question.options?.map((option) => {
            const isSelected = Array.isArray(answer?.value) && (answer.value as string[]).includes(option);
            return (
              <button
                key={option}
                onClick={() => handleSelectChange(option)}
                className={`w-full text-left px-5 py-4 rounded-lg border-2 transition-all font-medium ${
                  isSelected
                    ? 'border-portfolio-blue bg-blue-50 text-portfolio-blue shadow-md'
                    : 'border-gray-200 hover:border-portfolio-blue hover:bg-gray-50 text-gray-900'
                }`}
              >
                <span className="flex items-center">
                  <span
                    className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-portfolio-blue bg-portfolio-blue'
                        : 'border-gray-300'
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </span>
                  {option}
                </span>
              </button>
            );
          })}
          {Array.isArray(answer?.value) && (answer.value as string[]).length > 0 && (
            <button
              onClick={() => onAnswer({ questionId: question.id, value: [] })}
              className="mt-4 text-sm text-portfolio-blue hover:text-portfolio-blue-dark font-medium"
            >
              Clear selection
            </button>
          )}
        </div>
      )}
    </div>
  );
}
