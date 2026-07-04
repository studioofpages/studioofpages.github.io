const SOP = {
  memoryId: new URLSearchParams(window.location.search).get("id") || "0001",
  data: null,
  page: 0,
  pages: ["hero", "album", "letter", "thanks"],
  albumImages: [],
  lightboxIndex: 0,
  touchStartX: 0,
  touchStartY: 0,
  el: {
    track: document.getElementById("pageTrack"),
    dots: document.getElementById("pageDots"),
    title: document.getElementById("memoryTitle"),
    names: document.getElementById("memoryNames"),
    date: document.getElementById("memoryDate"),
    label: document.getElementById("memoryLabel"),
    heroPhoto: document.getElementById("heroPhoto"),
    albumGrid: document.getElementById("albumGrid"),
    letterText: document.getElementById("letterText"),
    thanksText: document.getElementById("thanksText"),
    thanksBrand: document.getElementById("thanksBrand"),
    audio: document.getElementById("memoryAudio"),
    playButton: document.getElementById("playButton"),
    miniAudioButton: document.getElementById("miniAudioButton"),
    playIcon: document.querySelector(".sop-play__icon"),
    audioTitle: document.getElementById("audioTitle"),
    audioSubtitle: document.getElementById("audioSubtitle"),
    progressTrack: document.getElementById("progressTrack"),
    progress: document.getElementById("progressBar"),
    currentTime: document.getElementById("currentTime"),
    durationTime: document.getElementById("durationTime"),
    miniWaveform: document.getElementById("miniWaveform"),
    lightbox: document.getElementById("galleryLightbox"),
    lightboxImage: document.getElementById("lightboxImage"),
    lightboxClose: document.getElementById("lightboxClose"),
    lightboxPrev: document.getElementById("lightboxPrev"),
    lightboxNext: document.getElementById("lightboxNext")
  }
};

function assetPath(filename) {
  return `/data/${SOP.memoryId}/${filename}`;
}

function setText(element, value) {
  if (element) element.textContent = value || "";
}

function normalizeThemeName(theme) {
  return String(theme || "default").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") || "default";
}

function loadTheme(theme) {
  const themeName = normalizeThemeName(theme);
  document.body.dataset.theme = themeName;
  document.body.className = document.body.className.split(" ").filter(c => !c.startsWith("theme-")).join(" ");
  document.body.classList.add(`theme-${themeName}`);
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
    loadTheme(SOP.data.theme || "wedding");
    renderMemory();
    bindIntro();
    bindPages();
    bindAudio();
    bindLightbox();
    renderWaveforms();
    preloadHeroImage();
  } catch (error) {
    console.error(error);
    renderError();
  }
}

function renderMemory() {
  document.body.classList.add("book-mode");
  const fullName = SOP.data.coupleNames || SOP.data.names || SOP.data.title || "";
  document.title = `${fullName || "Memory"} | StudioOfPages`;
  setText(SOP.el.label, "");

  if (SOP.el.title) {
    const parts = fullName.split("&");
    if (parts.length === 2) {
      SOP.el.title.innerHTML = `<span class="memory-name">${parts[0].trim()}</span><span class="memory-amp">&</span><span class="memory-name">${parts[1].trim()}</span>`;
    } else {
      SOP.el.title.innerHTML = `<span class="memory-name">${fullName}</span>`;
    }
  }

  setText(SOP.el.names, "♡");
  setText(SOP.el.date, SOP.data.coupleQuote || SOP.data.subtitle || SOP.data.date || SOP.data.message || "");
  setText(SOP.el.audioTitle, getAudioTitle());
  setText(SOP.el.audioSubtitle, "Tap to hear this moment");
  setText(SOP.el.currentTime, "0:00");
  setText(SOP.el.durationTime, "0:00");

  SOP.el.heroPhoto.src = assetPath(SOP.data.heroImage || SOP.data.photo || "photo.jpg");
  SOP.el.audio.src = assetPath(getAudioFile());

  renderAlbum();
  renderLetter();
  renderThanks();
  renderDots();
  goToPage(0, false);
}

