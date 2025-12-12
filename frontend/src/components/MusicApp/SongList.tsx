import React from 'react';
import { Play } from 'lucide-react';
import DownloadButton from './DownloadButton';

export interface Song {
  title: string;
  channel: string;
  duration: string;
  thumbnail: string;
  url: string;
  videoId?: string; // Will extract this
}

interface SongListProps {
  songs: Song[];
  onPlay: (song: Song) => void;
}

const SongList: React.FC<SongListProps> = ({ songs, onPlay }) => {
  if (songs.length === 0) return null;

  return (
    <div className="w-full max-w-2xl mx-auto mt-6 space-y-3 pb-32">
      {songs.map((song, index) => (
        <div
          key={index}
          className="flex items-center p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow group"
        >
          <div 
            className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden cursor-pointer"
            onClick={() => onPlay(song)}
          >
            <img 
              src={song.thumbnail} 
              alt={song.title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
            />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="w-6 h-6 text-white fill-current" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0 ml-4 mr-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={song.title}>
              {song.title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {song.channel} • {song.duration}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPlay(song)}
              className="p-2 rounded-full text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
            >
              <Play className="w-5 h-5" />
            </button>
            <DownloadButton song={song} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default SongList;
