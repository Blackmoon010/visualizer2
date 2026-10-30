/* BLACKMOON 0-1-0 App & Audio Controller */
(function() {
  const audio = document.getElementById("audio-player");
  let audioCtx = null;
  let analyser = null;
  let sourceNode = null;
  let gainNode = null;
  let frequencyData = null;

  // Expose clean interface to visualizer
  window.AudioEngine = {
    isReady: () => analyser && frequencyData,
    getBassAverage: () => {
      if (!analyser || !frequencyData) return 0;
      analyser.getByteFrequencyData(frequencyData);
      let bassSum = 0;
      for (let i = 0; i < 20; i++) bassSum += frequencyData[i];
      return (bassSum / 20) / 255;
    }
  };

  function initAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.85;

      gainNode = audioCtx.createGain();
      gainNode.gain.value = 0.8;

      sourceNode = audioCtx.createMediaElementSource(audio);
      sourceNode.connect(analyser);
      analyser.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      frequencyData = new Uint8Array(analyser.frequencyBinCount);
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }

  /* Playlist Manager */
  let playlist = [];
  let currentTrackIdx = -1;

  const fileUpload = document.getElementById("file-upload");
  const playlistContainer = document.getElementById("playlist-container");
  const trackTitleDisplay = document.getElementById("display-track-title");
  const trackTimeDisplay = document.getElementById("display-track-time");
  const btnPlay = document.getElementById("btn-play");
  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");
  const sliderVol = document.getElementById("slider-volume");

  fileUpload.addEventListener("change", (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach(file => {
      playlist.push({
        name: file.name.replace(/\.[^/.]+$/, ""),
        file: file,
        url: null
      });
    });

    renderPlaylist();
    if (currentTrackIdx === -1) loadTrack(0, true);
  });

  function renderPlaylist() {
    playlistContainer.innerHTML = "";
    if (!playlist.length) {
      playlistContainer.innerHTML = `<div class="empty-msg">Queue empty.<br>Tap "+ Load Audio" to add tracks.</div>`;
      return;
    }

    playlist.forEach((track, idx) => {
      const item = document.createElement("div");
      item.className = `playlist-item ${idx === currentTrackIdx ? "active" : ""}`;
      item.textContent = `${idx + 1}. ${track.name}`;
      item.addEventListener("click", () => loadTrack(idx, true));
      playlistContainer.appendChild(item);
    });
  }

  function loadTrack(idx, autoPlay = false) {
    if (idx < 0 || idx >= playlist.length) return;

    initAudioContext();

    // Clean previous object URL
    if (currentTrackIdx !== -1 && playlist[currentTrackIdx].url) {
      URL.revokeObjectURL(playlist[currentTrackIdx].url);
      playlist[currentTrackIdx].url = null;
    }

    currentTrackIdx = idx;
    const track = playlist[currentTrackIdx];
    track.url = URL.createObjectURL(track.file);

    audio.src = track.url;
    trackTitleDisplay.textContent = track.name;
    renderPlaylist();

    if (autoPlay) {
      audio.play().catch(e => console.warn("Playback gesture needed:", e));
      btnPlay.textContent = "Pause";
    }
  }

  btnPlay.addEventListener("click", () => {
    initAudioContext();
    if (!playlist.length) return;

    if (audio.paused) {
      audio.play();
      btnPlay.textContent = "Pause";
    } else {
      audio.pause();
      btnPlay.textContent = "Play";
    }
  });

  btnNext.addEventListener("click", () => {
    if (currentTrackIdx + 1 < playlist.length) {
      loadTrack(currentTrackIdx + 1, !audio.paused);
    }
  });

  btnPrev.addEventListener("click", () => {
    if (currentTrackIdx - 1 >= 0) {
      loadTrack(currentTrackIdx - 1, !audio.paused);
    }
  });

  audio.addEventListener("ended", () => {
    if (currentTrackIdx + 1 < playlist.length) {
      loadTrack(currentTrackIdx + 1, true);
    } else {
      btnPlay.textContent = "Play";
    }
  });

  audio.addEventListener("timeupdate", () => {
    const cur = formatTime(audio.currentTime);
    const dur = formatTime(audio.duration || 0);
    trackTimeDisplay.textContent = `${cur} / ${dur}`;
  });

  sliderVol.addEventListener("input", (e) => {
    if (gainNode) gainNode.gain.value = parseFloat(e.target.value);
  });

  function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  /* Preset Manager */
  const PRESET_STORAGE_KEY = "BLACKMOON_010_PRESET";
  const selectEngine = document.getElementById("select-engine");
  const sliderReactivity = document.getElementById("slider-reactivity");
  const sliderColorshift = document.getElementById("slider-colorshift");
  const btnSavePreset = document.getElementById("btn-save-preset");
  const btnLoadPreset = document.getElementById("btn-load-preset");

  window.VisualizerParams = {
    mode: "vortex",
    reactivity: 1.5,
    hue: 180
  };

  function syncUIFromParams() {
    selectEngine.value = window.VisualizerParams.mode;
    sliderReactivity.value = window.VisualizerParams.reactivity;
    sliderColorshift.value = window.VisualizerParams.hue;
  }

  selectEngine.addEventListener("change", (e) => window.VisualizerParams.mode = e.target.value);
  sliderReactivity.addEventListener("input", (e) => window.VisualizerParams.reactivity = parseFloat(e.target.value));
  sliderColorshift.addEventListener("input", (e) => window.VisualizerParams.hue = parseFloat(e.target.value));

  btnSavePreset.addEventListener("click", () => {
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(window.VisualizerParams));
    btnSavePreset.textContent = "Saved!";
    setTimeout(() => btnSavePreset.textContent = "Save Preset", 1200);
  });

  btnLoadPreset.addEventListener("click", () => {
    const saved = localStorage.getItem(PRESET_STORAGE_KEY);
    if (saved) {
      try {
        window.VisualizerParams = JSON.parse(saved);
        syncUIFromParams();
        btnLoadPreset.textContent = "Loaded!";
        setTimeout(() => btnLoadPreset.textContent = "Restore", 1200);
      } catch (e) {
        console.error("Preset parse error", e);
      }
    }
  });

  // Hydrate preset on launch
  const cachedPreset = localStorage.getItem(PRESET_STORAGE_KEY);
  if (cachedPreset) {
    try {
      window.VisualizerParams = JSON.parse(cachedPreset);
      syncUIFromParams();
    } catch (e) {}
  }
})();