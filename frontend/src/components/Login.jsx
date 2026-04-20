import React, { useState } from 'react';
import { ShieldCheck, Lock, User, ArrowRight } from 'lucide-react';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';

const Login = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation for Registration
    if (!isLogin && password !== confirmPassword) {
      setError("Signatures do not match. Verification failed.");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);
        
        const res = await api.post('/auth/login', formData);
        localStorage.setItem('token', res.data.access_token);
        onLoginSuccess();
      } else {
        await api.post('/auth/register', { username, password });
        setShowSuccess(true);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-thoth-bg p-4 lg:p-8 overflow-y-auto selection:bg-thoth-primary/30">
        {/* Background Decorative Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-thoth-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md relative z-10"
        >
            <div className="glass-card p-8 lg:p-10 space-y-8 border-thoth-border shadow-2xl">
                {/* Header Branding */}
                <div className="text-center space-y-4">
                    <motion.div 
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-thoth-primary to-blue-700 rounded-3xl shadow-xl shadow-thoth-primary/20 mb-2"
                    >
                        <ShieldCheck size={32} className="text-white" />
                    </motion.div>
                    <div>
                        <h2 className="text-3xl font-black tracking-tighter uppercase text-thoth-text leading-none">
                            Thoth<span className="text-thoth-primary">Cloud</span>
                        </h2>
                        <p className="text-[10px] font-bold text-thoth-text-dim uppercase tracking-[0.4em] mt-2 italic">Secure Node Access</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Username Input */}
                    <div className="space-y-2.5">
                        <label className="text-[10px] font-black uppercase text-thoth-text-dim tracking-widest px-1">Operator Identity</label>
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-thoth-text-dim group-focus-within:text-thoth-primary transition-all" size={18} />
                            <input 
                                type="text" 
                                className="input-field !pl-14 h-14" 
                                placeholder="Username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-2.5">
                        <label className="text-[10px] font-black uppercase text-thoth-text-dim tracking-widest px-1">Digital Signature</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-thoth-text-dim group-focus-within:text-thoth-primary transition-all" size={18} />
                            <input 
                                type="password" 
                                className="input-field !pl-14 h-14" 
                                placeholder="Signature"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {!isLogin && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-2.5"
                        >
                            <label className="text-[10px] font-black uppercase text-thoth-text-dim tracking-widest px-1">Confirm Signature</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-thoth-text-dim group-focus-within:text-thoth-primary transition-all" size={18} />
                                <input 
                                    type="password" 
                                    className="input-field !pl-14 h-14" 
                                    placeholder="Repeat Signature"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </motion.div>
                    )}

                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-bold uppercase tracking-tight"
                        >
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,1)]" />
                            {error}
                        </motion.div>
                    )}

                    <button 
                        disabled={loading}
                        className="w-full h-14 bg-gradient-to-r from-thoth-primary to-blue-600 hover:from-blue-600 hover:to-thoth-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-thoth-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
                    >
                        {loading ? 'Processing...' : (isLogin ? 'Initiate Uplink' : 'Register Node')}
                        <ArrowRight size={16} />
                    </button>
                </form>

                <div className="text-center pt-4">
                    <p className="text-[10px] text-thoth-text-dim font-bold uppercase tracking-widest">
                        {isLogin ? "Unauthorized Operator?" : "Signature already exists?"}
                        <button 
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                                setConfirmPassword('');
                            }}
                            className="text-thoth-primary ml-2 hover:text-thoth-text transition-all underline underline-offset-4 decoration-2 decoration-thoth-primary/30"
                        >
                            {isLogin ? 'Request Access' : 'Return to Login'}
                        </button>
                    </p>
                </div>
            </div>
        </motion.div>

        {/* Pro Success Popup */}
        <AnimatePresence>
            {showSuccess && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-thoth-bg/80 backdrop-blur-md">
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="glass-card max-w-sm w-full p-10 text-center space-y-6 border-thoth-primary/20 bg-gradient-to-b from-thoth-primary/10 to-transparent"
                    >
                        <div className="w-20 h-20 bg-thoth-primary/20 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-thoth-primary/30">
                            <ShieldCheck className="text-thoth-primary" size={40} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-thoth-text uppercase tracking-tighter">Registration Success</h3>
                            <p className="text-xs text-thoth-text-dim font-medium mt-2 leading-relaxed">Your node identity has been verified and registered on the network.</p>
                        </div>
                        <button 
                            onClick={() => { setShowSuccess(false); setIsLogin(true); }}
                            className="w-full py-4 bg-thoth-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-[0.98] transition-all"
                        >
                            Proceed to Login
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default Login;