function renderAlbum() {
  const files = Array.isArray(SOP.data.album) && SOP.data.album.length
    ? SOP.data.album
    : Array.isArray(SOP.data.gallery) && SOP.data.gallery.length
      ? SOP.data.gallery
      : ["album1.jpg","album2.jpg","album3.jpg","album4.jpg","album5.jpg","album6.jpg","album7.jpg","album8.jpg","album9.jpg","album10.jpg"];

  SOP.albumImages = files.slice(0, 10).map((item) => typeof item === "string" ? item : item.file).filter(Boolean);
  SOP.el.albumGrid.innerHTML = "";

  SOP.albumImages.forEach((file, index) => {
    const button = document.createElement("button");
    button.className = "sop-album-item";
    button.type = "button";
    button.setAttribute("aria-label", `Open memory photo ${index + 1}`);

    const img = document.createElement("img");
    img.src = assetPath(file);
    img.alt = `Memory photo ${index + 1}`;
    img.loading = "lazy";
    img.onerror = () => {
      if (img.dataset.fallbackApplied === "true") {
        button.classList.add("is-missing");
        button.innerHTML = `<span>Photo ${index + 1}</span>`;
        return;
      }
      img.dataset.fallbackApplied = "true";
      img.src = assetPath(SOP.data.heroImage || SOP.data.photo || "photo.jpg");
    };

    button.appendChild(img);
    button.addEventListener("click", () => openLightbox(index));
    SOP.el.albumGrid.appendChild(button);
  });
}

function renderLetter() {
  const text = SOP.data.letter || SOP.data.longMessage || SOP.data.customerLetter || SOP.data.message || "Every memory becomes timeless when it is kept with love.";
  SOP.el.letterText.innerHTML = "";
  String(text).split(/\n{2,}/).forEach((paragraph) => {
    const p = document.createElement("p");
    p.textContent = paragraph.trim();
    if (p.textContent) SOP.el.letterText.appendChild(p);
  });
}

function renderThanks() {
  setText(SOP.el.thanksText, SOP.data.thankYouText || "Thank you for visiting our memories.");
  setText(SOP.el.thanksBrand, SOP.data.thankYouBrand || SOP.data.brandText || "Created with love by StudioOfPages");
}

function renderDots() {
  SOP.el.dots.innerHTML = "";
  SOP.pages.forEach((page, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "sop-page-dot";
    dot.setAttribute("aria-label", `Go to ${page} page`);
    dot.addEventListener("click", () => goToPage(index));
    SOP.el.dots.appendChild(dot);
  });
}

function goToPage(index, animate = true) {
  SOP.page = Math.max(0, Math.min(index, SOP.pages.length - 1));
  if (!animate) SOP.el.track.style.transition = "none";
  SOP.el.track.style.transform = `translateX(-${SOP.page * 100}vw)`;
  document.querySelectorAll(".sop-page-dot").forEach((dot, i) => dot.classList.toggle("is-active", i === SOP.page));
  if (!animate) requestAnimationFrame(() => { SOP.el.track.style.transition = ""; });
}

function bindPages() {
  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") goToPage(SOP.page + 1);
    if (event.key === "ArrowLeft") goToPage(SOP.page - 1);
    if (event.key === "Escape") closeLightbox();
  });

  SOP.el.track.addEventListener("touchstart", (event) => {
    const t = event.touches[0];
    SOP.touchStartX = t.clientX;
    SOP.touchStartY = t.clientY;
  }, { passive: true });

  SOP.el.track.addEventListener("touchend", (event) => {
    const t = event.changedTouches[0];
    const dx = t.clientX - SOP.touchStartX;
    const dy = t.clientY - SOP.touchStartY;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goToPage(SOP.page + 1);
      else goToPage(SOP.page - 1);
    }
  }, { passive: true });
}

function preloadHeroImage() {
  const image = new Image();
  document.body.classList.add("is-preloading-memory");
  image.onload = image.onerror = () => {
    document.body.classList.remove("is-preloading-memory");
    document.body.classList.add("is-memory-ready");
  };
  image.src = assetPath(SOP.data.heroImage || SOP.data.photo || "photo.jpg");
}

