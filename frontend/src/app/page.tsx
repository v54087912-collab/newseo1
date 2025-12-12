'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import SearchBar from '@/components/MusicApp/SearchBar';
import SongList, { Song } from '@/components/MusicApp/SongList';
import Player from '@/components/MusicApp/Player';
import DownloadButton from '@/components/MusicApp/DownloadButton';
import { History, Music2 } from 'lucide-react';

export default function MusicApp() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  const handleSearch = async (query: string) => {
    setLoading(true);
    setError(null);
    
    // Update Recent Searches
    const updatedHistory = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updatedHistory);
    localStorage.setItem('recentSearches', JSON.stringify(updatedHistory));

    try {
      const res = await fetch(`https://ashlynn-repo.vercel.app/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      
      if (data.results) {
        setSongs(data.results.map((item: any) => ({
           ...item,
           videoId: item.url.split('v=')[1] // Extract video ID early
        })));
      } else {
        setSongs([]);
        setError("No results found");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = (song: Song) => {
    if (currentSong?.url === song.url) {
        setIsPlaying(!isPlaying);
    } else {
        setCurrentSong(song);
        setIsPlaying(true);
    }
  };

  const handleNext = () => {
    if (!currentSong || songs.length === 0) return;
    const currentIndex = songs.findIndex(s => s.url === currentSong.url);
    if (currentIndex < songs.length - 1) {
      setCurrentSong(songs[currentIndex + 1]);
      setIsPlaying(true);
    }
  };

  const handlePrevious = () => {
    if (!currentSong || songs.length === 0) return;
    const currentIndex = songs.findIndex(s => s.url === currentSong.url);
    if (currentIndex > 0) {
      setCurrentSong(songs[currentIndex - 1]);
      setIsPlaying(true);
    }
  };

  const handleDownload = (song: Song) => {
      // This is now handled by DownloadButton, but if we need global state management for downloads we can do it here.
      // For now, the button handles itself.
      // But wait, the SongList needs a onDownload prop.
      // I can wrap the DownloadButton inside SongList or pass a handler.
      // The SongList component I wrote takes `onDownload`.
      // Let's modify SongList to use the DownloadButton component directly for better UX.
      // Or I can just pass a dummy function if DownloadButton is self contained?
      // Actually, looking at SongList.tsx, I implemented a button there. 
      // I should update SongList.tsx to use DownloadButton component instead of a raw button.
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 font-sans selection:bg-purple-500/30">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-32 max-w-4xl">
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 mb-2">
            <Music2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Music<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">Flow</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Search, Play, Download. Anytime.</p>
        </div>

        <SearchBar onSearch={handleSearch} isLoading={loading} />

        {/* Recent Searches */}
        {!loading && songs.length === 0 && recentSearches.length > 0 && (
          <div className="mt-8 max-w-md mx-auto">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3 px-2">
              <History className="w-4 h-4" />
              <span>Recent Searches</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((term, i) => (
                <button
                  key={i}
                  onClick={() => handleSearch(term)}
                  className="px-4 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-800 transition-colors text-sm"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
            <div className="text-center mt-10 text-red-500">{error}</div>
        )}

        <SongList 
            songs={songs} 
            onPlay={handlePlay} 
        />
      </main>

      <Player 
        currentSong={currentSong}
        songs={songs}
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onPlaySong={(song) => { setCurrentSong(song); setIsPlaying(true); }}
      />
    </div>
  );
}
