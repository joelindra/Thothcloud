import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Trash2, ShieldAlert } from 'lucide-react';

const ConfirmModal = ({ 
    isOpen, 
    title, 
    message, 
    onConfirm, 
    onCancel, 
    confirmText = "Confirm", 
    cancelText = "Cancel", 
    type = "danger",
    actions = [] // [{ label, onClick, className, icon }]
}) => {
    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 pointer-events-none">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        className="absolute inset-0 bg-thoth-bg/85 backdrop-blur-xl pointer-events-auto"
                    />

                    {/* Modal Content */}
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 30 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-md glass-card p-1 overflow-hidden pointer-events-auto shadow-[0_32px_128px_rgba(0,0,0,0.5)]"
                    >
                        {/* Danger Border Glow */}
                        <div className={`absolute inset-0 pointer-events-none opacity-20 ${type === 'danger' ? 'bg-red-500/20' : 'bg-thoth-primary/20'}`} />
                        
                        <div className="relative bg-thoth-card/95 p-8 lg:p-10 space-y-6 rounded-[1.9rem]">
                            <div className="flex flex-col items-center text-center space-y-5">
                                <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-2xl ${
                                    type === 'danger' ? 'bg-red-500/10 text-red-500 shadow-red-500/20 border border-red-500/20' : 'bg-thoth-primary/10 text-thoth-primary shadow-thoth-primary/20 border border-thoth-primary/20'
                                }`}>
                                    <AlertTriangle size={36} className="animate-pulse" />
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-2xl font-black text-thoth-text uppercase tracking-tighter italic leading-none">
                                        {title}
                                    </h3>
                                    <p className="text-xs text-thoth-text-dim font-bold leading-relaxed max-w-[340px] mx-auto opacity-70">
                                        {message}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4">
                                {actions.length > 0 ? (
                                    <div className="flex flex-col gap-2.5">
                                        {actions.map((action, idx) => (
                                            <button 
                                                key={idx}
                                                onClick={action.onClick}
                                                className={`py-4.5 px-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-[0.98] flex items-center justify-center gap-4 hover:brightness-110 shadow-lg ${
                                                    action.className || 'bg-thoth-text/5 text-thoth-text-dim border border-thoth-border'
                                                }`}
                                            >
                                                {action.icon}
                                                {action.label}
                                            </button>
                                        ))}
                                        <button 
                                            onClick={onCancel}
                                            className="py-4 text-[10px] font-black uppercase tracking-[0.3em] text-thoth-text-dim hover:text-thoth-text transition-all opacity-40 hover:opacity-100"
                                        >
                                            {cancelText} — ABORT
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <button 
                                            onClick={onCancel}
                                            className="py-5 bg-thoth-text/5 hover:bg-thoth-text/10 text-thoth-text-dim rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-[0.98] border border-thoth-border"
                                        >
                                            {cancelText}
                                        </button>
                                        <button 
                                            onClick={onConfirm}
                                            className={`py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-[0.98] shadow-2xl flex items-center justify-center gap-2 ${
                                                type === 'danger' 
                                                ? 'bg-red-600 text-white shadow-red-900/40' 
                                                : 'bg-thoth-primary hover:bg-blue-600 text-white shadow-thoth-primary/40'
                                            }`}
                                        >
                                            {confirmText}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Decorative Corner */}
                            <div className="absolute top-0 right-0 p-3">
                                <button onClick={onCancel} className="w-10 h-10 flex items-center justify-center rounded-xl bg-thoth-text/5 text-thoth-text-dim hover:text-red-500 hover:bg-red-500/10 transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};

export default ConfirmModal;
