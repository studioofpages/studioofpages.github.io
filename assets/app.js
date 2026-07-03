const SOP = {
  memoryId: new URLSearchParams(window.location.search).get("id") || "0001",
  data: null,

  el: {
    body: document.body,
    title: document.getElementById("memoryTitle"),
    names: document.getElementById("memoryNames"),
    date: document.getElementById("memoryDate"),
    message: document.getElementById("memoryMessage"),
    storyTitle: document.getElementById("storyTitle"),
    endingQuote: document.getElementById("endingQuote"),
    endingNames: document.getElementById("endingNames"),
    label: document.getElementById("memoryLabel"),
    heroPhoto: document.getElementById("heroPhoto"),
    audio: document.getElementById("memoryAudio"),
    playButton: document.getElementById("playButton"),
    playIcon: document.querySelector(".sop-play__icon"),
    audioTitle: document.getElementById("audioTitle"),
    audioSubtitle: document.getElementById("audioSubtitle"),
    progress: document.getElementById("progressBar"),
    currentTime: document.getElementById("currentTime"),
durationTime: document.getElementById("durationTime"),
    miniWaveform: document.getElementById("miniWaveform"),
    largeWaveform: document.getElementById("largeWaveform"),
    gallerySection: document.getElementById("gallerySection"),
    galleryGrid: document.getElementById("galleryGrid"),
    soundSection: document.getElementById("soundSection")
  }
};

function assetPath(filename) {
  return `/data/${SOP.memoryId}/${filename}`;
}
function setText(element, value) {
  if (element) element.textContent = value || "";
}

async function loadMemory() {
  try {
    const response = await fetch(assetPath("memory.json"), { cache: "no-store" });

    if (!response.ok) {
      throw new Error("Memory not found");
    }

    SOP.data = await response.json();

    applyTheme();
    renderContent();
    renderMedia();
    renderGallery();
    renderWaveformFallback();
    bindAudio();

  } catch (error) {
    renderError();
  }
}

function applyTheme() {
  const theme = SOP.data.theme?.style || "wedding";
  document.body.classList.add(`theme-${theme}`);
}

function renderContent() {
  document.title = `${SOP.data.title || "Memory"} | StudioOfPages`;

  setText(SOP.el.label, SOP.data.label || "StudioOfPages Memories");
  setText(SOP.el.title, SOP.data.title || "Untitled Memory");
  setText(SOP.el.names, SOP.data.names || "");
  setText(SOP.el.date, SOP.data.date || "");
  setText(SOP.el.message, SOP.data.message || "");
  setText(SOP.el.storyTitle, SOP.data.story?.title || SOP.data.storyTitle || "A moment worth remembering.");
  setText(SOP.el.endingQuote, SOP.data.footer?.quote || "Every memory deserves to be remembered.");
  setText(SOP.el.endingNames, SOP.data.names ? `Created for ${SOP.data.names}` : "");

  const audioTitle = SOP.data.audio?.title || "Play Memory";
  setText(SOP.el.audioTitle, audioTitle);
  setText(SOP.el.audioSubtitle, "Tap to hear this moment");
}

function renderMedia() {
  const photo = SOP.data.photo || "photo.jpg";
  const audioFile = SOP.data.audio?.file || SOP.data.audio || "audio.mp3";

  SOP.el.heroPhoto.src = assetPath(photo);
  SOP.el.audio.src = assetPath(audioFile);
}

function renderGallery() {
  const gallery = SOP.data.gallery || [];

  SOP.el.galleryGrid.innerHTML = "";

  if (!gallery.length) {
    SOP.el.gallerySection.style.display = "none";
    return;
  }

  SOP.el.gallerySection.style.display = "block";

  gallery.slice(0, 6).forEach((photo) => {
    const card = document.createElement("div");
    card.className = "sop-gallery__card";

    const img = document.createElement("img");
    img.src = assetPath(photo);
    img.alt = "Memory gallery photo";

    card.appendChild(img);
    SOP.el.galleryGrid.appendChild(card);
  });
}

function renderWaveformFallback() {
  createBars(SOP.el.miniWaveform, 32, "mini");
  createBars(SOP.el.largeWaveform, 72, "large");
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
  SOP.el.playButton.addEventListener("click", toggleAudio);

  SOP.el.audio.addEventListener("timeupdate", updateProgress);
  SOP.el.audio.addEventListener("loadedmetadata", () => {

    SOP.el.durationTime.textContent =
        formatTime(SOP.el.audio.duration);

});

  SOP.el.audio.addEventListener("ended", () => {
    setPlaying(false);
    SOP.el.progress.style.width = "0%";
  });
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

  SOP.el.playIcon.textContent = isPlaying ? "❚❚" : "▶";
  setText(SOP.el.audioTitle, isPlaying ? "Playing Memory" : (SOP.data.audio?.title || "Play Memory"));
  setText(SOP.el.audioSubtitle, isPlaying ? "Your sound is now playing" : "Tap to hear this moment");
}
function formatTime(seconds) {

    if (!isFinite(seconds)) return "0:00";

    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);

    return `${min}:${String(sec).padStart(2,"0")}`;
}
function updateProgress() {

    if (!SOP.el.audio.duration) return;

    const percent =
        (SOP.el.audio.currentTime / SOP.el.audio.duration) * 100;

    SOP.el.progress.style.width = `${percent}%`;

    SOP.el.currentTime.textContent =
        formatTime(SOP.el.audio.currentTime);

    SOP.el.durationTime.textContent =
        formatTime(SOP.el.audio.duration);

}

function renderError() {
  setText(SOP.el.title, "Memory Not Found");
  setText(SOP.el.names, "StudioOfPages");
  setText(SOP.el.message, "This memory page could not be loaded.");
  SOP.el.gallerySection.style.display = "none";
  SOP.el.soundSection.style.display = "none";
  SOP.el.playButton.disabled = true;
}
function initScrollReveal() {
  const sections = document.querySelectorAll(".sop-section");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      }
    });
  }, {
    threshold: 0.22,
    rootMargin: "0px 0px -80px 0px"
  });

  sections.forEach((section) => observer.observe(section));
}

initScrollReveal();
loadMemory();