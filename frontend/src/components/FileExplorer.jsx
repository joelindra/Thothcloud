import React, { useState, useEffect, useCallback } from 'react';
import { 
  Folder, File, Trash2, Download, ChevronRight, HardDrive, Plus, Eye, Share2, 
  FileImage, FileVideo, FileAudio, FileText, FileCode, Archive, CheckSquare, 
  Square, X, ArrowLeft, RefreshCw, MoreVertical, Edit2, Move, Shield, Calendar, ShieldAlert
} from 'lucide-react';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardStats from './DashboardStats';
import ShareModal from './ShareModal';
import FilePreview from './FilePreview';
import ConfirmModal from './ConfirmModal';

const FileIcon = ({ mimeType, className }) => {
    if (mimeType.startsWith('image/')) return <FileImage className={`${className} text-rose-400`} size={20} />;
    if (mimeType.startsWith('video/')) return <FileVideo className={`${className} text-amber-400`} size={20} />;
    if (mimeType.startsWith('audio/')) return <FileAudio className={`${className} text-emerald-400`} size={20} />;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return <FileText className={`${className} text-blue-400`} size={20} />;
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) return <Archive className={`${className} text-purple-400`} size={20} />;
    if (mimeType.includes('javascript') || mimeType.includes('python') || mimeType.includes('html')) return <FileCode className={`${className} text-indigo-400`} size={20} />;
    return <File className={`${className} text-thoth-primary`} size={20} />;
};

