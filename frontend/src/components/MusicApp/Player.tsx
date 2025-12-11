import React, { useRef, useState, useEffect } from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, 
  Volume2, VolumeX, Maximize2, ChevronDown, 
  ListMusic, Repeat, Shuffle, Heart
} from 'lucide-react';
import { Song } from './SongList';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for merging tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PlayerProps {
  currentSong: Song | null;
  songs: Song[];
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onPlaySong: (song: Song) => void;
}

const Player: React.FC<PlayerProps> = ({ 
  currentSong, 
  songs, 
  isPlaying, 
  onPlayPause, 
  onNext, 
  onPrevious,
  onPlaySong
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showQueue, setShowQueue] = useState(false); // Toggle between Art/Queue in Mobile Full view if needed, or split view in desktop
  
  // Auto-expand on new song
  useEffect(() => {
      if (currentSong) {
          setIsExpanded(true);
      }
  }, [currentSong]);

  // Stream Fetching Logic
  useEffect(() => {
    const fetchStreamUrl = async () => {
      if (!currentSong) return;
      
      try {
        let videoId = currentSong.videoId;
        if (!videoId && currentSong.url) {
            const urlObj = new URL(currentSong.url);
            videoId = urlObj.searchParams.get('v') || '';
        }

        if (!videoId) return;

        // Use Download API to get playable link
        const res = await fetch(`https://socialdown.itz-ashlynn.workers.dev/yt?url=https://youtube.com/watch?v=${videoId}&format=mp3`);
        const data = await res.json();
        
        if (data && data.data && data.data[0] && data.data[0].downloadUrl) {
           setAudioSrc(data.data[0].downloadUrl);
        }
      } catch (err) {
        console.error("Failed to fetch audio stream", err);
      }
    };

    fetchStreamUrl();
  }, [currentSong]);

  // Audio Control Effects
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Playback failed", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, audioSrc]);

  useEffect(() => {
      if (audioRef.current) {
          audioRef.current.volume = isMuted ? 0 : volume;
      }
  }, [volume, isMuted]);

  // Handlers
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration;
      setCurrentTime(current);
      setProgress((current / total) * 100);
      setDuration(total);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const seekTime = (Number(e.target.value) / 100) * audioRef.current.duration;
      audioRef.current.currentTime = seekTime;
      setProgress(Number(e.target.value));
      setCurrentTime(seekTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVol = Number(e.target.value);
      setVolume(newVol);
      if (newVol > 0 && isMuted) setIsMuted(false);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!currentSong) return null;

  return (
    <>
      <audio
        ref={audioRef}
        src={audioSrc || ''}
        onTimeUpdate={handleTimeUpdate}
        onEnded={onNext}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />

      <AnimatePresence>
        {isExpanded ? (
          <FullPlayer 
            key="full-player"
            currentSong={currentSong}
            songs={songs}
            isPlaying={isPlaying}
            progress={progress}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            isMuted={isMuted}
            onPlayPause={onPlayPause}
            onNext={onNext}
            onPrevious={onPrevious}
            onSeek={handleSeek}
            onVolumeChange={handleVolumeChange}
            onToggleMute={() => setIsMuted(!isMuted)}
            onCollapse={() => setIsExpanded(false)}
            onPlaySong={onPlaySong}
          />
        ) : (
          <MiniPlayer 
            key="mini-player"
            currentSong={currentSong}
            isPlaying={isPlaying}
            progress={progress}
            onPlayPause={onPlayPause}
            onNext={onNext}
            onExpand={() => setIsExpanded(true)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

// --- Sub Components ---

const MiniPlayer = ({ 
  currentSong, isPlaying, progress, onPlayPause, onNext, onExpand 
}: any) => {
  return (
    <motion.div 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
      onClick={onExpand}
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 p-2 sm:pb-4 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] z-50 cursor-pointer"
    >
      {/* Progress Bar (Mini) */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-zinc-800">
        <div className="h-full bg-pink-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-2 mt-2">
        <div className="flex items-center gap-3 min-w-0">
            {/* Spinning Art (Small) */}
           <div className={cn(
               "w-12 h-12 rounded-full overflow-hidden border-2 border-gray-100 dark:border-zinc-800 shadow-sm flex-shrink-0",
               isPlaying && "animate-[spin_8s_linear_infinite]" 
           )}>
            <img src={currentSong.thumbnail} alt={currentSong.title} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{currentSong.title}</h4>
            <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">{currentSong.channel}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 pr-2">
          <button 
            onClick={(e) => { e.stopPropagation(); onPlayPause(); }}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-pink-500 text-white shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
          </button>
          <button 
             onClick={(e) => { e.stopPropagation(); onNext(); }}
             className="text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <SkipForward className="w-6 h-6" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const FullPlayer = ({ 
  currentSong, songs, isPlaying, progress, currentTime, duration, 
  volume, isMuted, onPlayPause, onNext, onPrevious, onSeek, 
  onVolumeChange, onToggleMute, onCollapse, onPlaySong
}: any) => {
    
  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 bg-white dark:bg-black z-[60] flex flex-col overflow-hidden"
    >
        {/* Background Blur Overlay */}
        <div className="absolute inset-0 opacity-30 dark:opacity-20 pointer-events-none">
            <img src={currentSong.thumbnail} className="w-full h-full object-cover blur-3xl scale-150" />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-black dark:via-black/80 dark:to-transparent" />
        </div>

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-6 py-6">
            <button onClick={onCollapse} className="p-2 -ml-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                <ChevronDown className="w-8 h-8" />
            </button>
            <span className="text-xs font-bold tracking-widest uppercase text-gray-400 dark:text-zinc-500">Now Playing</span>
            <button className="p-2 -mr-2 text-gray-500 dark:text-gray-400">
                <ListMusic className="w-6 h-6" />
            </button>
        </div>

        {/* Main Content Grid */}
        <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 px-6 pb-12 overflow-y-auto lg:overflow-hidden">
            
            {/* Left: Album Art & Info */}
            <div className="w-full max-w-md flex flex-col items-center">
                {/* Rotating Vinyl/Art Effect */}
                <div className="relative w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 aspect-square rounded-full shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_-12px_rgba(236,72,153,0.3)] mb-8 sm:mb-12 ring-8 ring-white/20 dark:ring-white/5">
                    <img 
                        src={currentSong.thumbnail} 
                        className={cn(
                            "w-full h-full object-cover rounded-full",
                            isPlaying ? "animate-[spin_12s_linear_infinite]" : "animate-none"
                        )}
                        style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
                        alt="Album Art"
                    />
                     {/* Center Hole for Vinyl Look */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white dark:bg-black rounded-full border border-gray-100 dark:border-zinc-800 flex items-center justify-center">
                        <div className="w-4 h-4 rounded-full bg-pink-500/50" />
                    </div>
                </div>

                {/* Song Meta */}
                <div className="w-full text-center space-y-2 mb-6">
                    <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white truncate px-4 leading-tight">
                        {currentSong.title}
                    </h2>
                    <p className="text-lg text-gray-500 dark:text-zinc-400 font-medium">
                        {currentSong.channel}
                    </p>
                </div>

                {/* Seekbar */}
                <div className="w-full space-y-2 mb-8">
                    <input 
                        type="range" 
                        min="0" max="100" 
                        value={progress} 
                        onChange={onSeek}
                        className="w-full h-2 bg-gray-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-pink-500 hover:accent-pink-400 transition-all"
                    />
                    <div className="flex justify-between text-xs font-mono font-medium text-gray-400 dark:text-zinc-500">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Main Controls */}
                <div className="flex items-center justify-between w-full max-w-sm px-4">
                    <button className="text-gray-400 hover:text-pink-500 transition-colors">
                        <Shuffle className="w-6 h-6" />
                    </button>
                    
                    <button onClick={onPrevious} className="text-gray-800 dark:text-white hover:scale-110 transition-transform">
                        <SkipBack className="w-8 h-8 fill-current" />
                    </button>

                    <button 
                        onClick={onPlayPause}
                        className="w-20 h-20 flex items-center justify-center rounded-full bg-gradient-to-tr from-pink-600 to-purple-600 text-white shadow-[0_10px_30px_rgba(236,72,153,0.4)] hover:scale-105 active:scale-95 transition-all"
                    >
                        {isPlaying ? (
                            <Pause className="w-10 h-10 fill-current" />
                        ) : (
                            <Play className="w-10 h-10 fill-current ml-2" />
                        )}
                    </button>

                    <button onClick={onNext} className="text-gray-800 dark:text-white hover:scale-110 transition-transform">
                        <SkipForward className="w-8 h-8 fill-current" />
                    </button>

                    <button className="text-gray-400 hover:text-pink-500 transition-colors">
                        <Repeat className="w-6 h-6" />
                    </button>
                </div>

                {/* Volume (Desktop view inside column, or bottom) */}
                <div className="w-full max-w-xs mt-8 flex items-center gap-4 text-gray-400">
                    <button onClick={onToggleMute}>
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <input 
                        type="range" min="0" max="1" step="0.05"
                        value={volume}
                        onChange={onVolumeChange}
                        className="flex-1 h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-gray-500 dark:accent-zinc-400"
                    />
                </div>
            </div>

            {/* Right: Up Next List (Desktop) / Hidden on small mobile unless toggled */}
            <div className="hidden lg:flex flex-col w-full max-w-sm h-[600px] bg-gray-50/50 dark:bg-zinc-900/50 backdrop-blur-md rounded-3xl border border-gray-100 dark:border-white/5 p-6 overflow-hidden">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="w-2 h-8 bg-pink-500 rounded-full" />
                    Up Next
                </h3>
                
                <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                    {songs.map((song: Song, idx: number) => {
                        const isCurrent = song.url === currentSong.url;
                        return (
                            <div 
                                key={idx}
                                onClick={() => onPlaySong(song)}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-white dark:hover:bg-white/5",
                                    isCurrent ? "bg-white dark:bg-white/10 shadow-sm border border-pink-500/20" : ""
                                )}
                            >
                                <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                                    <img src={song.thumbnail} className="w-full h-full object-cover" />
                                    {isCurrent && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <div className="w-1 h-3 bg-pink-500 mx-[1px] animate-[bounce_1s_infinite]" />
                                            <div className="w-1 h-4 bg-pink-500 mx-[1px] animate-[bounce_1.2s_infinite]" />
                                            <div className="w-1 h-2 bg-pink-500 mx-[1px] animate-[bounce_0.8s_infinite]" />
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className={cn(
                                        "text-sm font-semibold truncate",
                                        isCurrent ? "text-pink-600 dark:text-pink-400" : "text-gray-900 dark:text-gray-200"
                                    )}>{song.title}</h4>
                                    <p className="text-xs text-gray-500 dark:text-zinc-500 truncate">{song.channel}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    </motion.div>
  );
};

export default Player;
