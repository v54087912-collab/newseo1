import React, { useState } from 'react';
import { Download, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Song } from './SongList';

interface DownloadButtonProps {
  song: Song;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({ song }) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (status === 'loading') return;

    setStatus('loading');
    try {
      let videoId = song.videoId;
      if (!videoId && song.url) {
          const urlObj = new URL(song.url);
          videoId = urlObj.searchParams.get('v') || '';
      }

      if (!videoId) throw new Error("Invalid Video ID");

      const res = await fetch(`https://socialdown.itz-ashlynn.workers.dev/yt?url=https://youtube.com/watch?v=${videoId}&format=mp3`);
      const data = await res.json();

      if (data && data.data && data.data[0] && data.data[0].downloadUrl) {
        const link = document.createElement('a');
        link.href = data.data[0].downloadUrl;
        link.download = `${song.title}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setStatus('success');
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        throw new Error("Download link not found");
      }
    } catch (error) {
      console.error("Download failed", error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={status === 'loading'}
      className={`
        p-2 rounded-full transition-all duration-300
        ${status === 'idle' ? 'text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20' : ''}
        ${status === 'loading' ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}
        ${status === 'success' ? 'text-green-500 bg-green-50 dark:bg-green-900/20' : ''}
        ${status === 'error' ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : ''}
      `}
      title="Download MP3"
    >
      {status === 'idle' && <Download className="w-5 h-5" />}
      {status === 'loading' && <Loader2 className="w-5 h-5 animate-spin" />}
      {status === 'success' && <Check className="w-5 h-5" />}
      {status === 'error' && <AlertCircle className="w-5 h-5" />}
    </button>
  );
};

export default DownloadButton;
