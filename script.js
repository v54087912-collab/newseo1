// State Management
const state = {
  playlist: [],
  currentIndex: -1,
  isPlaying: false,
  isLoading: false,
  isExpanded: false,
  searchResults: [],
  searchCache: new Map(), // Cache for search results
  volume: 1,
  lastRequestId: 0,
  searchAbortController: null
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
  elements.audioPlayer.addEventListener('waiting', () => showToast("Buffering..."));

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

  // Cancel previous pending request
  if (state.searchAbortController) {
    state.searchAbortController.abort();
  }
  state.searchAbortController = new AbortController();
  const signal = state.searchAbortController.signal;

  // Handle stale requests by storing the current query timestamp/ID
  const requestId = Date.now();
  state.lastRequestId = requestId;

  setLoading(true);
  try {
    // Direct API Call (CORS is enabled on upstream)
    // Using direct call avoids Vercel serverless timeout
    const url = `https://ashlynn-repo.vercel.app/search?q=${encodeURIComponent(query)}`;

    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error('Search failed');
    const data = await res.json();

    // Check if this request is still relevant
    if (state.lastRequestId !== requestId) return;

    const results = Array.isArray(data) ? data : (data.results || []);

    // Cache and render
    state.searchCache.set(query, results);
    renderResults(results);

  } catch (error) {
    if (error.name === 'AbortError') return;

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
    const card = document.createElement('div');
    card.className = 'result-card';

    const thumbnail = track.thumbnail || 'https://placehold.co/150x150?text=Music';
    const title = track.title || 'Unknown Title';
    const duration = track.duration || '0:00';

    // Use HTML structure without injecting user content directly
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
      try {
        await initiateDownload(track);
      } catch(err) {
        console.error(err);
      } finally {
        downloadBtn.disabled = false;
        downloadBtn.textContent = 'Download';
      }
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

  showToast("Loading stream...");

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
  // Direct API Call (CORS is enabled on upstream)
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const apiUrl = `https://socialdown.itz-ashlynn.workers.dev/yt?url=${encodeURIComponent(ytUrl)}&format=mp3`;

  try {
    // Set a timeout for the fetch, as the API can be slow
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 60000); // 60s timeout

    const res = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(id);

    if (!res.ok) throw new Error(`API Error: ${res.status}`);
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
    showToast("Stream API timeout or error");
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
    nextIndex = 0;
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
  // Don't show toast immediately on load start, only if it fails
  if (elements.audioPlayer.error) {
     showToast("Error playing track. Stream may be expired.");
  }
  updatePlayState(false);
}

function updateUI() {
    // Only needed if we want to restore full player state on load
    if (state.currentIndex !== -1 && state.playlist[state.currentIndex]) {
        updatePlayerUI(state.playlist[state.currentIndex]);
    }
}

// --- Download Logic ---

async function initiateDownload(track) {
  showToast("Getting download link...");
  const url = await fetchStreamUrl(track.videoId);
  if (url) {
    // Open in new tab which usually triggers download for MP3
    // Since it's cross-origin, we can't force 'download' attribute easily.
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("Download started (check tabs)");
  } else {
    showToast("Download failed");
  }
}

function handleDownload() {
  if (state.currentIndex === -1) return;
  const track = state.playlist[state.currentIndex];
  // Disable main download button temporarily
  elements.downloadBtn.disabled = true;
  elements.downloadBtn.textContent = "...";

  initiateDownload(track).finally(() => {
      elements.downloadBtn.disabled = false;
      elements.downloadBtn.textContent = "Download MP3";
  });
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
  // Clear existing toast timeout if we want to debounce toasts,
  // but simple replacement is fine.
  elements.toast.textContent = message;
  elements.toast.classList.remove('hidden');

  // Reset animation/timer
  // (Simplification: just use a new timeout)
  setTimeout(() => {
    elements.toast.classList.add('hidden');
  }, 3000);
}

function expandPlayer() {
  state.isExpanded = true;
  elements.fullPlayer.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function collapsePlayer() {
  state.isExpanded = false;
  elements.fullPlayer.classList.add('hidden');
  document.body.style.overflow = '';
}

function handleKeyboard(e) {
  if (e.target.tagName === 'INPUT') return;

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

// Start app
init();
