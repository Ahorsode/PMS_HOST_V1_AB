'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Phone, ArrowRight, Loader2, Bird, User, Mail } from 'lucide-react';
import Background3D from '@/components/auth/Background3D';

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    firstname: '',
    surname: '',
    email: '',
    phoneNumber: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phoneNumber) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      // For sign up, we might need a custom action to create the user first 
      // or rely on the authorize function to handle auto-registration if it's designed that way.
      // Given the current auth.ts, it looks like it searches for invitations.
      // If we want a general sign up, we should probably have a server action.
      
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // After successful registration, sign in
      const signinRes = await signIn('credentials', {
        phoneNumber: formData.phoneNumber,
        redirect: false,
      });
      
      if (signinRes?.error) {
        setError('Account created but login failed. Please go to login page.');
        setIsLoading(false);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh();
        }, 800);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-[#0a0a0a] flex items-center justify-center overflow-hidden py-10">
      <Background3D />
      
      <div className="relative z-10 w-full max-w-md px-6">
        <AnimatePresence mode="wait">
          {!success ? (
            <motion.div
              key="signup-form"
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -40, scale: 0.95, filter: "blur(10px)" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full pointer-events-none" />

              <div className="relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden group">
                <div className="flex flex-col items-center text-center space-y-6">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2, bounce: 0.5 }}
                    className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-500/20"
                  >
                    <Bird className="w-10 h-10 text-white" />
                  </motion.div>
                  
                  <div className="space-y-2">
                    <h1 className="text-4xl font-black text-white tracking-tighter">Join Us</h1>
                    <p className="text-white/50 font-medium">Create your poultry farm account</p>
                  </div>

                  <form onSubmit={handleSubmit} className="w-full space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative group/input">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <User className="w-4 h-4 text-white/30 group-focus-within/input:text-emerald-400 transition-colors" />
                        </div>
                        <input
                          type="text"
                          name="firstname"
                          value={formData.firstname}
                          onChange={handleChange}
                          placeholder="First"
                          className="w-full h-12 pl-10 pr-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm"
                        />
                      </div>
                      <div className="relative group/input">
                        <input
                          type="text"
                          name="surname"
                          value={formData.surname}
                          onChange={handleChange}
                          placeholder="Surname"
                          className="w-full h-12 px-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm"
                        />
                      </div>
                    </div>

                    <div className="relative group/input">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="w-4 h-4 text-white/30 group-focus-within/input:text-emerald-400 transition-colors" />
                      </div>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Email Address (Optional)"
                        className="w-full h-12 pl-10 pr-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm"
                      />
                    </div>

                    <div className="relative group/input">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Phone className="w-4 h-4 text-white/30 group-focus-within/input:text-emerald-400 transition-colors" />
                      </div>
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        placeholder="+233 54 000 0000"
                        required
                        className="w-full h-12 pl-10 pr-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm"
                      />
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-red-400 text-[10px] font-black uppercase tracking-widest bg-red-500/10 py-2 rounded-lg border border-red-500/20"
                        >
                          {error}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-14 bg-white hover:bg-gray-100 text-black rounded-2xl font-black text-lg transition-all shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center group/btn"
                    >
                      {isLoading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <>
                          <span>Create Account</span>
                          <ArrowRight className="w-5 h-5 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </form>
                  
                  <p className="text-white/40 text-xs font-bold pt-4">
                    Already have an account? <button onClick={() => router.push('/login')} className="text-emerald-400 hover:underline">Log In</button>
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success-animation"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center text-center space-y-6"
            >
              <div className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_100px_rgba(16,185,129,0.4)]">
                <Bird className="w-16 h-16 text-white" />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tighter">Welcome Aboard!</h2>
              <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
