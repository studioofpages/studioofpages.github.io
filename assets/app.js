const SOP = {
  memoryId: new URLSearchParams(window.location.search).get("id") || "0001",
  data: null,

  el: {
    title: document.getElementById("memoryTitle"),
    names: document.getElementById("memoryNames"),
    date: document.getElementById("memoryDate"),
    message: document.getElementById("memoryMessage"),
    label: document.getElementById("memoryLabel"),
    heroPhoto: document.getElementById("heroPhoto"),
    audio: document.getElementById("memoryAudio"),
    playButton: document.getElementById("playButton"),
    playIcon: document.querySelector(".sop-play__icon"),
    audioTitle: document.getElementById("audioTitle"),
    audioSubtitle: document.getElementById("audioSubtitle"),
    progressTrack: document.getElementById("progressTrack"),
    progress: document.getElementById("progressBar"),
    currentTime: document.getElementById("currentTime"),
    durationTime: document.getElementById("durationTime"),
    miniWaveform: document.getElementById("miniWaveform"),
    storySection: document.getElementById("storySection"),
    gallerySection: document.getElementById("gallerySection"),
    soundSection: document.getElementById("soundSection")
  }
};

function assetPath(filename) {
  return `../data/${SOP.memoryId}/${filename}`;
}

function setText(element, value) {
  if (element) element.textContent = value || "";
}

function getAudioFile() {
  if (!SOP.data.audio) return "audio.mp3";
  if (typeof SOP.data.audio === "string") return SOP.data.audio;
  return SOP.data.audio.file || "audio.mp3";
}

function getAudioTitle() {
  if (!SOP.data.audio) return "Play Memory";
  if (typeof SOP.data.audio === "string") return "Play Memory";
  return SOP.data.audio.title || "Play Memory";
}

async function loadMemory() {
  try {
    const response = await fetch(assetPath("memory.json"), { cache: "no-store" });

    if (!response.ok) throw new Error("Memory not found");

    SOP.data = await response.json();

    if (SOP.data.layout === "single") {
      renderSingleExperience();
      bindAudio();
      renderWaveforms();
      hideIntro();
      return;
    }

    renderError();
  } catch (error) {
    console.error(error);
    renderError();
  }
}

function renderSingleExperience() {
  document.body.classList.add("single-mode");

  document.title = `${SOP.data.coupleNames || SOP.data.names || "Memory"} | StudioOfPages`;

  setText(SOP.el.label, "");
  setText(SOP.el.title, SOP.data.coupleNames || SOP.data.names || "");
  setText(SOP.el.names, "♡");
  setText(SOP.el.date, SOP.data.coupleQuote || SOP.data.message || "");
  setText(SOP.el.message, "");
  setText(SOP.el.audioTitle, getAudioTitle());
  setText(SOP.el.audioSubtitle, "");
  setText(SOP.el.currentTime, "0:00");
  setText(SOP.el.durationTime, "0:00");

  if (SOP.el.heroPhoto) {
    SOP.el.heroPhoto.src = assetPath(SOP.data.heroImage || SOP.data.photo || "photo.jpg");
  }

  if (SOP.el.audio) {
    SOP.el.audio.src = assetPath(getAudioFile());
  }

  if (SOP.el.storySection) SOP.el.storySection.style.display = "none";
  if (SOP.el.gallerySection) SOP.el.gallerySection.style.display = "none";
  if (SOP.el.soundSection) SOP.el.soundSection.style.display = "none";

  const heroContent = document.querySelector(".sop-hero__content");

  if (heroContent && !document.querySelector(".sop-single-brand")) {
    const brand = document.createElement("div");
    brand.className = "sop-single-brand";
    brand.textContent = SOP.data.brandText || "STUDIO OF PAGES";
    heroContent.appendChild(brand);
  }
}

function hideIntro() {
  const intro = document.getElementById("intro");

  if (!intro) return;

  setTimeout(() => {
    intro.classList.add("is-hidden");
  }, 900);
}

function renderWaveforms() {
  createBars(SOP.el.miniWaveform, 32, "mini");
}

function createBars(container, count, size) {
  if (!container) return;

  container.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const bar = document.createElement("i");
    const wave = Math.abs(Math.sin(i * 0.73));
    const variation = (i % 7) * 3;
    const base = size === "large" ? 28 : 16;
    const scale = size === "large" ? 96 : 54;

    bar.style.height = `${base + wave * scale + variation}px`;
    container.appendChild(bar);
  }
}

function bindAudio() {
  if (!SOP.el.audio || !SOP.el.playButton) return;

  SOP.el.playButton.addEventListener("click", toggleAudio);
  SOP.el.audio.addEventListener("timeupdate", updateProgress);
  SOP.el.audio.addEventListener("loadedmetadata", updateDuration);

  SOP.el.audio.addEventListener("ended", () => {
    setPlaying(false);
    if (SOP.el.progress) SOP.el.progress.style.width = "0%";
    setText(SOP.el.currentTime, "0:00");
  });

  if (SOP.el.progressTrack) {
    SOP.el.progressTrack.addEventListener("click", seekAudio);
  }
}

async function toggleAudio() {
  try {
    if (SOP.el.audio.paused) {
      await SOP.el.audio.play();
      setPlaying(true);
    } else {
      SOP.el.audio.pause();
      setPlaying(false);
    }
  } catch (error) {
    setText(SOP.el.audioSubtitle, "Tap again to play");
  }
}

function setPlaying(isPlaying) {
  document.body.classList.toggle("is-playing", isPlaying);

  if (SOP.el.playIcon) {
    SOP.el.playIcon.textContent = isPlaying ? "❚❚" : "▶";
  }

  setText(SOP.el.audioTitle, isPlaying ? "Playing Memory" : getAudioTitle());
}

function formatTime(seconds) {
  if (!isFinite(seconds)) return "0:00";

  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);

  return `${min}:${String(sec).padStart(2, "0")}`;
}

function updateDuration() {
  setText(SOP.el.durationTime, formatTime(SOP.el.audio.duration));
}

function updateProgress() {
  if (!SOP.el.audio.duration) return;

  const percent = (SOP.el.audio.currentTime / SOP.el.audio.duration) * 100;

  if (SOP.el.progress) {
    SOP.el.progress.style.width = `${percent}%`;
  }

  setText(SOP.el.currentTime, formatTime(SOP.el.audio.currentTime));
  setText(SOP.el.durationTime, formatTime(SOP.el.audio.duration));
}

function seekAudio(event) {
  if (!SOP.el.audio.duration) return;

  const rect = SOP.el.progressTrack.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const percent = Math.min(Math.max(clickX / rect.width, 0), 1);

  SOP.el.audio.currentTime = percent * SOP.el.audio.duration;
  updateProgress();
}

function renderError() {
  setText(SOP.el.title, "Memory Not Found");
  setText(SOP.el.names, "StudioOfPages");
  setText(SOP.el.date, "This memory page could not be loaded.");

  if (SOP.el.playButton) SOP.el.playButton.disabled = true;
}

loadMemory();