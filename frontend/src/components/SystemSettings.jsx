import React, { useState, useEffect } from 'react';
import { 
    Settings, Palette, Zap, Layout, HardDrive, 
    Shield, Terminal, Save, RefreshCw, AlertTriangle, 
    Clock, Database, FolderOpen, ChevronRight, Home, X
} from 'lucide-react';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';

const PathBrowserModal = ({ currentPath, onSelect, onClose }) => {
    const [path, setPath] = useState(currentPath || "");
    const [directories, setDirectories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadPath(path);
    }, []);

    const loadPath = async (newPath) => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/settings/browse?path=${encodeURIComponent(newPath)}`);
            if (res.data.error) {
                setError(res.data.error);
            } else {
                setPath(res.data.current);
                setDirectories(res.data.directories);
            }
        } catch (err) {
            setError("Failed to access sector");
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        const parts = path.split(/[/\\]/).filter(Boolean);
        if (parts.length <= 1 && path.includes(':')) {
            loadPath(""); // Return to drives on Windows
        } else {
            parts.pop();
            const parent = (path.startsWith('/') ? '/' : '') + parts.join('/');
            loadPath(parent || "/");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-thoth-bg/80 backdrop-blur-sm">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card w-full max-w-xl overflow-hidden border-thoth-border flex flex-col max-h-[80vh]"
            >
                <div className="p-6 border-b border-thoth-border flex items-center justify-between bg-thoth-text/[0.02]">
                    <div className="flex items-center gap-3">
                        <FolderOpen className="text-thoth-primary" size={20} />
                        <h3 className="font-bold">Sector Navigator</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-thoth-text/5 text-thoth-text-dim hover:text-thoth-text rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 bg-thoth-text/[0.03] border-b border-thoth-border flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
                    <button onClick={() => loadPath("")} className="p-1.5 hover:bg-thoth-text/10 rounded-lg text-thoth-text-dim hover:text-thoth-text transition-all">
                        <Home size={16} />
                    </button>
                    <ChevronRight size={14} className="text-thoth-text-dim" />
                    <span className="text-xs font-mono text-thoth-primary bg-thoth-primary/10 px-3 py-1 rounded-full border border-thoth-primary/20">
                        {path || "Root"}
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar min-h-[300px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-thoth-text-dim">
                            <RefreshCw size={24} className="animate-spin text-thoth-primary" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Scanning Sectors...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-amber-500/80">
                            <AlertTriangle size={32} />
                            <p className="text-xs font-bold">{error}</p>
                            <button onClick={() => loadPath("")} className="px-4 py-2 bg-thoth-text/5 text-thoth-text-dim rounded-xl text-[10px] font-black uppercase">Re-initialize</button>
                        </div>
                    ) : (
                        <>
                            {path && !path.endsWith(':') && path !== '/' && (
                                <button 
                                    onClick={handleBack}
                                    className="w-full text-left p-3 hover:bg-thoth-text/5 rounded-xl transition-all text-xs font-bold text-thoth-text-dim hover:text-thoth-text flex items-center gap-3 group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-thoth-text/5 flex items-center justify-center group-hover:bg-thoth-text/10 transition-all">..</div>
                                    Parent Directory
                                </button>
                            )}
                            {directories.map(dir => (
                                <button
                                    key={dir}
                                    onClick={() => loadPath(path ? (path.endsWith('/') || path.endsWith('\\') ? path + dir : path + '/' + dir) : dir)}
                                    className="w-full text-left p-3 hover:bg-thoth-text/5 rounded-xl transition-all text-xs font-bold text-thoth-text flex items-center gap-3 group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-thoth-primary/10 text-thoth-primary flex items-center justify-center group-hover:bg-thoth-primary/20 transition-all">
                                        <FolderOpen size={14} />
                                    </div>
                                    {dir}
                                </button>
                            ))}
                            {directories.length === 0 && !loading && (
                                <div className="text-center py-10 text-thoth-text-dim italic text-xs">No subdirectories found</div>
                            )}
                        </>
                    )}
                </div>

                <div className="p-6 bg-thoth-text/[0.02] border-t border-thoth-border flex items-center justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-thoth-text-dim hover:text-thoth-text transition-all shadow-sm"
                    >
                        Abort
                    </button>
                    <button 
                        onClick={() => onSelect(path)}
                        className="px-8 py-2.5 bg-thoth-primary hover:bg-thoth-secondary rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-thoth-primary/20 flex items-center gap-2"
                    >
                        Confirm Sector <Save size={14} />
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const SystemSettings = () => {
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeCategory, setActiveCategory] = useState('appearance');
    const [showBrowser, setShowBrowser] = useState(false);
    const [browsingKey, setBrowsingKey] = useState(null);

    const categories = [
        { id: 'appearance', label: 'UI Visual', icon: Palette },
        { id: 'transmission', label: 'Transmissions', icon: Zap },
        { id: 'governance', label: 'Data Governance', icon: HardDrive },
        { id: 'security', label: 'Security Node', icon: Shield },
    ];

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await api.get('/settings/');
            setSettings(res.data);
        } catch (err) {
            console.error("Failed to load settings", err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (key, value) => {
        setSaving(true);
        try {
            await api.patch('/settings/', { key, value });
            setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
        } catch (err) {
            console.error("Update failed", err);
        } finally {
            setSaving(false);
        }
    };

    const filteredSettings = settings.filter(s => s.category === activeCategory);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <RefreshCw className="animate-spin text-thoth-primary" size={32} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-thoth-text-dim">Loading Settings...</p>
        </div>
    );

    return (
        <div className="space-y-8 max-w-5xl mx-auto relative">
            <AnimatePresence>
                {showBrowser && (
                    <PathBrowserModal 
                        currentPath={settings.find(s => s.key === browsingKey)?.value}
                        onClose={() => setShowBrowser(false)}
                        onSelect={(path) => {
                            handleUpdate(browsingKey, path);
                            setShowBrowser(false);
                        }}
                    />
                )}
            </AnimatePresence>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Side Nav */}
                <div className="w-full md:w-64 space-y-2">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all font-bold text-sm
                                ${activeCategory === cat.id 
                                    ? 'bg-thoth-primary/10 text-thoth-primary border border-thoth-primary/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                                    : 'text-thoth-text-dim hover:text-thoth-text hover:bg-thoth-primary/5'}`}
                        >
                            <cat.icon size={18} />
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1">
                    <motion.div 
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        key={activeCategory}
                        className="glass-card p-6 lg:p-10 space-y-8 border-thoth-border"
                    >
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-thoth-primary/10 flex items-center justify-center text-thoth-primary">
                                {(() => {
                                    const CategoryIcon = categories.find(c => c.id === activeCategory)?.icon;
                                    return CategoryIcon ? <CategoryIcon size={24} /> : null;
                                })()}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold capitalize">{activeCategory} Optimization</h3>
                                <p className="text-xs text-thoth-text-dim uppercase tracking-widest font-bold mt-1">Configure settings</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {filteredSettings.map(setting => (
                                <div key={setting.key} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-thoth-text/[0.02] border border-thoth-border hover:border-thoth-primary/30 transition-all">
                                    <div className="space-y-1">
                                        <p className="text-xs font-black text-thoth-text uppercase tracking-widest">{setting.key.replace(/_/g, ' ')}</p>
                                        <p className="text-[10px] text-thoth-text-dim font-bold">{setting.description}</p>
                                    </div>

                                    <div className="w-full sm:w-auto flex items-center gap-2">
                                        {setting.key === 'storage_path' && (
                                            <button 
                                                onClick={async () => {
                                                    try {
                                                        const res = await api.get('/settings/pick-folder');
                                                        if (res.data.path) {
                                                            handleUpdate(setting.key, res.data.path);
                                                        }
                                                    } catch (err) {
                                                        console.error("Native picker failed", err);
                                                        // Fallback in case backend doesn't support GUI
                                                        setBrowsingKey(setting.key); 
                                                        setShowBrowser(true);
                                                    }
                                                }}
                                                className="p-2 bg-thoth-primary/10 hover:bg-thoth-primary text-thoth-primary hover:text-white rounded-xl transition-all shadow-sm flex items-center gap-2 text-[8px] font-black uppercase tracking-tighter"
                                            >
                                                <FolderOpen size={14} /> Browse
                                            </button>
                                        )}

                                        {setting.key === 'ui_theme' ? (
                                            <select 
                                                value={setting.value}
                                                onChange={(e) => handleUpdate(setting.key, e.target.value)}
                                                className="bg-thoth-text/5 border border-thoth-border rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-thoth-primary transition-all w-full text-thoth-text"
                                            >
                                                <option value="Deep-Blue">Deep-Blue</option>
                                                <option value="Stellar-White">Stellar White</option>
                                            </select>
                                        ) : setting.key === 'ui_animations' ? (
                                            <div 
                                                onClick={() => handleUpdate(setting.key, setting.value === 'true' ? 'false' : 'true')}
                                                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all ${setting.value === 'true' ? 'bg-thoth-primary' : 'bg-thoth-text/20'}`}
                                            >
                                                <div className={`w-4 h-4 bg-white rounded-full transition-all ${setting.value === 'true' ? 'ml-6' : 'ml-0'}`} />
                                            </div>
                                        ) : setting.key === 'ui_density' ? (
                                            <div className="flex bg-thoth-text/5 p-1 rounded-xl border border-thoth-border">
                                                {['Compact', 'Comfortable'].map(opt => (
                                                    <button
                                                        key={opt}
                                                        onClick={() => handleUpdate(setting.key, opt)}
                                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                                                            ${setting.value === opt ? 'bg-thoth-primary text-white' : 'text-thoth-text-dim hover:text-thoth-text'}`}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : setting.key === 'assembly_priority' || setting.key === 'log_level' ? (
                                            <select 
                                                value={setting.value}
                                                onChange={(e) => handleUpdate(setting.key, e.target.value)}
                                                className="bg-thoth-text/5 border border-thoth-border rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-thoth-primary transition-all w-full text-thoth-text"
                                            >
                                                {setting.key === 'assembly_priority' ? (
                                                    ['Low', 'Normal', 'Turbo'].map(o => <option key={o} value={o}>{o}</option>)
                                                ) : (
                                                    ['Basic', 'Detailed', 'Debug'].map(o => <option key={o} value={o}>{o}</option>)
                                                )}
                                            </select>
                                        ) : (
                                            <input 
                                                type={setting.key.includes('size') || setting.key.includes('_alert') || setting.key.includes('days') || setting.key.includes('hours') || setting.key.includes('timeout') ? 'number' : 'text'}
                                                value={setting.value}
                                                onChange={(e) => handleUpdate(setting.key, e.target.value)}
                                                className="bg-thoth-text/5 border border-thoth-border rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-thoth-primary transition-all w-full sm:w-48 text-left text-thoth-text"
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-10 flex items-center justify-between border-t border-thoth-border">
                            <div className="flex items-center gap-3 text-thoth-text-dim">
                                <Info size={14} className="text-thoth-primary" />
                                <p className="text-[10px] font-bold uppercase tracking-widest">Changes are synchronized in real-time with the central node</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {saving ? (
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-thoth-primary">
                                        <RefreshCw size={12} className="animate-spin" /> Synchronizing...
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-green-500">
                                        <Save size={12} /> Securely Stored
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Warning Card for system paths */}
            <div className="glass-card p-6 border-amber-500/20 bg-amber-500/[0.02] flex items-center gap-4">
                <AlertTriangle className="text-amber-500 shrink-0" size={24} />
                <p className="text-xs font-bold text-amber-500/80 leading-relaxed">
                    CRITICAL WARNING: Modifying the <span className="text-amber-500 underline font-black">Storage Root Path</span> will require a manual file migration for existing assets. Incorrect paths may cause permanent neural thread fragmentation (data loss).
                </p>
            </div>
        </div>
    );
};

const Info = ({ size, className }) => <Database size={size} className={className} />;

export default SystemSettings;
