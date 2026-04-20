import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Download, File as FileIcon, ZoomIn, ZoomOut, RotateCw,
  Maximize2, FileText, Image as ImageIcon, Film, Music,
  HardDrive, Calendar,
} from 'lucide-react';
import AdvancedPlayer from './AdvancedPlayer';

/* ─── tiny helper ─── */
const CtrlBtn = ({ onClick, title, children }) => (
  <button
    onClick={onClick}
    title={title}
    style={{ color: 'var(--thoth-text-dim)', background: 'transparent', border: 'none', borderRadius: '0.5rem', padding: '0.4rem', cursor: 'pointer', transition: 'all 0.15s' }}
    onMouseEnter={e => { e.currentTarget.style.background = 'var(--thoth-primary-alpha, rgba(99,102,241,0.12))'; e.currentTarget.style.color = 'var(--thoth-primary)'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--thoth-text-dim)'; }}
  >
    {children}
  </button>
);

const FilePreview = ({ file, onClose }) => {
  const isImage = file.mime_type.startsWith('image/');
  const isVideo = file.mime_type.startsWith('video/');
  const isAudio = file.mime_type.startsWith('audio/');
  const isPdf   = file.mime_type === 'application/pdf';
  const isText  = file.mime_type.startsWith('text/') ||
    ['application/json', 'application/xml', 'application/javascript'].includes(file.mime_type);

  const token      = localStorage.getItem('token');
  const fileUrl    = `/api/files/download/${file.id}?token=${token}`;
  const previewUrl = `${fileUrl}&disposition=inline`;
  const downloadUrl= `${fileUrl}&disposition=attachment`;

  const [zoom,        setZoom]        = useState(1);
  const [rotation,    setRotation]    = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError,  setImageError]  = useState(false);
  const [textContent, setTextContent] = useState(null);
  const [textLoading, setTextLoading] = useState(false);

  // Drag-to-pan: use refs to avoid React re-renders during drag (prevents glitch)
  const panRef       = useRef({ x: 0, y: 0 });  // current committed pan
  const dragOrigin   = useRef(null);             // {mx, my, px, py} on mousedown
  const isDragging   = useRef(false);
  const transformRef = useRef(null);             // the div we apply transform to
  const stageRef     = useRef(null);             // the stage div (cursor changes)
  const zoomRef      = useRef(1);
  const rotRef       = useRef(0);

  /* load text */
  React.useEffect(() => {
    if (isText && !textContent && !textLoading) {
      setTextLoading(true);
      fetch(previewUrl, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.text()).then(setTextContent)
        .catch(() => setTextContent('Failed to load file content.'))
        .finally(() => setTextLoading(false));
    }
  }, [isText]);

  /* Escape key */
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  /* Apply transform directly to DOM — zero React renders during drag */
  const applyTransform = useCallback((px, py, z, r, animated) => {
    if (!transformRef.current) return;
    transformRef.current.style.transition = animated
      ? 'transform 0.35s cubic-bezier(0.4,0,0.2,1)'
      : 'none';
    transformRef.current.style.transform =
      `translate(${px}px, ${py}px) scale(${z}) rotate(${r}deg)`;
  }, []);

  /* Drag handlers — attached once, ref-based, no state changes during move */
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    isDragging.current = true;
    dragOrigin.current = {
      mx: e.clientX,
      my: e.clientY,
      px: panRef.current.x,
      py: panRef.current.y,
    };
    if (stageRef.current) stageRef.current.style.cursor = 'grabbing';
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      if (!isDragging.current || !dragOrigin.current) return;
      const nx = dragOrigin.current.px + (e.clientX - dragOrigin.current.mx);
      const ny = dragOrigin.current.py + (e.clientY - dragOrigin.current.my);
      panRef.current = { x: nx, y: ny };
      // Directly mutate DOM — no React setState
      applyTransform(nx, ny, zoomRef.current, rotRef.current, false);
    };

    const onUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      dragOrigin.current = null;
      if (stageRef.current) {
        stageRef.current.style.cursor = zoomRef.current > 1 ? 'grab' : 'default';
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, [applyTransform]);

  /* Zoom / Rotate helpers — update ref + state + DOM */
  const doZoom = useCallback((delta) => {
    const next = Math.min(4, Math.max(0.25, zoomRef.current + delta));
    zoomRef.current = next;
    setZoom(next); // only for % display in pill
    if (stageRef.current) stageRef.current.style.cursor = next > 1 ? 'grab' : 'default';
    applyTransform(panRef.current.x, panRef.current.y, next, rotRef.current, true);
  }, [applyTransform]);

  const doRotate = useCallback(() => {
    const next = rotRef.current + 90;
    rotRef.current = next;
    setRotation(next);
    applyTransform(panRef.current.x, panRef.current.y, zoomRef.current, next, true);
  }, [applyTransform]);

  const doReset = useCallback(() => {
    panRef.current = { x: 0, y: 0 };
    zoomRef.current = 1;
    rotRef.current  = 0;
    setZoom(1);
    setRotation(0);
    applyTransform(0, 0, 1, 0, true);
    if (stageRef.current) stageRef.current.style.cursor = 'default';
  }, [applyTransform]);

  const formatSize = (b) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getTypeInfo = () => {
    if (isImage) return { Icon: ImageIcon, label: 'Image',   color: 'var(--color-emerald, #10b981)',  raw: '#10b981' };
    if (isVideo) return { Icon: Film,      label: 'Video',   color: 'var(--color-purple,  #a855f7)',  raw: '#a855f7' };
    if (isAudio) return { Icon: Music,     label: 'Audio',   color: 'var(--color-pink,    #ec4899)',  raw: '#ec4899' };
    if (isPdf)   return { Icon: FileText,  label: 'PDF',     color: 'var(--color-red,     #ef4444)',  raw: '#ef4444' };
    if (isText)  return { Icon: FileText,  label: 'Text',    color: 'var(--color-blue,    #60a5fa)',  raw: '#60a5fa' };
    return           { Icon: FileIcon,     label: 'File',    color: 'var(--thoth-text-dim)',          raw: '#94a3b8' };
  };

  const { Icon, label, color, raw } = getTypeInfo();

  /* ── Image viewer (JSX inline — NOT a sub-component to prevent remount glitch) ── */
  const imageViewerJSX = isImage ? (
    <div className="relative flex flex-col w-full h-full">
      {/* stage */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-6">
        <div
          ref={stageRef}
          className="relative flex items-center justify-center w-full h-full rounded-2xl"
          style={{
            background: 'var(--thoth-card)',
            border: '1px solid var(--thoth-border)',
            cursor: 'default',
            userSelect: 'none',
          }}
          onMouseDown={handleMouseDown}
        >
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: `${raw} transparent transparent transparent` }} />
            </div>
          )}

          {imageError ? (
            <div className="flex flex-col items-center gap-5 text-center p-12">
              <ImageIcon size={52} style={{ color: 'var(--thoth-text-dim)', opacity: 0.35 }} />
              <p className="text-sm font-bold" style={{ color: 'var(--thoth-text-dim)' }}>Failed to load image</p>
              <a href={downloadUrl} download
                className="px-6 py-2.5 rounded-xl text-xs font-bold border transition-all"
                style={{ color: raw, borderColor: raw + '44', background: raw + '18' }}>
                Download Instead
              </a>
            </div>
          ) : (
            <div
              ref={transformRef}
              style={{
                transform: 'translate(0px, 0px) scale(1) rotate(0deg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                maxWidth: '100%',
                maxHeight: '100%',
                willChange: 'transform',
              }}
            >
              <motion.img
                src={previewUrl}
                alt={file.name}
                initial={{ opacity: 0 }}
                animate={{ opacity: imageLoaded ? 1 : 0 }}
                transition={{ duration: 0.35 }}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: '0.5rem',
                  boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
                  userSelect: 'none',
                  pointerEvents: 'none',
                  display: 'block',
                }}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                draggable={false}
              />
            </div>
          )}
        </div>
      </div>

      {/* floating controls pill */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="shrink-0 flex items-center justify-center pb-4"
      >
        <div
          className="flex items-center gap-1 px-3 py-2 rounded-2xl"
          style={{
            background: 'var(--thoth-card)',
            border: '1px solid var(--thoth-border)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          <CtrlBtn onClick={() => doZoom(-0.25)} title="Zoom Out"><ZoomOut size={15} /></CtrlBtn>
          <span className="text-[11px] font-mono font-bold px-3 min-w-[48px] text-center select-none"
            style={{ color: raw }}>
            {Math.round(zoom * 100)}%
          </span>
          <CtrlBtn onClick={() => doZoom(0.25)} title="Zoom In"><ZoomIn size={15} /></CtrlBtn>
          <div className="w-px h-5 mx-1" style={{ background: 'var(--thoth-border)' }} />
          <CtrlBtn onClick={doRotate} title="Rotate 90°"><RotateCw size={15} /></CtrlBtn>
          <CtrlBtn onClick={doReset} title="Reset View"><Maximize2 size={15} /></CtrlBtn>
        </div>
      </motion.div>
    </div>
  ) : null;

  const renderContent = () => {
    if (isImage) return imageViewerJSX;

    if (isVideo || isAudio) return (
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <AdvancedPlayer file={file} previewUrl={previewUrl} />
      </div>
    );

    if (isPdf) return (
      <div className="flex-1 overflow-hidden rounded-2xl mx-4 mb-4 border"
        style={{ borderColor: 'var(--thoth-border)' }}>
        <object data={`${previewUrl}#toolbar=1&navpanes=0&view=FitH`} type="application/pdf"
          className="w-full h-full" style={{ minHeight: 0 }}>
          <div className="flex flex-col items-center justify-center h-full p-12 gap-5"
            style={{ color: 'var(--thoth-text-dim)' }}>
            <FileText size={48} style={{ opacity: 0.3 }} />
            <p className="text-sm font-bold">PDF preview not supported in this browser</p>
            <a href={downloadUrl} download
              className="px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all"
              style={{ color: raw, borderColor: raw + '44', background: raw + '18' }}>
              Download PDF
            </a>
          </div>
        </object>
      </div>
    );

    if (isText) return (
      <div className="flex-1 overflow-auto mx-4 mb-4 rounded-2xl border p-6 custom-scrollbar"
        style={{ borderColor: 'var(--thoth-border)', background: 'var(--thoth-card)' }}>
        {textLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: `${raw} transparent transparent transparent` }} />
          </div>
        ) : (
          <pre className="text-sm font-mono whitespace-pre-wrap break-words leading-relaxed"
            style={{ color: 'var(--thoth-text)' }}>
            {textContent}
          </pre>
        )}
      </div>
    );

    /* unsupported */
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="p-8 rounded-[2rem]" style={{ background: 'var(--thoth-card)', border: '1px solid var(--thoth-border)' }}>
            <FileIcon size={52} style={{ color: 'var(--thoth-text-dim)', opacity: 0.35 }} />
          </div>
          <div>
            <p className="text-sm font-bold mb-1" style={{ color: 'var(--thoth-text-dim)' }}>Preview not available</p>
            <p className="text-xs font-mono opacity-50" style={{ color: 'var(--thoth-text-dim)' }}>{file.mime_type}</p>
          </div>
          <a href={downloadUrl} download
            className="px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all"
            style={{ color: raw, borderColor: raw + '44', background: raw + '18' }}>
            Download File
          </a>
        </div>
      </div>
    );
  };

  const modalContent = (
    <AnimatePresence>
      {/* ── Backdrop ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 lg:p-10 pointer-events-none"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div 
          className="absolute inset-0 bg-thoth-bg/85 backdrop-blur-2xl pointer-events-auto"
          onClick={onClose}
        />
        {/* ── Modal card ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 20 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative flex flex-col w-full max-w-5xl pointer-events-auto"
          style={{
            height: 'min(90vh, 800px)',
            background: 'var(--thoth-card)',
            borderRadius: '1.75rem',
            border: '1px solid var(--thoth-border)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.2)',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${raw}66, transparent)`, zIndex: 10 }} />

          {/* ── Header ── */}
          <div
            className="shrink-0 flex items-center justify-between px-6 py-4"
            style={{
              borderBottom: '1px solid var(--thoth-border)',
              background: 'color-mix(in srgb, var(--thoth-card) 60%, var(--thoth-bg) 40%)',
            }}
          >
            {/* file info */}
            <div className="flex items-center gap-4 min-w-0">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 18 }}
                className="flex-shrink-0 p-3 rounded-2xl"
                style={{ background: raw + '18', border: `1px solid ${raw}33` }}
              >
                <Icon size={20} style={{ color: raw }} />
              </motion.div>
              <div className="min-w-0">
                <h2
                  className="text-base lg:text-lg font-black tracking-tight truncate"
                  style={{ color: 'var(--thoth-text)', maxWidth: 'min(50vw, 420px)' }}
                  title={file.name}
                >
                  {file.name}
                </h2>
                <div className="flex items-center gap-2.5 mt-0.5">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: raw }}>
                    {label}
                  </span>
                  <span style={{ color: 'var(--thoth-border)' }}>•</span>
                  <span className="text-[9px] font-mono" style={{ color: 'var(--thoth-text-dim)' }}>
                    {formatSize(file.size)}
                  </span>
                  <span className="hidden sm:inline" style={{ color: 'var(--thoth-border)' }}>•</span>
                  <span className="hidden sm:inline text-[9px] font-mono" style={{ color: 'var(--thoth-text-dim)', opacity: 0.6 }}>
                    {file.mime_type}
                  </span>
                </div>
              </div>
            </div>

            {/* actions */}
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              {/* date badge */}
              <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'color-mix(in srgb, var(--thoth-text) 5%, transparent)', border: '1px solid var(--thoth-border)' }}>
                <Calendar size={11} style={{ color: 'var(--thoth-text-dim)' }} />
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--thoth-text-dim)' }}>
                  {new Date(file.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>

              {/* size badge */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'color-mix(in srgb, var(--thoth-text) 5%, transparent)', border: '1px solid var(--thoth-border)' }}>
                <HardDrive size={11} style={{ color: 'var(--thoth-text-dim)' }} />
                <span className="text-[9px] font-mono font-bold" style={{ color: 'var(--thoth-text-dim)' }}>
                  {formatSize(file.size)}
                </span>
              </div>

              {/* download */}
              <a
                href={downloadUrl}
                download
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                style={{ color: raw, background: raw + '18', border: `1px solid ${raw}33` }}
                onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.15)'}
                onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
              >
                <Download size={14} />
                <span className="hidden sm:inline">Download</span>
              </a>

              {/* close */}
              <button
                onClick={onClose}
                title="Close (Esc)"
                className="flex items-center justify-center w-10 h-10 rounded-xl transition-all"
                style={{
                  background: 'color-mix(in srgb, var(--thoth-text) 5%, transparent)',
                  border: '1px solid var(--thoth-border)',
                  color: 'var(--thoth-text-dim)',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(239,68,68,0.12)';
                  e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)';
                  e.currentTarget.style.color = '#ef4444';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'color-mix(in srgb, var(--thoth-text) 5%, transparent)';
                  e.currentTarget.style.borderColor = 'var(--thoth-border)';
                  e.currentTarget.style.color = 'var(--thoth-text-dim)';
                }}
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* ── Content ── */}
          <div className="flex-1 flex flex-col min-h-0">
            {renderContent()}
          </div>
        </motion.div>

        {/* ── Floating ESC pill ── */}
        <motion.button
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ delay: 0.15 }}
          onClick={onClose}
          className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all"
          style={{
            background: 'var(--thoth-card)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--thoth-border)',
            color: 'var(--thoth-text-dim)',
            zIndex: 110,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--thoth-text-dim)'; e.currentTarget.style.borderColor = 'var(--thoth-border)'; }}
        >
          <X size={13} />
          <span className="hidden sm:inline uppercase tracking-widest text-[9px]">Close</span>
          <span className="hidden sm:inline px-1.5 py-0.5 rounded text-[8px] font-mono"
            style={{ background: 'color-mix(in srgb, var(--thoth-text) 8%, transparent)', color: 'var(--thoth-text-dim)' }}>
            ESC
          </span>
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};

export default FilePreview;
