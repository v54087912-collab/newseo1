// State Management
const state = {
  playlist: [],
  currentIndex: -1,
  isPlaying: false,
  isLoading: false,
  isExpanded: false,
  searchResults: [],
  searchCache: new Map(), // Cache for search results
  volume: 1
};

// DOM Elements
const elements = {
  searchInput: document.getElementById('searchInput'),
  searchSpinner: document.getElementById('searchSpinner'),
  resultsContainer: document.getElementById('resultsContainer'),
  audioPlayer: document.getElementById('audioPlayer'),
  miniPlayer: document.getElementById('miniPlayer'),
  fullPlayer: document.getElementById('fullPlayer'),
  
  // Mini Player
  miniThumbnail: document.getElementById('miniThumbnail'),
  miniTitle: document.getElementById('miniTitle'),
  miniPlayBtn: document.getElementById('miniPlayBtn'),
  miniProgress: document.getElementById('miniProgress'),
  
  // Full Player
  fullThumbnail: document.getElementById('fullThumbnail'),
  fullTitle: document.getElementById('fullTitle'),
  progressBar: document.getElementById('progressBar'),
  currentTime: document.getElementById('currentTime'),
  totalDuration: document.getElementById('totalDuration'),
  playBtn: document.getElementById('playBtn'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  volumeSlider: document.getElementById('volumeSlider'),
  downloadBtn: document.getElementById('downloadBtn'),
  collapseBtn: document.getElementById('collapseBtn'),
  
  toast: document.getElementById('toast')
};

// --- Initialization ---

function init() {
  setupEventListeners();
  loadStateFromStorage();
  updateUI();
}

function setupEventListeners() {
  // Search
  elements.searchInput.addEventListener('input', debounce(handleSearch, 300));

  // Audio Events
  elements.audioPlayer.addEventListener('timeupdate', updateProgress);
  elements.audioPlayer.addEventListener('ended', handleTrackEnd);
  elements.audioPlayer.addEventListener('loadedmetadata', updateDuration);
  elements.audioPlayer.addEventListener('play', () => updatePlayState(true));
  elements.audioPlayer.addEventListener('pause', () => updatePlayState(false));
  elements.audioPlayer.addEventListener('error', handleAudioError);

  // Player Controls
  elements.miniPlayBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlay();
  });
  elements.playBtn.addEventListener('click', togglePlay);
  elements.prevBtn.addEventListener('click', playPrevious);
  elements.nextBtn.addEventListener('click', playNext);
  
  elements.progressBar.addEventListener('input', handleSeek);
  elements.volumeSlider.addEventListener('input', handleVolume);
  
  // UI Interactions
  elements.miniPlayer.addEventListener('click', expandPlayer);
  elements.collapseBtn.addEventListener('click', collapsePlayer);
  elements.downloadBtn.addEventListener('click', handleDownload);
  
  // Keyboard Shortcuts
  document.addEventListener('keydown', handleKeyboard);
}

// --- Search Logic ---

