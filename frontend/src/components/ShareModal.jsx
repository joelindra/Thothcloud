import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Share2, Link as LinkIcon, Lock, Shield, Clock, DownloadCloud, RefreshCw } from 'lucide-react';
import QRCode from 'react-qr-code';
import api from '../api';

const SafeQRCode = QRCode.default || QRCode;

const ShareModal = ({ file, onClose }) => {
  const [shareLink, setShareLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Advanced Sharing Config
  const [config, setConfig] = useState({
    password: '',
    download_limit: '',
    expiry_days: 7
  });

  const generateUplink = async () => {
    setLoading(true);
    try {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + parseInt(config.expiry_days));

        const res = await api.post('/share/', { 
            file_id: file.id,
            password: config.password || null,
            download_limit: config.download_limit ? parseInt(config.download_limit) : null,
            expires_at: expiryDate.toISOString()
        });

        const backendUrl = `http://${window.location.hostname}:8000`;
        const fullLink = `${backendUrl}/share/download/${res.data.uuid}`;
        setShareLink(fullLink);
    } catch (err) {
        console.error("Failed to create share link", err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    generateUplink();
  }, [file.id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-thoth-bg/85 backdrop-blur-xl pointer-events-auto" 
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="glass-card p-1 shadow-[0_32px_128px_rgba(0,0,0,0.5)] relative w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 overflow-hidden pointer-events-auto"
        >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-thoth-primary to-transparent animate-pulse" />
        
        {/* Left Side: QR & Link */}
        <div className="bg-thoth-card p-8 lg:p-10 rounded-l-[1.9rem] flex flex-col items-center relative border-r border-thoth-border">
            <div className="bg-thoth-primary/10 p-5 rounded-3xl mb-6 shadow-inner border border-thoth-primary/20">
                <Share2 size={32} className="text-thoth-primary" />
            </div>
            
            <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-thoth-text tracking-tighter italic uppercase">Neural Uplink</h2>
                <div className="flex items-center justify-center gap-2 mt-2">
                    <div className={`w-2 h-2 rounded-full ${loading ? 'bg-orange-500 animate-pulse' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'}`} />
                    <span className="text-[10px] font-black text-thoth-text-dim uppercase tracking-[0.2em]">
                        {loading ? 'Re-establishing Tunnel...' : 'Uplink Optimized'}
                    </span>
                </div>
            </div>

            <div className="flex justify-center group mb-8">
                <div className="bg-white p-5 rounded-[2.5rem] shadow-2xl relative select-none">
                    <div className="absolute inset-0 bg-thoth-primary/20 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" />
                    {shareLink && !loading ? (
                        <SafeQRCode 
                            value={shareLink} 
                            size={160}
                            bgColor="#ffffff"
                            fgColor="#050505"
                            level="H"
                        />
                    ) : (
                        <div className="w-[160px] h-[160px] flex items-center justify-center bg-gray-100 rounded-2xl animate-pulse">
                            <RefreshCw size={32} className="text-gray-300 animate-spin" />
                        </div>
                    )}
                </div>
            </div>

            <div className="w-full space-y-4">
                <div className="relative group">
                    <div className="relative flex items-center bg-thoth-text/[0.02] border border-thoth-border rounded-2xl p-1.5 pl-4 pr-1.5">
                        <LinkIcon size={14} className="text-gray-600" />
                        <input 
                            readOnly
                            value={shareLink}
                            className="bg-transparent border-none outline-none text-[10px] font-mono text-thoth-text-dim w-full px-3 truncate"
                            placeholder="Initializing..."
                        />
                        <button 
                            onClick={handleCopy}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${
                                copied ? 'bg-green-600 text-white' : 'bg-thoth-primary hover:bg-blue-600 text-white'
                            }`}
                        >
                            {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Right Side: Advanced Config */}
        <div className="bg-thoth-card p-8 lg:p-10 rounded-r-[1.9rem] relative flex flex-col">
            <button 
                onClick={onClose}
                className="absolute top-6 right-6 text-thoth-text-dim hover:text-thoth-text transition-colors"
            >
                <X size={20} />
            </button>

            <h3 className="text-[10px] font-black text-thoth-text-dim uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                <Shield size={14} className="text-thoth-primary" /> Security Parameters
            </h3>

            <div className="space-y-6 flex-1">
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-thoth-text-dim uppercase tracking-widest flex items-center gap-2">
                        <Lock size={12} /> Neural Encryption (Password)
                    </label>
                    <input 
                        type="password"
                        placeholder="Leave blank for public..."
                        className="input-field w-full text-xs"
                        value={config.password}
                        onChange={e => setConfig({...config, password: e.target.value})}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-thoth-text-dim uppercase tracking-widest flex items-center gap-2">
                            <DownloadCloud size={12} /> Limit
                        </label>
                        <input 
                            type="number"
                            placeholder="Unlimited"
                            className="input-field w-full text-xs"
                            value={config.download_limit}
                            onChange={e => setConfig({...config, download_limit: e.target.value})}
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-thoth-text-dim uppercase tracking-widest flex items-center gap-2">
                            <Clock size={12} /> Expiry
                        </label>
                        <select 
                            className="input-field w-full text-xs"
                            value={config.expiry_days}
                            onChange={e => setConfig({...config, expiry_days: e.target.value})}
                        >
                            <option value="1">24 Hours</option>
                            <option value="7">7 Days</option>
                            <option value="30">30 Days</option>
                            <option value="0">Never (Unsafe)</option>
                        </select>
                    </div>
                </div>

                <div className="bg-thoth-text/5 rounded-2xl p-6 border border-thoth-border mt-8">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-500/10 p-3 rounded-2xl">
                            <Shield className="text-blue-500" size={20} />
                        </div>
                        <div>
                            <p className="text-thoth-text font-bold text-xs">Dynamic Shielding Enabled</p>
                            <p className="text-[9px] text-thoth-text-dim font-bold uppercase tracking-widest mt-1">Updates applied in real-time to tunnel</p>
                        </div>
                    </div>
                </div>
            </div>

            <button 
                onClick={generateUplink}
                className="btn-primary w-full py-4 mt-8 uppercase tracking-widest font-black text-xs"
            >
                {loading ? 'Reconfiguring Tunnel...' : 'Apply Security Parameters'}
            </button>
        </div>
      </motion.div>
    </div>
  </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};

export default ShareModal;
