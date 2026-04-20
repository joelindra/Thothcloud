import React, { useState, useEffect } from 'react';
import { Database, FileText, HardDrive, PieChart, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api';

const DashboardStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/files/stats')
      .then(res => {
        setStats(res.data);
        setLoading(false);
      })
      .catch(err => console.error("Stats fetch failed", err));
  }, []);

  if (loading || !stats) return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-24 glass-card animate-pulse opacity-50" />
      ))}
    </div>
  );

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const statCards = [
    { label: 'Total Storage', value: formatSize(stats.total_size), icon: HardDrive, color: 'text-blue-400' },
    { label: 'File Count', value: stats.file_count, icon: FileText, color: 'text-purple-400' },
    { label: 'Storage Mode', value: 'Local (LAN)', icon: Database, color: 'text-green-400' },
    { label: 'System Status', value: 'Online', icon: Activity, color: 'text-orange-400' },
  ];

  return (
    <div className="space-y-6 mb-10">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut', delay: idx * 0.05 }}
            className="glass-card p-5 group hover:border-thoth-primary/20 transition-all cursor-default"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase text-thoth-text-dim tracking-widest">{card.label}</span>
              <card.icon size={16} className={`${card.color} opacity-40 group-hover:opacity-100 transition-opacity`} />
            </div>
            <div className="text-2xl font-black tracking-tighter text-thoth-text">
              {card.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Categorization Progress Bar */}
      <div className="glass-card p-6 border-thoth-border">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <PieChart size={14} className="text-thoth-primary" />
                <span className="text-[10px] font-black uppercase text-thoth-text-dim tracking-widest">Storage Distribution</span>
            </div>
            <span className="text-[10px] font-mono text-thoth-text-dim uppercase">Scan Complete</span>
        </div>
        
        <div className="h-3 w-full bg-thoth-text/5 rounded-full overflow-hidden flex">
            {Object.entries(stats.categories).map(([cat, count], idx) => (
                <motion.div
                  key={cat}
                  initial={{ width: 0 }}
                  animate={{ width: stats.file_count > 0 ? `${(count / stats.file_count) * 100}%` : '0%' }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                  className={`h-full ${
                    cat === 'Images' ? 'bg-blue-500' : 
                    cat === 'Documents' ? 'bg-purple-500' : 
                    cat === 'Media' ? 'bg-green-500' : 'bg-gray-500'
                  } border-r border-black/20`}
                />
            ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {Object.entries(stats.categories).map(([cat, count]) => (
                <div key={cat} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                        cat === 'Images' ? 'bg-blue-500' : 
                        cat === 'Documents' ? 'bg-purple-500' : 
                        cat === 'Media' ? 'bg-green-500' : 'bg-gray-500'
                    }`} />
                    <span className="text-xs font-bold text-thoth-text-dim capitalize">{cat}:</span>
                    <span className="text-xs font-black text-thoth-text">{count}</span>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
