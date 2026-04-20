import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, CheckCircle, Info } from 'lucide-react';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';

const UploadManager = ({ onUploadComplete, currentFolderId }) => {
  const [uploads, setUploads] = useState([]);
  const [config, setConfig] = useState({ chunk_size_mb: 10, upload_retries: 3 });
  const abortControllers = React.useRef({});

  React.useEffect(() => {
    api.get('/files/config').then(res => setConfig(res.data)).catch(e => console.error(e));
  }, []);

  const onDrop = (acceptedFiles) => {
    acceptedFiles.forEach(file => {
      startUpload(file);
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    multiple: true
  });

  const startUpload = async (file) => {
    const uploadId = Math.random().toString(36).substring(7);
    const newUpload = {
      id: uploadId,
      name: file.name,
      progress: 0,
      status: 'initializing',
      size: file.size
    };

    const controller = new AbortController();
    abortControllers.current[uploadId] = controller;

    const chunkSize = config.chunk_size_mb * 1024 * 1024;

    setUploads(prev => [...prev, newUpload]);

    try {
      const formData = new FormData();
      formData.append('name', file.name);
      formData.append('size', file.size);
      formData.append('mime_type', file.type || 'application/octet-stream');
      if (currentFolderId != null && currentFolderId !== undefined) formData.append('folder_id', currentFolderId);

      const initRes = await api.post('/files/init-upload', formData, { signal: controller.signal });
      const fileId = initRes.data.id;

      const totalChunks = Math.ceil(file.size / chunkSize);
      
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        const chunkData = new FormData();
        chunkData.append('file_id', fileId);
        chunkData.append('chunk_index', i);
        chunkData.append('total_chunks', totalChunks);
        chunkData.append('chunk', chunk, file.name);

        let retries = config.upload_retries;
        while (retries > 0) {
            try {
                if (controller.signal.aborted) return;
                await api.post('/files/upload-chunk', chunkData, { signal: controller.signal });
                break;
            } catch (err) {
                retries--;
                if (retries === 0) throw err;
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        
        const progress = Math.round(((i + 1) / totalChunks) * 100);
        const status = (i === totalChunks - 1) ? 'assembling' : 'uploading';
        setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, progress, status } : u));
      }

      setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, status: 'complete', progress: 100 } : u));
      if (onUploadComplete) onUploadComplete();
      
      delete abortControllers.current[uploadId];
      
      setTimeout(() => {
        setUploads(prev => prev.filter(u => u.id !== uploadId));
      }, 3000);

    } catch (error) {
      if (error.name === 'CanceledError') {
        console.log("Upload cancelled", uploadId);
        return;
      }
      console.error("Upload failed", error);
      setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, status: 'error' } : u));
    }
  };

  const cancelUpload = (uploadId) => {
    if (abortControllers.current[uploadId]) {
      abortControllers.current[uploadId].abort();
      delete abortControllers.current[uploadId];
    }
    setUploads(prev => prev.filter(u => u.id !== uploadId));
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div 
        {...getRootProps()} 
        className={`relative group cursor-pointer overflow-hidden rounded-[2.5rem] transition-all duration-500
          ${isDragActive ? 'scale-[0.99] ring-2 ring-thoth-primary/50' : ''}`}
      >
        {/* Hover gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br from-thoth-primary/10 via-transparent to-transparent transition-opacity duration-700 ${isDragActive ? 'opacity-100' : 'opacity-30 group-hover:opacity-60'}`} />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-thoth-primary/40 to-transparent" />
        
        {/* Main Content Card */}
        <div
          className="p-10 lg:p-14 flex flex-col items-center justify-center space-y-6 relative z-10 rounded-[2.5rem] border-2 border-dashed transition-all duration-300"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--thoth-card), transparent 15%)',
            borderColor: isDragActive ? 'var(--thoth-primary)' : 'var(--thoth-border)',
          }}
        >
          <input {...getInputProps()} />
          
          {/* Upload Icon with glow animation */}
          <div className="relative">
            <div className="absolute inset-0 bg-thoth-primary/20 blur-3xl rounded-full scale-0 group-hover:scale-150 transition-transform duration-700" />
            <motion.div
              animate={isDragActive ? { rotate: [0, -10, 10, -10, 0], scale: 1.1 } : {}}
              transition={{ duration: 0.4 }}
              className="bg-thoth-primary shadow-[0_8px_32px_rgba(59,130,246,0.4)] p-6 rounded-[2rem] group-hover:shadow-[0_8px_40px_rgba(59,130,246,0.6)] transition-all duration-500 relative z-10"
            >
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Upload className="text-white w-8 h-8 lg:w-10 lg:h-10" />
              </motion.div>
            </motion.div>
          </div>
          
          {/* Text */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black tracking-tighter uppercase italic" style={{ color: 'var(--thoth-text)' }}>
              {isDragActive ? 'Drop to Upload' : 'Transfer Files'}
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-[0.4em]" style={{ color: 'var(--thoth-text-dim)' }}>
              Drag & drop or click to browse
            </p>
            
            {/* Animated hint dots */}
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                  className="w-1.5 h-1.5 rounded-full bg-thoth-primary"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Active Uploads */}
      <AnimatePresence>
        {uploads.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="glass-card p-5 lg:p-6 space-y-4 border-thoth-primary/20"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2" style={{ color: 'var(--thoth-text-dim)' }}>
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-thoth-primary"
                />
                Uploading
              </h3>
              <span className="text-[10px] font-mono text-thoth-primary/70">{uploads.length} File(s)</span>
            </div>
            
            <div className="space-y-4">
              {uploads.map(upload => (
                <motion.div 
                  key={upload.id} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-2"
                >
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {upload.status === 'complete' ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                        >
                          <CheckCircle size={14} className="text-green-500 shrink-0" />
                        </motion.div>
                      ) : (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-3.5 h-3.5 border-2 border-thoth-primary border-t-transparent rounded-full shrink-0"
                        />
                      )}
                      <span className="truncate max-w-[180px] lg:max-w-md font-bold" style={{ color: 'var(--thoth-text)' }}>
                        {upload.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`font-mono font-bold text-[11px] ${
                        upload.status === 'error' ? 'text-red-500' :
                        upload.status === 'complete' ? 'text-green-500' :
                        'text-thoth-primary'
                      }`}>
                        {upload.status === 'error' ? 'FAILED' : 
                         upload.status === 'complete' ? 'DONE' :
                         upload.status === 'assembling' ? 'PROCESSING...' :
                         `${upload.progress}%`}
                      </span>
                      {(upload.status === 'uploading' || upload.status === 'initializing') && (
                        <button 
                          onClick={() => cancelUpload(upload.id)}
                          className="p-1 hover:bg-red-500/20 hover:text-red-500 rounded-md transition-all"
                          style={{ color: 'var(--thoth-text-dim)' }}
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'color-mix(in srgb, var(--thoth-text), transparent 92%)' }}>
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${upload.progress}%` }}
                      transition={{ ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        upload.status === 'error' ? 'bg-red-500' :
                        upload.status === 'complete' ? 'bg-green-500' :
                        'bg-gradient-to-r from-thoth-primary to-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                      }`}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UploadManager;
