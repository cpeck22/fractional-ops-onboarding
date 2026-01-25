'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { MessageCircle, Send, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AskClairePage() {
  const searchParams = useSearchParams();
  const impersonateUserId = searchParams.get('impersonate');
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    
    try {
      const queryParams = impersonateUserId ? `?impersonate=${impersonateUserId}` : '';
      
      const response = await fetch(`/api/client/ask-claire${queryParams}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessages([...newMessages, { role: 'assistant', content: data.response }]);
      } else {
        setMessages([...newMessages, { 
          role: 'assistant', 
          content: `Error: ${data.error}${data.details ? ` - ${data.details}` : ''}` 
        }]);
      }
    } catch (error: any) {
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: `Error: ${error.message || 'Failed to get response from Claire'}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-fo-dark mb-2 flex items-center gap-3">
          <MessageCircle className="w-8 h-8 text-fo-primary" />
          Ask Claire
        </h1>
        <p className="text-fo-text-secondary">
          Get strategic advice on content assets, playbooks, GTM ideas, execution methods, and more. 
          Paste meeting transcripts, emails, or any strategy context to get personalized guidance.
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto mb-4 bg-white rounded-lg border border-fo-border p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-fo-text-secondary py-12">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-fo-primary/30" />
            <p className="text-lg font-medium mb-2">Start a conversation with Claire</p>
            <p className="text-sm">
              Ask questions about your strategy, paste context from meetings or emails, 
              or get advice on GTM execution.
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-fo-primary text-white'
                    : 'bg-gray-100 text-fo-dark'
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{message.content}</div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-4">
              <Loader2 className="w-5 h-5 animate-spin text-fo-primary" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Claire anything... (Paste meeting transcripts, emails, or ask strategic questions)"
          className="flex-1 px-4 py-3 border border-fo-border rounded-lg focus:ring-2 focus:ring-fo-primary focus:border-fo-primary outline-none resize-none"
          rows={3}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="px-6 py-3 bg-fo-primary text-white rounded-lg hover:bg-fo-primary/90 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Send</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