async function handleSearch(e) {
  const query = e.target.value.trim();
  if (!query) {
    elements.resultsContainer.innerHTML = '<div class="placeholder-message">Type to search for music...</div>';
    return;
  }

  // Check cache
  if (state.searchCache.has(query)) {
    renderResults(state.searchCache.get(query));
    return;
  }

  // Handle stale requests by storing the current query timestamp/ID
  const requestId = Date.now();
  state.lastRequestId = requestId;

  setLoading(true);
  try {
    // API Call via Proxy
    const url = `/api/proxy?type=search&q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Search failed');
    const data = await res.json();

    // Check if this request is still relevant
    if (state.lastRequestId !== requestId) return;
    
    // Normalize data (API structure might vary, adapting to "search results" usually results array)
    // Based on prompt: "Each result must display: thumbnail, title, duration."
    // Let's assume the API returns an array or an object with a list.
    // Inspecting prompt example: `return data.results || data;`
    
    const results = Array.isArray(data) ? data : (data.results || []);
    
    // Cache and render
    state.searchCache.set(query, results);
    renderResults(results);
    
  } catch (error) {
    // Check if this request is still relevant
    if (state.lastRequestId !== requestId) return;

    console.error(error);
    showToast('Failed to fetch search results');
    elements.resultsContainer.innerHTML = '<div class="placeholder-message">Error loading results.</div>';
  } finally {
    if (state.lastRequestId === requestId) {
      setLoading(false);
    }
  }
}

function renderResults(results) {
  elements.resultsContainer.innerHTML = '';
  
  if (results.length === 0) {
    elements.resultsContainer.innerHTML = '<div class="placeholder-message">No results found.</div>';
    return;
  }

  results.forEach(track => {
    // Expected track structure: { title, duration, thumbnail, videoId, ... }
    // Note: API might return slightly different keys.
    const card = document.createElement('div');
    card.className = 'result-card';
    
    const thumbnail = track.thumbnail || 'https://placehold.co/150x150?text=Music';
    const title = track.title || 'Unknown Title';
    const duration = track.duration || '0:00'; // timestamp or seconds?
    // prompt says "duration". Assuming formatted string or needs formatting.
    
    card.innerHTML = `
      <div class="card-img-wrapper">
        <img loading="lazy">
      </div>
      <div class="card-title"></div>
      <div class="card-duration"></div>
      <div class="card-actions">
        <button class="card-btn btn-play">Play</button>
        <button class="card-btn btn-download">Download</button>
      </div>
    `;

    // Safely set text content
    const img = card.querySelector('img');
    img.src = thumbnail;
    img.alt = title;

    card.querySelector('.card-title').textContent = title;
    card.querySelector('.card-duration').textContent = duration;
    
    const playBtn = card.querySelector('.btn-play');
    playBtn.setAttribute('aria-label', `Play ${title}`);
    
    const downloadBtn = card.querySelector('.btn-download');
    downloadBtn.setAttribute('aria-label', `Download ${title}`);

    // Event Listeners for buttons
    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      addToPlaylistAndPlay(track);
    });

    downloadBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      downloadBtn.disabled = true;
      downloadBtn.textContent = '...';
      await initiateDownload(track);
      downloadBtn.disabled = false;
      downloadBtn.textContent = 'Download';
    });

    elements.resultsContainer.appendChild(card);
  });
}

// --- Player Logic ---

function addToPlaylistAndPlay(track) {
  // Check if track is already in playlist
  const existingIndex = state.playlist.findIndex(t => t.videoId === track.videoId);
  
  if (existingIndex !== -1) {
    state.currentIndex = existingIndex;
  } else {
    // Add to playlist
    state.playlist.push(track);
    state.currentIndex = state.playlist.length - 1;
  }
  
  loadTrack(state.currentIndex);
  expandPlayer();
}

function loadTrack(index) {
  if (index < 0 || index >= state.playlist.length) return;
  
  const track = state.playlist[index];
  state.currentIndex = index;
  
  // Update UI
  updatePlayerUI(track);
  
  // Build Stream URL
  // Since we don't have a direct stream URL from search, we rely on the download API which likely gives an MP3.
  // Or maybe we need to fetch the stream URL.
  // Prompt says: "When user clicks Play... opens the built-in player."
  // "Download uses the Download API... When user clicks Download, begin download..."
  // It doesn't explicitly say how to stream. But usually music apps stream from the same source.
  // If the download API returns an MP3 link, we can use that for <audio src="...">.
  
  // Strategy: Get the MP3 link via Proxy for playback as well.
  
  fetchStreamUrl(track.videoId).then(url => {
    if (url) {
      elements.audioPlayer.src = url;
      elements.audioPlayer.play().catch(e => {
        console.error("Autoplay failed", e);
        showToast("Tap play to start");
      });
    } else {
      showToast("Could not load stream");
    }
  });

  saveStateToStorage();
}

async function fetchStreamUrl(videoId) {
  // Use the proxy/download API to get a playable link
  // NOTE: Ideally we want a stream, but a direct MP3 link works for <audio>
  
  // Reuse the buildDownloadUrl logic but maybe we need to resolve it if it's a redirect?
  // If the Proxy returns JSON with URL:
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const apiUrl = `/api/proxy?type=download&url=${encodeURIComponent(ytUrl)}`;
  
  try {
    const res = await fetch(apiUrl);
    const data = await res.json();
    
    // Check for socialdown API structure: { data: [ { downloadUrl: "..." } ] }
    if (data.data && Array.isArray(data.data) && data.data.length > 0 && data.data[0].downloadUrl) {
      return data.data[0].downloadUrl;
    }

    // Fallbacks for other potential structures
    if (data.url) return data.url;
    if (data.link) return data.link;
    if (data.downloadUrl) return data.downloadUrl;
    
    return null;
  } catch (e) {
    console.error("Stream fetch error", e);
    return null;
  }
}

function togglePlay() {
  if (state.playlist.length === 0) return;
  
  if (state.isPlaying) {
    elements.audioPlayer.pause();
  } else {
    elements.audioPlayer.play();
  }
}

function playNext() {
  if (state.playlist.length === 0) return;
  
  let nextIndex = state.currentIndex + 1;
  if (nextIndex >= state.playlist.length) {
    nextIndex = 0; // Loop or stop? "Auto-next plays next track when one ends."
    // Usually looping playlist is fine or stop at end. Let's loop.
  }
  loadTrack(nextIndex);
}

function playPrevious() {
  if (state.playlist.length === 0) return;
  
  // If we are > 3 seconds in, restart track
  if (elements.audioPlayer.currentTime > 3) {
    elements.audioPlayer.currentTime = 0;
    return;
  }
  
  let prevIndex = state.currentIndex - 1;
  if (prevIndex < 0) {
    prevIndex = state.playlist.length - 1;
  }
  loadTrack(prevIndex);
}

function handleTrackEnd() {
  playNext();
}

function updatePlayState(isPlaying) {
  state.isPlaying = isPlaying;
  
  const icon = isPlaying ? '⏸' : '▶';
  elements.playBtn.textContent = icon;
  elements.miniPlayBtn.textContent = icon;
  
  // Enable buttons
  elements.playBtn.disabled = false;
  elements.miniPlayBtn.disabled = false;
  elements.prevBtn.disabled = false;
  elements.nextBtn.disabled = false;
  elements.downloadBtn.disabled = false;
}

function updatePlayerUI(track) {
  const { title, thumbnail, duration } = track;
  
  elements.miniTitle.textContent = title;
  elements.miniThumbnail.src = thumbnail;
  
  elements.fullTitle.textContent = title;
  elements.fullThumbnail.src = thumbnail;
  
  // Reset progress
  elements.progressBar.value = 0;
  elements.miniProgress.style.width = '0%';
  elements.currentTime.textContent = "0:00";
  elements.totalDuration.textContent = duration || "0:00";
}

function updateProgress() {
  const { currentTime, duration } = elements.audioPlayer;
  if (isNaN(duration)) return;
  
  const percent = (currentTime / duration) * 100;
  
  elements.progressBar.value = percent;
  elements.miniProgress.style.width = `${percent}%`;
  
  elements.currentTime.textContent = formatTime(currentTime);
  elements.totalDuration.textContent = formatTime(duration);
  
  // Update css variable for slider track coloring
  elements.progressBar.style.setProperty('--value', `${percent}%`);
}

function handleSeek(e) {
  const percent = e.target.value;
  const duration = elements.audioPlayer.duration;
  if (isNaN(duration)) return;
  
  elements.audioPlayer.currentTime = (percent / 100) * duration;
}

function handleVolume(e) {
  state.volume = e.target.value;
  elements.audioPlayer.volume = state.volume;
}

function updateDuration() {
  elements.totalDuration.textContent = formatTime(elements.audioPlayer.duration);
}

function handleAudioError(e) {
  console.error("Audio error", e);
  showToast("Error playing track");
  updatePlayState(false);
}

// --- Download Logic ---

async function initiateDownload(track) {
  showToast("Preparing download...");
  const url = await fetchStreamUrl(track.videoId);
  if (url) {
    // Create a temporary link to download
    const a = document.createElement('a');
    a.href = url;
    a.download = `${track.title}.mp3`; // This might not work for cross-origin without proper headers
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("Download started");
  } else {
    showToast("Download failed");
  }
}

function handleDownload() {
  if (state.currentIndex === -1) return;
  const track = state.playlist[state.currentIndex];
  initiateDownload(track);
}

// --- UI Utilities ---

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function setLoading(isLoading) {
  state.isLoading = isLoading;
  if (isLoading) {
    elements.searchSpinner.classList.add('visible');
  } else {
    elements.searchSpinner.classList.remove('visible');
  }
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.remove('hidden');
  setTimeout(() => {
    elements.toast.classList.add('hidden');
  }, 3000);
}

function expandPlayer() {
  state.isExpanded = true;
  elements.fullPlayer.classList.remove('hidden');
  document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function collapsePlayer() {
  state.isExpanded = false;
  elements.fullPlayer.classList.add('hidden');
  document.body.style.overflow = '';
}

function handleKeyboard(e) {
  if (e.target.tagName === 'INPUT') return; // Ignore if typing
  
  switch(e.code) {
    case 'Space':
      e.preventDefault();
      togglePlay();
      break;
    case 'ArrowRight':
      elements.audioPlayer.currentTime += 5;
      break;
    case 'ArrowLeft':
      elements.audioPlayer.currentTime -= 5;
      break;
  }
}

// --- Persistence ---

function saveStateToStorage() {
  localStorage.setItem('musicApp_playlist', JSON.stringify(state.playlist));
  localStorage.setItem('musicApp_index', state.currentIndex);
  localStorage.setItem('musicApp_volume', state.volume);
}

function loadStateFromStorage() {
  const savedPlaylist = localStorage.getItem('musicApp_playlist');
  const savedIndex = localStorage.getItem('musicApp_index');
  const savedVolume = localStorage.getItem('musicApp_volume');
  
  if (savedPlaylist) {
    state.playlist = JSON.parse(savedPlaylist);
  }
  
  if (savedIndex !== null) {
    const idx = parseInt(savedIndex);
    if (idx >= 0 && idx < state.playlist.length) {
      state.currentIndex = idx;
      updatePlayerUI(state.playlist[idx]);
    }
  }
  
  if (savedVolume !== null) {
    state.volume = parseFloat(savedVolume);
    elements.volumeSlider.value = state.volume;
    elements.audioPlayer.volume = state.volume;
  }
}

// Start app
init();
