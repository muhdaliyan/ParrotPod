import React, { useState, useEffect } from 'react';
import { Lock, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { API_BASE_URL } from '../hooks/useApi';

interface PasswordShieldProps {
  children: React.ReactNode;
}

export default function PasswordShield({ children }: PasswordShieldProps) {
  const [isLocked, setIsLocked] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/config/status`);
      const data = await res.json();
      
      if (data.password_required) {
        // Check if we have a valid session in localStorage
        const session = localStorage.getItem('parrotpod_session');
        if (session === 'authenticated') {
          setIsLocked(false);
        } else {
          setIsLocked(true);
        }
      } else {
        setIsLocked(false);
      }
    } catch (err) {
      console.error('Failed to check security status', err);
      setIsLocked(false); // Default to unlocked if API fails
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/config/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (res.ok) {
        localStorage.setItem('parrotpod_session', 'authenticated');
        setIsLocked(false);
      } else {
        const data = await res.json();
        setError(data.detail || 'Invalid password');
      }
    } catch (err) {
      setError('Communication error with server');
    } finally {
      setIsLoading(true); // Artificial delay for effect
      setTimeout(() => setIsLoading(false), 800);
    }
  };

  if (isLocked === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <>
      <div className={isLocked ? 'blur-2xl pointer-events-none scale-[1.02] transition-all duration-700' : 'transition-all duration-700'}>
        {children}
      </div>

      <AnimatePresence>
        {isLocked && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-background/40 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass max-w-md w-full p-10 rounded-[3rem] ambient-shadow border border-white/20 text-center"
            >
              <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary mx-auto mb-8">
                <Lock size={40} />
              </div>
              
              <h2 className="text-3xl font-black text-primary mb-3">System Protected</h2>
              <p className="text-on-surface-variant font-medium mb-10">This environment is secured. Please enter the master password to continue.</p>

              <form onSubmit={handleVerify} className="space-y-6 text-left">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-primary/60 ml-4">Master Password</label>
                  <input 
                    type="password"
                    autoFocus
                    placeholder="••••••••"
                    className="input-field w-full text-center text-xl tracking-widest py-5"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-error-container/30 text-error text-xs font-bold p-4 rounded-2xl flex items-center gap-2 border border-error/10"
                    >
                      <AlertCircle size={14} />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full py-5 rounded-[2rem] flex items-center justify-center gap-3 shadow-xl hover:shadow-primary/30 disabled:opacity-70 transition-all duration-500"
                >
                  {isLoading ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck size={24} />
                      <span className="font-black">Unlock System</span>
                    </>
                  )}
                </button>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => window.location.href = '/docs'}
                    className="w-full py-2 text-xs font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-colors"
                  >
                    Go to Documentation
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
