import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Key, Lock, Copy, Check, RefreshCw, Cpu, Activity, Globe, Monitor, Trash2 } from 'lucide-react';
import api from '../api';

const SecuritySettings = ({ user }) => {
    const [apiKey, setApiKey] = useState('thoth_sk_live_823hf923h8923hf923h8f');
    const [copied, setCopied] = useState(false);
    const [logs, setLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(true);

    useEffect(() => {
        api.get('/auth/logs')
            .then(res => setLogs(res.data))
            .catch(err => console.error("Failed to fetch logs", err))
            .finally(() => setLoadingLogs(false));
    }, []);

    const handleCopy = () => {
        navigator.clipboard.writeText(apiKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClearLogs = async () => {
        if (!window.confirm("Are you sure you want to clear all activity logs? This cannot be undone.")) return;
        
        try {
            setLoadingLogs(true);
            await api.delete('/auth/logs');
            setLogs([]);
        } catch (err) {
            console.error("Failed to clear logs", err);
        } finally {
            setLoadingLogs(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="max-w-6xl mx-auto space-y-12 pb-20"
        >
            {/* Header */}
            <div className="flex items-center gap-6 mb-12">
                <div className="bg-thoth-primary/20 p-5 rounded-3xl border border-thoth-primary/20">
                    <Shield size={40} className="text-thoth-primary" />
                </div>
                <div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase italic" style={{ color: 'var(--thoth-text)' }}>
                        Security Settings
                    </h2>
                    <p className="text-[10px] font-bold uppercase tracking-[0.4em] mt-1" style={{ color: 'var(--thoth-text-dim)' }}>
                        Manage Account Identity &amp; Activity Logs
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-8">

                    {/* Account Info Card */}
                    <div className="glass-card p-8 border-thoth-border space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Lock size={14} className="text-thoth-primary" />
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--thoth-text-dim)' }}>
                                Account Credentials
                            </span>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--thoth-text-dim)' }}>Username</p>
                                <p className="text-lg font-black" style={{ color: 'var(--thoth-text)' }}>
                                    {user?.username || 'Unknown'}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--thoth-text-dim)' }}>
                                    Password Algorithm
                                </p>
                                <p className="text-xs font-mono text-thoth-primary">THOTH_SECURE_V1 (Argon2ID)</p>
                            </div>
                            <div className="pt-2">
                                <button className="text-[10px] font-black uppercase text-thoth-primary hover:bg-thoth-primary hover:text-white transition-all border border-thoth-primary/40 px-6 py-2.5 rounded-2xl">
                                    Rotate Password
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* API Key Card */}
                    <div className="glass-card p-8 border-thoth-border space-y-5">
                        <div className="flex items-center gap-2 mb-2">
                            <Key size={14} className="text-thoth-primary" />
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--thoth-text-dim)' }}>
                                LAN API Key
                            </span>
                        </div>

                        <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed" style={{ color: 'var(--thoth-text-dim)' }}>
                            Authenticate CLI clients or automation scripts with your local node.
                        </p>

                        <div onClick={handleCopy} className="relative group cursor-pointer">
                            <input
                                readOnly
                                type="password"
                                value={apiKey}
                                className="input-field cursor-pointer font-mono text-sm tracking-normal group-hover:border-thoth-primary/40 transition-all"
                            />
                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none opacity-0 group-hover:opacity-100 transition-all">
                                <Copy size={14} className="text-thoth-primary" />
                            </div>
                        </div>

                        <button
                            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest border"
                            style={{
                                backgroundColor: 'color-mix(in srgb, var(--thoth-text), transparent 95%)',
                                borderColor: 'var(--thoth-border)',
                                color: 'var(--thoth-text-dim)',
                            }}
                        >
                            <RefreshCw size={14} /> Rotate Access Key
                        </button>
                    </div>
                </div>

                {/* Copy success toast */}
                <AnimatePresence>
                    {copied && (
                        <motion.div
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200]"
                        >
                            <div className="glass px-8 py-4 rounded-2xl flex items-center gap-4 border-thoth-primary/40 shadow-[0_0_50px_rgba(59,130,246,0.2)]">
                                <div className="w-8 h-8 rounded-full bg-thoth-primary/20 flex items-center justify-center">
                                    <Check size={16} className="text-thoth-primary" />
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--thoth-text)' }}>
                                        API Key Copied
                                    </p>
                                    <p className="text-[9px] font-bold uppercase mt-0.5" style={{ color: 'var(--thoth-text-dim)' }}>
                                        Access key copied to clipboard
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Activity Logs */}
                <div className="lg:col-span-2 glass-card p-8 border-thoth-border relative overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                            <Activity size={14} className="text-thoth-primary" />
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--thoth-text-dim)' }}>
                                Activity Logs
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleClearLogs}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-all border border-red-500/10"
                                disabled={logs.length === 0 || loadingLogs}
                            >
                                <Trash2 size={14} /> Clear History
                            </button>
                            <button
                                onClick={() => {
                                    setLoadingLogs(true);
                                    api.get('/auth/logs').then(res => setLogs(res.data)).finally(() => setLoadingLogs(false));
                                }}
                                className="p-2 rounded-lg transition-colors hover:bg-thoth-primary/10"
                                style={{ color: 'var(--thoth-text-dim)' }}
                            >
                                <RefreshCw size={14} className={loadingLogs ? 'animate-spin text-thoth-primary' : ''} />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto pr-2 max-h-[600px] custom-scrollbar">
                        {logs.length === 0 && !loadingLogs ? (
                            <div className="h-full flex flex-col items-center justify-center py-20" style={{ color: 'var(--thoth-text-dim)', opacity: 0.4 }}>
                                <Activity size={48} />
                                <p className="text-xs font-black uppercase tracking-widest mt-4 italic text-center">
                                    No activity recorded yet.
                                </p>
                            </div>
                        ) : (
                            logs.map(log => (
                                <div
                                    key={log.id}
                                    className="p-4 rounded-2xl flex items-center justify-between group transition-all border"
                                    style={{
                                        backgroundColor: 'color-mix(in srgb, var(--thoth-text), transparent 97%)',
                                        borderColor: 'var(--thoth-border)',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--thoth-primary), transparent 94%)'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--thoth-text), transparent 97%)'}
                                >
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="p-3 rounded-xl border group-hover:scale-110 transition-transform"
                                            style={{
                                                backgroundColor: 'color-mix(in srgb, var(--thoth-primary), transparent 90%)',
                                                borderColor: 'var(--thoth-border)',
                                            }}
                                        >
                                            {log.action.includes('BULK')
                                                ? <Activity size={16} className="text-thoth-primary" />
                                                : <Monitor size={16} className="text-thoth-primary" />
                                            }
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-tighter" style={{ color: 'var(--thoth-text)' }}>
                                                {log.action}
                                            </p>
                                            <p className="text-[10px] font-medium truncate max-w-[200px] lg:max-w-md mt-1" style={{ color: 'var(--thoth-text-dim)' }}>
                                                {log.details}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-[9px] font-mono text-thoth-primary/80">{log.ip_address}</p>
                                        <p className="text-[10px] font-bold uppercase mt-1" style={{ color: 'var(--thoth-text-dim)' }}>
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>


        </motion.div>
    );
};

export default SecuritySettings;
