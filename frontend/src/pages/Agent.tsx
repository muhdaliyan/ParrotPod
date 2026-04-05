import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, PlusCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { apiPost, useApi, apiDelete } from '../hooks/useApi';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function Agent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load History from DB
  const { data: history, loading: historyLoading } = useApi<Message[]>('/api/agents/chat/history');

  useEffect(() => {
    if (history) {
      setMessages(history);
    }
  }, [history]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await apiPost<{ content: string }>('/api/agents/chat', {
        message: userMessage.content
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.content || "I'm sorry, I couldn't process that request.",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Chat Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error.message || "I encountered an error while processing your request. Please try again later.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = async () => {
    if (!window.confirm("Are you sure you want to clear the entire chat history?")) return;
    try {
      await apiDelete('/api/agents/chat/history');
      setMessages([]);
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background Accents */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header with Clear Button */}
      <div className="fixed top-0 left-64 right-0 z-40 bg-background/80 backdrop-blur-md px-8 py-4 flex items-center justify-between border-b border-outline-variant/10">
        <div>

        </div>
        <button
          onClick={clearChat}
          className="flex mt-5 items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-error transition-colors rounded-xl hover:bg-error-container/10"
        >
          <Trash2 size={14} />
          Clear History
        </button>
      </div>

      {/* Chat Area */}
      <div className="max-w-4xl mx-auto px-4 pt-28 pb-36">
        {historyLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-primary opacity-20" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center space-y-6" style={{ minHeight: 'calc(100vh - 280px)' }}>
            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-primary">How can I help you today?</h2>
              <p className="text-on-surface-variant max-w-md mx-auto font-medium text-sm md:text-base">
                Ask me anything about your workflows, data, or business operations.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 md:gap-4 ${message.role === 'assistant' ? 'flex-row' : 'flex-row-reverse'}`}
                >
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${message.role === 'assistant' ? 'bg-primary text-white' : 'bg-secondary text-white'
                    }`}>
                    {message.role === 'assistant' ? <Bot size={18} /> : <User size={18} />}
                  </div>
                  <div className={`flex flex-col max-w-[85%] md:max-w-[80%] ${message.role === 'assistant' ? 'items-start' : 'items-end'}`}>
                    <div className={`p-3 md:p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${message.role === 'assistant'
                      ? 'bg-white border border-outline-variant/20 text-on-surface'
                      : 'bg-primary text-white'
                      }`}>
                      <div className="markdown-content">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    </div>
                    <span className="text-[10px] text-on-surface-variant mt-1 font-bold">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <div className="flex gap-3 md:gap-4">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 animate-pulse">
                  <Bot size={18} />
                </div>
                <div className="bg-white border border-outline-variant/20 p-3 md:p-4 rounded-2xl shadow-sm">
                  <Loader2 size={18} className="animate-spin text-primary" />
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 left-64 right-0 z-30 bg-background/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="relative flex items-end gap-2 bg-surface-container-low border border-outline-variant/20 rounded-2xl p-2 shadow-sm transition-all duration-300">
            <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
              <PlusCircle size={20} />
            </button>
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Parrot Pod AI..."
              className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 py-2 px-1 text-sm font-medium resize-none max-h-32 scrollbar-hide"
              style={{ height: 'auto' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={`p-2 rounded-xl transition-all duration-300 ${input.trim() && !isLoading
                ? 'bg-primary text-white shadow-md hover:scale-105 active:scale-95'
                : 'bg-surface-container-highest text-on-surface-variant cursor-not-allowed'
                }`}
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
          <p className="text-[10px] text-center mt-2 text-on-surface-variant font-bold tracking-wide uppercase opacity-70">
            Parrot Pod AI can make mistakes. Check important info.
          </p>
        </div>
      </div>
    </div>
  );
}
