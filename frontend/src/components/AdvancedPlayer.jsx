import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize, Music, Film } from 'lucide-react';

const AdvancedPlayer = ({ file, previewUrl }) => {
    const isVideo = file.mime_type.startsWith('video/');
    const isAudio = file.mime_type.startsWith('audio/');

    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const mediaRef = useRef(null);
    const canvasRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyzerRef = useRef(null);
    const animationFrameRef = useRef(null);

    // Use the download URL for playback (stream endpoint has bugs with startswith)
    const token = localStorage.getItem('token');
    const mediaUrl = `/api/files/download/${file.id}?token=${token}&disposition=inline`;

    // Handle Audio Visualizer
    useEffect(() => {
        if (!isAudio || !isPlaying || !mediaRef.current || !canvasRef.current) return;

        if (!audioContextRef.current) {
            try {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
                analyzerRef.current = audioContextRef.current.createAnalyser();
                const source = audioContextRef.current.createMediaElementSource(mediaRef.current);
                source.connect(analyzerRef.current);
                analyzerRef.current.connect(audioContextRef.current.destination);
                analyzerRef.current.fftSize = 256;
            } catch (e) {
                console.error('Audio context error:', e);
                return;
            }
        }

        const bufferLength = analyzerRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const draw = () => {
            animationFrameRef.current = requestAnimationFrame(draw);
            analyzerRef.current.getByteFrequencyData(dataArray);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const barHeight = dataArray[i] / 2;
                const opacity = barHeight / 128;
                
                // Primary color bars
                ctx.fillStyle = `rgba(59, 130, 246, ${opacity * 0.8})`;
                const segments = 8;
                const segmentHeight = barHeight / segments;
                for (let j = 0; j < segments; j++) {
                    const segOpacity = (j / segments) * opacity;
                    ctx.fillStyle = `rgba(59, 130, 246, ${segOpacity * 0.9})`;
                    ctx.fillRect(x, canvas.height - (j * (segmentHeight + 2)), barWidth - 2, segmentHeight);
                }
                x += barWidth + 1;
            }
        };

        draw();
        return () => cancelAnimationFrame(animationFrameRef.current);
    }, [isAudio, isPlaying]);

    // Cleanup
    useEffect(() => {
        return () => {
            cancelAnimationFrame(animationFrameRef.current);
            if (audioContextRef.current) {
                try { audioContextRef.current.close(); } catch(e) {}
            }
        };
    }, []);

    const togglePlay = () => {
        if (mediaRef.current) {
            if (isPlaying) mediaRef.current.pause();
            else mediaRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = () => {
        if (mediaRef.current) {
            mediaRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleTimeUpdate = () => {
        if (mediaRef.current) {
            setCurrentTime(mediaRef.current.currentTime);
            setProgress((mediaRef.current.currentTime / mediaRef.current.duration) * 100);
        }
    };

    const handleLoadedMetadata = () => {
        if (mediaRef.current) {
            setDuration(mediaRef.current.duration);
        }
    };

    const handleSeek = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = x / rect.width;
        if (mediaRef.current && mediaRef.current.duration) {
            mediaRef.current.currentTime = pct * mediaRef.current.duration;
        }
    };

    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // === VIDEO PLAYER ===
    if (isVideo) {
        return (
            <div className="w-full h-full flex flex-col">
                <div className="flex-1 relative rounded-3xl overflow-hidden border group" style={{ backgroundColor: '#000', borderColor: 'var(--thoth-border)' }}>
                    <video 
                        ref={mediaRef}
                        src={mediaUrl}
                        className="w-full h-full object-contain"
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onEnded={() => setIsPlaying(false)}
                        onClick={togglePlay}
                    />

                    {/* Controls Overlay */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-6 pt-20">
                        {/* Progress Bar */}
                        <div className="w-full h-1.5 rounded-full overflow-hidden cursor-pointer mb-4 group/progress" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} onClick={handleSeek}>
                            <div className="h-full bg-thoth-primary rounded-full relative transition-all" style={{ width: `${progress}%` }}>
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-thoth-primary rounded-full shadow-lg shadow-thoth-primary/50 scale-0 group-hover/progress:scale-100 transition-transform" />
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button onClick={togglePlay} className="p-3 bg-white rounded-full text-black hover:scale-110 transition-transform shadow-lg">
                                    {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                                </button>
                                
                                <div className="flex items-center gap-2">
                                    <button onClick={toggleMute} className="text-white/70 hover:text-white transition-colors">
                                        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                                    </button>
                                    <input 
                                        type="range" min="0" max="1" step="0.05" 
                                        value={isMuted ? 0 : volume} 
                                        onChange={(e) => {
                                            const v = parseFloat(e.target.value);
                                            setVolume(v);
                                            if (mediaRef.current) mediaRef.current.volume = v;
                                            if (v > 0 && isMuted) setIsMuted(false);
                                        }}
                                        className="w-20 h-1 accent-thoth-primary cursor-pointer"
                                    />
                                </div>

                                <span className="text-white/60 text-xs font-mono">
                                    {formatTime(currentTime)} / {formatTime(duration)}
                                </span>
                            </div>

                            <button 
                                onClick={() => { if (mediaRef.current) mediaRef.current.requestFullscreen(); }} 
                                className="text-white/60 hover:text-white transition-colors p-2"
                            >
                                <Maximize size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Play overlay when paused */}
                    {!isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center cursor-pointer" onClick={togglePlay}>
                            <div className="p-6 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 hover:scale-110 transition-transform">
                                <Play size={32} className="text-white ml-1" fill="white" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // === AUDIO PLAYER ===
    return (
        <div className="w-full max-w-3xl mx-auto space-y-6">
            {/* Visualizer Container */}
            <div className="relative aspect-[2/1] rounded-3xl overflow-hidden border" 
                style={{ backgroundColor: 'color-mix(in srgb, var(--thoth-card), transparent 20%)', borderColor: 'var(--thoth-border)' }}
            >
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60" width={800} height={400} />
                
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <motion.div 
                        animate={isPlaying ? { scale: [1, 1.05, 1] } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="p-10 rounded-[3rem] border border-thoth-primary/20 shadow-[0_0_60px_rgba(59,130,246,0.15)]"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--thoth-primary), transparent 90%)' }}
                    >
                        <Music size={56} className="text-thoth-primary" />
                    </motion.div>
                </div>

                <audio 
                    ref={mediaRef}
                    src={mediaUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={() => setIsPlaying(false)}
                />
            </div>

            {/* Audio Controls */}
            <div className="p-6 rounded-3xl border" style={{ backgroundColor: 'color-mix(in srgb, var(--thoth-card), transparent 20%)', borderColor: 'var(--thoth-border)' }}>
                {/* Progress */}
                <div className="w-full h-2 rounded-full overflow-hidden cursor-pointer mb-4 group/progress" style={{ backgroundColor: 'color-mix(in srgb, var(--thoth-text), transparent 90%)' }} onClick={handleSeek}>
                    <div className="h-full bg-gradient-to-r from-thoth-primary to-blue-400 rounded-full relative" style={{ width: `${progress}%` }}>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-thoth-primary rounded-full shadow-lg shadow-thoth-primary/40 scale-0 group-hover/progress:scale-100 transition-transform" />
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <button onClick={togglePlay} className="p-4 bg-thoth-primary rounded-full text-white hover:scale-110 transition-all shadow-lg shadow-thoth-primary/30">
                            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                        </button>

                        <div className="flex items-center gap-2 text-thoth-text-dim">
                            <button onClick={toggleMute} className="hover:text-thoth-text transition-colors">
                                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </button>
                            <input 
                                type="range" min="0" max="1" step="0.05" 
                                value={isMuted ? 0 : volume} 
                                onChange={(e) => {
                                    const v = parseFloat(e.target.value);
                                    setVolume(v);
                                    if (mediaRef.current) mediaRef.current.volume = v;
                                    if (v > 0 && isMuted) setIsMuted(false);
                                }}
                                className="w-24 h-1 accent-thoth-primary cursor-pointer"
                            />
                        </div>
                    </div>

                    <span className="text-xs font-mono text-thoth-text-dim">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default AdvancedPlayer;