function bindIntro() {
  const intro = document.getElementById("intro");
  if (!intro) return;
  function closeIntro() {
    if (!document.body.classList.contains("is-memory-ready")) return;
    intro.classList.add("is-hidden");
  }
  intro.addEventListener("click", closeIntro);
  setTimeout(closeIntro, 1900);
}

function renderWaveforms() {
  createBars(SOP.el.miniWaveform, 32);
}

function createBars(container, count) {
  if (!container) return;
  container.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const bar = document.createElement("i");
    const wave = Math.abs(Math.sin(i * 0.73));
    bar.style.height = `${16 + wave * 54 + (i % 7) * 3}px`;
    container.appendChild(bar);
  }
}

function bindAudio() {
  if (!SOP.el.audio) return;
  SOP.el.playButton?.addEventListener("click", toggleAudio);
  SOP.el.miniAudioButton?.addEventListener("click", toggleAudio);
  SOP.el.audio.addEventListener("timeupdate", updateProgress);
  SOP.el.audio.addEventListener("loadedmetadata", updateDuration);
  SOP.el.audio.addEventListener("ended", () => {
    setPlaying(false);
    if (SOP.el.progress) SOP.el.progress.style.width = "0%";
    setText(SOP.el.currentTime, "0:00");
  });
  SOP.el.progressTrack?.addEventListener("click", seekAudio);
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
  if (SOP.el.playIcon) SOP.el.playIcon.textContent = isPlaying ? "❚❚" : "▶";
  if (SOP.el.miniAudioButton) SOP.el.miniAudioButton.textContent = isPlaying ? "♪" : "▶";
  setText(SOP.el.audioTitle, isPlaying ? "Playing Memory" : getAudioTitle());
}

function formatTime(seconds) {
  if (!isFinite(seconds)) return "0:00";
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${String(sec).padStart(2, "0")}`;
}

function updateDuration() { setText(SOP.el.durationTime, formatTime(SOP.el.audio.duration)); }
function updateProgress() {
  if (!SOP.el.audio.duration) return;
  const percent = (SOP.el.audio.currentTime / SOP.el.audio.duration) * 100;
  if (SOP.el.progress) SOP.el.progress.style.width = `${percent}%`;
  setText(SOP.el.currentTime, formatTime(SOP.el.audio.currentTime));
  setText(SOP.el.durationTime, formatTime(SOP.el.audio.duration));
}
function seekAudio(event) {
  if (!SOP.el.audio.duration) return;
  const rect = SOP.el.progressTrack.getBoundingClientRect();
  const percent = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
  SOP.el.audio.currentTime = percent * SOP.el.audio.duration;
  updateProgress();
}

function bindLightbox() {
  SOP.el.lightboxClose?.addEventListener("click", closeLightbox);
  SOP.el.lightboxPrev?.addEventListener("click", () => showLightbox(SOP.lightboxIndex - 1));
  SOP.el.lightboxNext?.addEventListener("click", () => showLightbox(SOP.lightboxIndex + 1));
  SOP.el.lightbox?.addEventListener("click", (event) => { if (event.target === SOP.el.lightbox) closeLightbox(); });
}
function openLightbox(index) {
  showLightbox(index);
  SOP.el.lightbox.classList.add("is-open");
  SOP.el.lightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("sop-lightbox-open");
}
function showLightbox(index) {
  if (!SOP.albumImages.length) return;
  SOP.lightboxIndex = (index + SOP.albumImages.length) % SOP.albumImages.length;
  SOP.el.lightboxImage.src = assetPath(SOP.albumImages[SOP.lightboxIndex]);
}
function closeLightbox() {
  SOP.el.lightbox?.classList.remove("is-open");
  SOP.el.lightbox?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("sop-lightbox-open");
}

function renderError() {
  document.body.classList.add("book-mode", "is-memory-ready");
  setText(SOP.el.title, "Memory Not Found");
  setText(SOP.el.date, "This memory page could not be loaded.");
  if (SOP.el.playButton) SOP.el.playButton.disabled = true;
}

loadMemory();