const FileExplorer = ({ folderId, onFolderChange, mode = 'all', folderName = 'Home', searchData }) => {
  const [items, setItems] = useState({ files: [], folders: [] });
  const [loading, setLoading] = useState(true);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  
  // Selection States
  const [selected, setSelected] = useState({ files: [], folders: [] });
  const [isTrashMode, setIsTrashMode] = useState(false);
  const [renamingItem, setRenamingItem] = useState(null); // {id, name, type}
  const [openMenu, setOpenMenu] = useState(null); // active folderId for action menu
  
  // Pro States
  const [previewFile, setPreviewFile] = useState(null);
  const [sharingFile, setSharingFile] = useState(null);
  const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'danger' });

  const fetchItems = useCallback(async () => {
    if (mode === 'search') {
        setItems({ files: searchData || [], folders: [] });
        setLoading(false);
        return;
    }

    setLoading(true);
    try {
      let filesRes, foldersRes;
      
      if (isTrashMode) {
        [filesRes, foldersRes] = await Promise.all([
            api.get('/files/trash'),
            api.get('/files/trash/folders')
        ]);
      } else if (mode === 'shared') {
        filesRes = await api.get('/share/links');
        foldersRes = { data: [] };
      } else if (mode === 'recent') {
        filesRes = await api.get('/files/recent');
        foldersRes = { data: [] };
      } else {
        [filesRes, foldersRes] = await Promise.all([
          api.get('/files/list', { params: { folder_id: folderId } }),
          api.get('/files/folders', { params: { parent_id: folderId } })
        ]);
        
        if (folderId) {
            const bcRes = await api.get(`/files/breadcrumbs/${folderId}`);
            setBreadcrumbs(bcRes.data);
        } else {
            setBreadcrumbs([]);
        }
      }
      
      setItems({ files: filesRes.data, folders: foldersRes.data });
      setSelected({ files: [], folders: [] });
    } catch (error) {
      console.error("Failed to fetch items", error);
    } finally {
      setLoading(false);
    }
  }, [folderId, mode, searchData, isTrashMode]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const toggleSelect = (id, type) => {
    setSelected(prev => {
        const list = [...prev[type]];
        const index = list.indexOf(id);
        if (index > -1) {
            list.splice(index, 1);
        } else {
            list.push(id);
        }
        return { ...prev, [type]: list };
    });
  };

  const handleBulkAction = async (action) => {
    const isRestore = action === 'restore';
    const isPurge = action === 'purge';
    const isDelete = action === 'delete';
    
    // If not in trash mode and deleting, provide choice
    if (!isTrashMode && isDelete && mode === 'all') {
        setConfirmState({
            isOpen: true,
            title: 'Bulk Deletion Choice',
            message: `How would you like to handle the ${totalSelected} selected items?`,
            type: 'danger',
            actions: [
                {
                    label: 'Move to Trash',
                    icon: <Trash2 size={16} />,
                    className: 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/10',
                    onClick: async () => {
                        try {
                            await api.post('/files/bulk-action', { file_ids: selected.files, folder_ids: selected.folders }, { params: { action: 'delete' } });
                            fetchItems();
                            setSelected({ files: [], folders: [] });
                        } catch (err) {
                            alert(err.response?.data?.detail || "Action failed");
                        } finally {
                            setConfirmState(p => ({ ...p, isOpen: false }));
                        }
                    }
                },
                {
                    label: 'Permanently Purge',
                    icon: <ShieldAlert size={16} />,
                    className: 'bg-red-500/80 text-white hover:bg-red-600 shadow-lg shadow-red-500/20',
                    onClick: async () => {
                        try {
                            await api.post('/files/bulk-action', { file_ids: selected.files, folder_ids: selected.folders }, { params: { action: 'purge' } });
                            fetchItems();
                            setSelected({ files: [], folders: [] });
                        } catch (err) {
                            alert(err.response?.data?.detail || "Purge failed");
                        } finally {
                            setConfirmState(p => ({ ...p, isOpen: false }));
                        }
                    }
                }
            ]
        });
        return;
    }

    setConfirmState({
        isOpen: true,
        title: isPurge ? 'Permanent Delete' : (isRestore ? 'Restore Files' : 'Move to Trash'),
        message: isPurge 
            ? 'DANGER: This will permanently delete selected items. This action is IRREVERSIBLE.'
            : isDelete 
                ? 'Selected items will be moved to the Trash. Proceed?' 
                : 'Restore selected files to their original location?',
        type: (isPurge || isDelete) ? 'danger' : 'info',
        onConfirm: async () => {
            try {
                if (mode === 'shared' && action === 'delete') {
                    await api.post('/share/bulk-unshare', { 
                        file_ids: selected.files, 
                        folder_ids: selected.folders 
                    });
                } else {
                    await api.post('/files/bulk-action', { 
                        file_ids: selected.files, 
                        folder_ids: selected.folders 
                    }, { params: { action } });
                }
                fetchItems();
                setSelected({ files: [], folders: [] });
            } catch (err) {
                alert(err.response?.data?.detail || "Bulk action failed");
            } finally {
                setConfirmState(p => ({ ...p, isOpen: false }));
            }
        }
    });
  };

  const handleRename = async (e) => {
    e.preventDefault();
    if (!renamingItem || !renamingItem.newName) return;
    try {
        if (renamingItem.type === 'file') {
            await api.patch(`/files/${renamingItem.id}`, { name: renamingItem.newName });
        } else {
            await api.patch(`/files/folders/${renamingItem.id}`, { name: renamingItem.newName });
        }
        setRenamingItem(null);
        fetchItems();
    } catch (err) {
        console.error("Rename failed", err);
    }
  };

  const handleDelete = (id, isFolder) => {
    const isSharedMode = mode === 'shared';
    
    // Provide choice when in main storage and not sharing
    if (!isTrashMode && !isSharedMode) {
        setConfirmState({
            isOpen: true,
            title: `Terminal Termination: ${isFolder ? 'Sector' : 'Unit'}`,
            message: `Choose the destruction protocol for this ${isFolder ? 'data sector' : 'binary unit'}.`,
            type: 'danger',
            actions: [
                {
                    label: 'Relocate to Trash',
                    icon: <Trash2 size={16} />,
                    className: 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/10',
                    onClick: async () => {
                        try {
                            if (isFolder) await api.delete(`/files/folders/${id}`);
                            else await api.delete(`/files/${id}`);
                            fetchItems();
                        } catch (err) {
                            alert(err.response?.data?.detail || "Movement failed");
                        } finally {
                            setConfirmState(p => ({ ...p, isOpen: false }));
                        }
                    }
                },
                {
                    label: 'Absolute Purge',
                    icon: <ShieldAlert size={16} />,
                    className: 'bg-red-500/80 text-white hover:bg-red-600 shadow-lg shadow-red-500/20',
                    onClick: async () => {
                        try {
                            if (isFolder) await api.delete(`/files/folders/purge/${id}`);
                            else await api.delete(`/files/purge/${id}`);
                            fetchItems();
                        } catch (err) {
                            alert(err.response?.data?.detail || "Purge malfunction");
                        } finally {
                            setConfirmState(p => ({ ...p, isOpen: false }));
                        }
                    }
                }
            ]
        });
        return;
    }

    const title = isTrashMode ? 'Permanently Delete' : (isSharedMode ? 'Remove Share Link' : 'Move to Trash');
    const msg = isTrashMode 
        ? 'WARNING: This will permanently delete this item from the mainframe. This action is irreversible.'
        : isSharedMode 
            ? 'Are you sure you want to remove this share link? The original file will remain in your storage.'
            : 'The item will be moved to the Trash. You can restore it later.';

    setConfirmState({
        isOpen: true,
        title,
        message: msg,
        type: isSharedMode ? 'info' : 'danger',
        onConfirm: async () => {
            try {
                if (isTrashMode) {
                    if (isFolder) await api.delete(`/files/folders/purge/${id}`);
                    else await api.delete(`/files/purge/${id}`);
                } else if (isSharedMode) {
                    await api.delete(`/share/links/${id}`);
                } else {
                    if (isFolder) await api.delete(`/files/folders/${id}`);
                    else await api.delete(`/files/${id}`);
                }
                fetchItems();
            } catch (error) {
                alert(error.response?.data?.detail || "Operation failed");
            } finally {
                setConfirmState(prev => ({ ...prev, isOpen: false }));
            }
        }
    });
  };

  const handleDownload = (id, name) => {
    const token = localStorage.getItem('token');
    window.open(`${window.location.origin}/api/files/download/${id}?token=${token}`, '_blank');
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalSelected = selected.files.length + selected.folders.length;

  return (
    <div className="space-y-10 pb-32">
      {!folderId && mode === 'all' && !isTrashMode && <DashboardStats />}

      <div className="space-y-6">
        {/* Top Header & Breadcrumbs */}
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isTrashMode ? 'bg-red-500/10 text-red-500' : 'bg-thoth-primary/10 text-thoth-primary'}`}>
                                <HardDrive size={18} /> 
                            </div>
                            <h2 className="text-sm font-black uppercase tracking-[0.2em]">
                                {mode === 'search' ? 'Search Results' : 
                                mode === 'shared' ? 'Public Links' : 
                                mode === 'recent' ? 'Recent Files' : 
                                isTrashMode ? 'Trash' : 'My Storage'}
                            </h2>
                        </div>
                        
                        {!isTrashMode && mode === 'all' && (
                            <div className="flex items-center gap-2 bg-thoth-text/5 border border-thoth-border px-3 py-2 rounded-2xl glass overflow-x-auto no-scrollbar max-w-[200px] sm:max-w-none">
                                <button 
                                    onClick={() => onFolderChange(null, 'Home')}
                                    className={`text-[9px] font-black uppercase transition-colors shrink-0 ${!folderId ? 'text-thoth-primary' : 'text-thoth-text-dim hover:text-thoth-text'}`}
                                >
                                    Home
                                </button>
                                {breadcrumbs.map(crumb => (
                                    <React.Fragment key={crumb.id}>
                                        <ChevronRight size={10} className="text-thoth-text-dim/30 shrink-0" />
                                        <button 
                                            onClick={() => onFolderChange(crumb.id, crumb.name)}
                                            className={`text-[9px] font-black uppercase transition-colors whitespace-nowrap shrink-0 ${folderId === crumb.id ? 'text-thoth-text' : 'text-thoth-text-dim hover:text-thoth-text'}`}
                                        >
                                            {crumb.name}
                                        </button>
                                    </React.Fragment>
                                ))}
                            </div>
                        )}
                    </div>
                
                <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                    {mode === 'all' && (
                        <>
                            <button 
                                onClick={() => setIsTrashMode(!isTrashMode)}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest ${isTrashMode ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-thoth-text/[0.03] border-thoth-border text-thoth-text-dim hover:text-thoth-text hover:bg-thoth-text/5'}`}
                            >
                                <Trash2 size={16} /> {isTrashMode ? 'Back to Storage' : 'Trash'}
                            </button>

                            {/* Select All — only shown in Trash mode */}
                            {isTrashMode && (items.files.length > 0 || items.folders.length > 0) && (() => {
                                const allSelected =
                                    items.files.every(f => selected.files.includes(f.id)) &&
                                    items.folders.every(f => selected.folders.includes(f.id));
                                return (
                                    <button
                                        onClick={() => {
                                            if (allSelected) {
                                                setSelected({ files: [], folders: [] });
                                            } else {
                                                setSelected({
                                                    files: items.files.map(f => f.id),
                                                    folders: items.folders.map(f => f.id),
                                                });
                                            }
                                        }}
                                        className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest ${
                                            allSelected
                                                ? 'bg-amber-500/15 border-amber-500/30 text-amber-500'
                                                : 'bg-thoth-text/[0.03] border-thoth-border text-thoth-text-dim hover:text-amber-500 hover:bg-amber-500/10 hover:border-amber-500/20'
                                        }`}
                                    >
                                        {allSelected
                                            ? <><X size={16} /> Deselect All</>
                                            : <><CheckSquare size={16} /> Select All</>
                                        }
                                    </button>
                                );
                            })()}

                            {!isTrashMode && (
                                <button 
                                    onClick={() => setShowNewFolder(true)}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-thoth-text/[0.03] hover:bg-thoth-text/5 border border-thoth-border rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest text-thoth-text-dim hover:text-thoth-text glow-on-hover"
                                >
                                    <Plus size={16} className="text-thoth-primary" /> New Folder
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>

        <AnimatePresence>
            {showNewFolder && (
                <motion.form 
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newFolderName) return;
                    await api.post('/files/folders', { name: newFolderName, parent_id: folderId });
                    setNewFolderName('');
                    setShowNewFolder(false);
                    fetchItems();
                }} 
                className="glass-card p-6 flex gap-3"
                >
                    <input 
                        autoFocus
                        className="input-field flex-1" 
                        placeholder="Folder name..." 
                        value={newFolderName}
                        onChange={e => setNewFolderName(e.target.value)}
                    />
                    <button type="submit" className="btn-primary px-8">Create</button>
                    <button type="button" onClick={() => setShowNewFolder(false)} className="px-4 hover:text-red-400 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--thoth-text-dim)' }}>Cancel</button>
                </motion.form>
            )}
        </AnimatePresence>

        {/* Folders Card */}
        {!loading && items.folders.length > 0 && (
            <div className="glass-card p-6 lg:p-8 space-y-6 border-thoth-border">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Folder className="text-amber-500" size={18} />
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-thoth-text-dim">Folders</h3>
                    </div>
                    <span className="text-[10px] font-bold text-thoth-text-dim uppercase tracking-widest">{items.folders.length} Folder(s)</span>
                </div>
                
                <div className="space-y-2">
                    {/* Header for Folders List */}
                    <div className="hidden lg:grid grid-cols-[1fr_160px_160px_160px_40px] items-center gap-4 px-8 py-3 text-[9px] font-black text-thoth-text-dim uppercase tracking-[0.3em] border-b border-thoth-border bg-thoth-text/[0.02]">
                        <div className="pl-12">Name</div>
                        <div>Files</div>
                        <div>Size</div>
                        <div>Date</div>
                        <div className="text-right" />
                    </div>

                    {items.folders.map(folder => (
                        <React.Fragment key={folder.id}>
                            <motion.div 
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.16, ease: 'easeOut' }}
                                onClick={() => onFolderChange(folder.id, folder.name)}
                                className={`p-4 lg:px-8 cursor-pointer rounded-2xl bg-thoth-text/[0.01] border border-thoth-border flex flex-col lg:grid lg:grid-cols-[1fr_160px_160px_160px_40px] items-start lg:items-center group transition-all duration-200 gap-3 lg:gap-4 hover:bg-thoth-primary/5 hover:border-thoth-primary/20 ${selected.folders.includes(folder.id) ? 'border-thoth-primary/50 bg-thoth-primary/5' : ''}`}
                            >
                                <div className="flex items-center gap-3 lg:gap-4 w-full min-w-0">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); toggleSelect(folder.id, 'folders'); }}
                                        className={`transition-all duration-300 shrink-0 ${selected.folders.includes(folder.id) ? 'text-thoth-primary' : 'text-thoth-text-dim/40 opacity-0 group-hover:opacity-100'}`}
                                    >
                                        {selected.folders.includes(folder.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                    </button>
                                    <div className="bg-amber-500/10 p-2.5 rounded-xl group-hover:bg-amber-500/20 transition-all shrink-0 border border-amber-500/5">
                                        <Folder className="text-amber-500" size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {renamingItem?.id === folder.id && renamingItem?.type === 'folder' ? (
                                            <form onSubmit={handleRename} onClick={e => e.stopPropagation()}>
                                                <input 
                                                    autoFocus
                                                    className="bg-transparent border-b border-thoth-primary outline-none text-sm font-bold w-full text-white"
                                                    value={renamingItem.newName}
                                                    onChange={e => setRenamingItem({...renamingItem, newName: e.target.value})}
                                                    onBlur={() => setRenamingItem(null)}
                                                />
                                            </form>
                                        ) : (
                                            <h4 className="font-bold text-thoth-text group-hover:text-thoth-primary transition-colors truncate tracking-tighter text-sm">{folder.name}</h4>
                                        )}
                                    </div>
                                </div>

                                 <div className="flex items-center justify-between w-full lg:contents">
                                    <div className="flex items-center gap-4 lg:gap-0 lg:contents">
                                        <div className="flex items-center gap-1.5 lg:gap-2">
                                            <div className="w-1 h-3 bg-amber-500/30 rounded-full lg:hidden" />
                                            <span className="text-[10px] font-bold text-thoth-text-dim uppercase tracking-widest">{folder.file_count || 0} Files</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-thoth-text-dim">
                                            <HardDrive size={12} className="opacity-40" />
                                            <span className="text-[10px] font-mono font-bold">{formatSize(folder.total_size || 0)}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="lg:hidden flex items-center">
                                         <button 
                                            onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === folder.id ? null : folder.id); }}
                                            className={`p-2.5 rounded-xl transition-all ${openMenu === folder.id ? 'bg-thoth-primary/20 text-thoth-primary rotate-180' : 'bg-thoth-text/5 text-thoth-text-dim'}`}
                                        >
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="relative hidden lg:block">
                                    <AnimatePresence mode="wait">
                                        {openMenu === folder.id ? (
                                            <motion.div 
                                                key="actions"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                className="flex items-center gap-1 justify-end"
                                            >
                                                {!isTrashMode && (
                                                    <>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (folder.is_locked) {
                                                                    alert("Folder is LOCKED. Unlock to rename.");
                                                                    return;
                                                                }
                                                                setRenamingItem({ id: folder.id, newName: folder.name, type: 'folder' });
                                                            }} 
                                                            className={`p-2 rounded-lg transition-all ${folder.is_locked ? 'text-thoth-text-dim/40 cursor-not-allowed' : 'text-thoth-text-dim hover:text-thoth-text'}`} 
                                                            title="Rename"
                                                        >
                                                            <Edit2 size={13} />
                                                        </button>
                                                        <button 
                                                            onClick={async (e) => { 
                                                                e.stopPropagation(); 
                                                                try {
                                                                    await api.post(`/files/folders/${folder.id}/toggle-lock`);
                                                                    fetchItems();
                                                                } catch(err) { console.error(err); }
                                                            }} 
                                                            className={`p-2 rounded-lg transition-all ${folder.is_locked ? 'text-amber-500 bg-amber-500/10' : 'text-thoth-text-dim hover:text-thoth-primary'}`} 
                                                            title={folder.is_locked ? "Unlock" : "Lock"}
                                                        >
                                                            <Shield size={13} fill={folder.is_locked ? "currentColor" : "none"} />
                                                        </button>
                                                    </>
                                                )}
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        if (folder.is_locked) {
                                                            alert("ACTION BLOCKED: Folder is LOCKED. Unlock before deleting.");
                                                            return;
                                                        }
                                                        handleDelete(folder.id, true); 
                                                    }} 
                                                    className={`p-2 rounded-lg transition-all ${folder.is_locked ? 'text-thoth-text-dim/20 cursor-not-allowed' : 'text-thoth-text-dim hover:text-red-500'}`} 
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </motion.div>
                                        ) : (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[10px] font-bold text-thoth-text-dim uppercase tracking-widest text-right">
                                                {new Date(folder.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                
                                 <div className="hidden lg:flex justify-end">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === folder.id ? null : folder.id); }}
                                        className={`p-2 rounded-lg transition-all ${openMenu === folder.id ? 'bg-thoth-primary/20 text-thoth-primary rotate-180' : 'text-thoth-text-dim hover:text-thoth-text hover:bg-thoth-text/5'}`}
                                    >
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </motion.div>
                            
                            <AnimatePresence>
                                {openMenu === folder.id && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="lg:hidden overflow-hidden bg-thoth-text/[0.02] rounded-2xl border border-thoth-border -mt-1 mx-2 mb-2 p-4 flex items-center justify-around gap-2"
                                    >
                                        {!isTrashMode ? (
                                            <>
                                                <button onClick={(e) => { e.stopPropagation(); setRenamingItem({ id: folder.id, newName: folder.name, type: 'folder' }); }} className="flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl bg-thoth-text/5 text-thoth-text-dim hover:text-thoth-text transition-all">
                                                    <Edit2 size={18} />
                                                    <span className="text-[8px] font-black uppercase tracking-widest">Rename</span>
                                                </button>
                                                <button onClick={async (e) => { e.stopPropagation(); try { await api.post(`/files/folders/${folder.id}/toggle-lock`); fetchItems(); } catch(err) {} }} className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl bg-thoth-text/5 transition-all ${folder.is_locked ? 'text-amber-500 bg-amber-500/10' : 'text-thoth-text-dim'}`}>
                                                    <Shield size={18} />
                                                    <span className="text-[8px] font-black uppercase tracking-widest">{folder.is_locked ? 'Unlock' : 'Lock'}</span>
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(folder.id, true); }} className="flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl bg-red-500/5 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 transition-all">
                                                    <Trash2 size={18} />
                                                    <span className="text-[8px] font-black uppercase tracking-widest">Delete</span>
                                                </button>
                                            </>
                                        ) : (
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(folder.id, true); }} className="w-full flex flex-col items-center gap-1.5 p-4 rounded-xl bg-red-500/10 text-red-500 transition-all">
                                                <Trash2 size={20} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Delete Forever</span>
                                            </button>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </React.Fragment>
                    ))}
                </div>
            </div>
        )}

        {/* Files Area */}
        <div className="space-y-4">
            <div className="space-y-2">
                <div className="hidden lg:grid grid-cols-[1fr_120px_160px_200px] items-center gap-4 px-8 py-3 text-[9px] font-black text-thoth-text-dim uppercase tracking-[0.3em] border-b border-thoth-border bg-thoth-text/[0.01]">
                    <div className="pl-12">Name</div>
                    <div>Size</div>
                    <div>{isTrashMode ? 'Deleted Date' : 'Upload Date'}</div>
                    <div className="text-right pr-4">Actions</div>
                </div>

                {loading ? (
                    [...Array(5)].map((_, i) => (
                        <div key={i} className="p-6 glass-card animate-pulse border-white/5 h-20" />
                    ))
                ) : (
                    <>
                        {items.files.length === 0 && (
                            <div className="p-24 glass-card border-dashed border-thoth-border flex flex-col items-center gap-4 opacity-20">
                                <HardDrive size={48} />
                                <p className="italic text-sm font-medium">No files found here.</p>
                            </div>
                        )}
                        {items.files.map(file => (
                            <React.Fragment key={file.id}>
                                <motion.div 
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.14, ease: 'easeOut' }}
                                    className={`p-4 lg:px-8 rounded-[1.25rem] bg-thoth-text/[0.01] border border-thoth-border flex flex-col lg:grid lg:grid-cols-[1fr_120px_160px_200px] items-start lg:items-center group transition-all duration-300 gap-3 lg:gap-4 hover:bg-thoth-primary/5 hover:border-thoth-primary/20 ${selected.files.includes(file.id) ? 'border-thoth-primary/50 bg-thoth-primary/5' : ''}`}
                                >
                                    <div className="flex items-center gap-4 w-full min-w-0">
                                        <div className="relative shrink-0 flex items-center">
                                            <button 
                                                onClick={() => toggleSelect(file.id, 'files')}
                                                className={`absolute -top-2 -left-2 z-10 p-1 rounded-lg transition-all duration-300 bg-thoth-bg border shadow-sm ${selected.files.includes(file.id) ? 'text-thoth-primary border-thoth-primary scale-110 opacity-100' : 'text-thoth-text-dim/30 border-thoth-border opacity-0 group-hover:opacity-100 hover:text-thoth-primary'}`}
                                            >
                                                {selected.files.includes(file.id) ? <CheckSquare size={12} strokeWidth={3} /> : <Square size={12} />}
                                            </button>
                                            
                                            <div className="bg-thoth-text/[0.03] border border-thoth-border p-3 rounded-2xl group-hover:bg-thoth-primary/10 transition-all duration-500 shadow-inner shrink-0 leading-none">
                                                <FileIcon mimeType={file.mime_type} className="group-hover:scale-110 transition-transform duration-500" />
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0 py-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    {renamingItem?.id === file.id && renamingItem?.type === 'file' ? (
                                                        <form onSubmit={handleRename} onClick={e => e.stopPropagation()}>
                                                            <input 
                                                                autoFocus
                                                                className="bg-transparent border-b-2 border-thoth-primary outline-none text-sm font-bold w-full text-white mb-1"
                                                                value={renamingItem.newName}
                                                                onChange={e => setRenamingItem({...renamingItem, newName: e.target.value})}
                                                                onBlur={() => setRenamingItem(null)}
                                                            />
                                                        </form>
                                                    ) : (
                                                        <p className="font-bold text-[14px] text-thoth-text group-hover:text-thoth-primary transition-colors truncate tracking-[-0.01em] mb-0.5">{file.name}</p>
                                                    )}
                                                </div>
                                                
                                                <div className="lg:hidden flex items-center shrink-0">
                                                     <button 
                                                        onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === file.id ? null : file.id); }}
                                                        className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${openMenu === file.id ? 'bg-thoth-primary/20 text-thoth-primary rotate-180' : 'bg-thoth-text/5 text-thoth-text-dim hover:text-thoth-primary'}`}
                                                    >
                                                        <ChevronRight size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-black text-thoth-text-dim/60 uppercase tracking-widest">{file.mime_type.split('/')[1] || 'BINARY'} DATA</span>
                                                <span className="w-1 h-1 rounded-full bg-thoth-border" />
                                                <div className="flex items-center gap-1.5 text-thoth-text-dim">
                                                    <span className="text-[10px] font-mono font-bold">{formatSize(file.size)}</span>
                                                </div>
                                                <span className="w-1 h-1 rounded-full bg-thoth-border" />
                                                <div className="flex items-center gap-1.5 text-thoth-text-dim">
                                                    <span className="text-[10px] font-bold uppercase tracking-tight">
                                                        {new Date(isTrashMode ? file.deleted_at : file.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                     <div className="hidden lg:contents">
                                        <div className="flex items-center gap-4 lg:gap-0 lg:contents">
                                            <div className="flex items-center gap-2 text-thoth-text-dim min-w-[70px]">
                                                <span className="text-[10px] font-mono font-medium">{formatSize(file.size)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-thoth-text-dim">
                                                <span className="text-[10px] font-medium tracking-normal">
                                                    {new Date(isTrashMode ? file.deleted_at : file.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto">
                                            <div className="flex items-center gap-1 bg-thoth-text/5 p-1 rounded-xl border border-thoth-border">
                                                {isTrashMode ? (
                                                    <>
                                                        <button onClick={() => { api.post('/files/bulk-action', { file_ids: [file.id], folder_ids: [] }, { params: { action: 'restore' } }).then(fetchItems); }} className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg" title="Restore"><RefreshCw size={14} /></button>
                                                        <button onClick={() => handleDelete(file.id, false)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg" title="Delete Forever"><Trash2 size={16} /></button>
                                                    </>
                                                ) : (
                                                    [
                                                        { icon: Eye, color: 'text-thoth-primary hover:bg-thoth-primary/10', action: () => setPreviewFile(file), title: 'View' },
                                                        { icon: Share2, color: 'text-blue-400 hover:bg-blue-400/10', action: () => setSharingFile(file), title: 'Share' },
                                                        { icon: Edit2, color: 'text-amber-400 hover:bg-amber-400/10', action: () => setRenamingItem({ id: file.id, newName: file.name, type: 'file' }), title: 'Rename' },
                                                        { icon: Download, color: 'text-thoth-text-dim hover:text-thoth-text', action: () => handleDownload(file.id, file.name), title: 'Download' },
                                                        { icon: Trash2, color: 'text-red-900/40 hover:text-red-500', action: () => handleDelete(file.id, false), title: 'Delete' }
                                                    ].map((btn, i) => (
                                                        <button key={i} onClick={(e) => { e.stopPropagation(); btn.action(); }} className={`p-2 rounded-lg transition-all ${btn.color}`} title={btn.title}><btn.icon size={15} /></button>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>

                                <AnimatePresence>
                                    {openMenu === file.id && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="lg:hidden overflow-hidden bg-thoth-text/[0.02] rounded-2xl border border-thoth-border -mt-1 mx-2 mb-2 p-4 grid grid-cols-2 sm:grid-cols-4 gap-2"
                                        >
                                            {isTrashMode ? (
                                                 <>
                                                    <button onClick={() => { api.post('/files/bulk-action', { file_ids: [file.id], folder_ids: [] }, { params: { action: 'restore' } }).then(fetchItems); }} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-green-500/5 text-green-500">
                                                        <RefreshCw size={18} />
                                                        <span className="text-[8px] font-black uppercase tracking-widest">Restore</span>
                                                    </button>
                                                    <button onClick={() => handleDelete(file.id, false)} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-red-500/5 text-red-500">
                                                        <Trash2 size={18} />
                                                        <span className="text-[8px] font-black uppercase tracking-widest">Wipe</span>
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={(e) => { e.stopPropagation(); setPreviewFile(file); }} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-thoth-text/5 text-thoth-primary">
                                                        <Eye size={18} />
                                                        <span className="text-[8px] font-black uppercase tracking-widest">View</span>
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); setSharingFile(file); }} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-thoth-text/5 text-blue-400">
                                                        <Share2 size={18} />
                                                        <span className="text-[8px] font-black uppercase tracking-widest">Share</span>
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); setRenamingItem({ id: file.id, newName: file.name, type: 'file' }); }} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-thoth-text/5 text-amber-500">
                                                        <Edit2 size={18} />
                                                        <span className="text-[8px] font-black uppercase tracking-widest">Rename</span>
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDownload(file.id, file.name); }} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-thoth-text/5 text-thoth-text">
                                                        <Download size={18} />
                                                        <span className="text-[8px] font-black uppercase tracking-widest">Get</span>
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(file.id, false); }} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-red-500/5 text-red-500/60">
                                                        <Trash2 size={18} />
                                                        <span className="text-[8px] font-black uppercase tracking-widest">Bin</span>
                                                    </button>
                                                </>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </React.Fragment>
                        ))}
                    </>
                )}
            </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {totalSelected > 0 && (
            <motion.div 
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 glass-card bg-thoth-bg border-thoth-primary/30 p-4 px-8 flex items-center gap-8 shadow-2xl"
            >
                <div className="flex items-center gap-4">
                    <div className="bg-thoth-primary/20 p-2.5 rounded-xl">
                        <CheckSquare className="text-thoth-primary" size={20} />
                    </div>
                    <div>
                        <p className="text-thoth-text font-black text-sm uppercase tracking-tighter leading-none">{totalSelected} Items Selected</p>
                        <p className="text-thoth-text-dim text-[9px] font-bold uppercase tracking-widest mt-1">Select an action</p>
                    </div>
                </div>
                <div className="h-10 w-px bg-thoth-border" />
                <div className="flex gap-2">
                    {isTrashMode ? (
                        <>
                            <button onClick={() => handleBulkAction('restore')} className="flex items-center gap-2 px-5 py-2.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-2xl transition-all text-[9px] font-black uppercase tracking-widest border border-green-500/20">
                                <RefreshCw size={14} /> Restore
                            </button>
                            <button onClick={() => handleBulkAction('purge')} className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl transition-all text-[9px] font-black uppercase tracking-widest border border-red-500/20">
                                <Trash2 size={14} /> Delete Forever
                            </button>
                        </>
                    ) : mode === 'shared' ? (
                        <button onClick={() => handleBulkAction('delete')} className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl transition-all text-[9px] font-black uppercase tracking-widest border border-red-500/20">
                            <Share2 size={14} /> Stop Sharing
                        </button>
                    ) : (
                        <button onClick={() => handleBulkAction('delete')} className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl transition-all text-[9px] font-black uppercase tracking-widest border border-red-500/20">
                            <Trash2 size={14} /> Move to Trash
                        </button>
                    )}
                    <button onClick={() => setSelected({files:[], folders:[]})} className="px-5 py-2.5 text-thoth-text-dim hover:text-thoth-text text-[9px] font-black uppercase tracking-widest">Cancel</button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sharingFile && <ShareModal file={sharingFile} onClose={() => setSharingFile(null)} />}
        {previewFile && <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />}
      </AnimatePresence>

      <ConfirmModal 
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          message={confirmState.message}
          type={confirmState.type}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
          confirmText={confirmState.confirmText || "Confirm"}
          cancelText={confirmState.cancelText || "Cancel"}
          actions={confirmState.actions || []}
      />
    </div>
  );
};

export default FileExplorer;
