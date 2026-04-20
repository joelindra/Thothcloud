import React, { useState, useEffect } from 'react';
import api from '../api';
import { Database, Server, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';

const StorageUsage = () => {
    const [stats, setStats] = useState(null);
    const TOTAL_CAPACITY = 100 * 1024 * 1024 * 1024;

    useEffect(() => {
        api.get('/files/stats').then(res => setStats(res.data)).catch(console.error);
    }, []);

    if (!stats) return null;

    const usedPercentage = (stats.total_size / TOTAL_CAPACITY) * 100;
    
    const formatSize = (bytes) => {
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes || 1) / Math.log(k));
        return parseFloat(((bytes || 0) / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <div className="p-4 rounded-3xl space-y-4 border" style={{
            backgroundColor: 'color-mix(in srgb, var(--thoth-text), transparent 97%)',
            borderColor: 'var(--thoth-border)',
        }}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Server size={14} className="text-thoth-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--thoth-text-dim)' }}>
                        Storage Usage
                    </span>
                </div>
                <span className="text-[10px] font-mono text-thoth-primary">{usedPercentage.toFixed(2)}%</span>
            </div>
            
            {/* Progress bar — width animation is OK here (it's a bar, not a layout element) */}
            <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'color-mix(in srgb, var(--thoth-text), transparent 92%)' }}>
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(usedPercentage, 2)}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-thoth-primary to-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.4)]"
                />
            </div>

            <div className="flex justify-between items-end">
                <div>
                    <p className="text-[8px] font-black uppercase tracking-tighter" style={{ color: 'var(--thoth-text-dim)' }}>Used Space</p>
                    <p className="text-xs font-mono font-bold" style={{ color: 'var(--thoth-text)' }}>{formatSize(stats.total_size)}</p>
                </div>
                <div className="text-right">
                    <p className="text-[8px] font-black uppercase tracking-tighter" style={{ color: 'var(--thoth-text-dim)' }}>Total Storage</p>
                    <p className="text-xs font-mono font-bold" style={{ color: 'var(--thoth-text-dim)' }}>100 GB</p>
                </div>
            </div>
        </div>
    );
};

export default StorageUsage;
