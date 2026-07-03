const SOP = {
  memoryId: new URLSearchParams(window.location.search).get("id") || "0001",
  data: null,
  galleryIndex: 0,

  el: {
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
    progressTrack: document.getElementById("progressTrack"),
    progress: document.getElementById("progressBar"),
    currentTime: document.getElementById("currentTime"),
    durationTime: document.getElementById("durationTime"),
    miniWaveform: document.getElementById("miniWaveform"),
    largeWaveform: document.getElementById("largeWaveform"),
    gallerySection: document.getElementById("gallerySection"),
    galleryGrid: document.getElementById("galleryGrid"),
    soundSection: document.getElementById("soundSection"),
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

    if (!response.ok) {
      throw new Error("Memory not found");
    }

    SOP.data = await response.json();

    applyTheme();
    renderContent();
    renderMedia();
    renderGallery();
    renderWaveforms();
    bindAudio();
    bindLightbox();
    initScrollReveal();
    initParallax();

  } catch (error) {
    console.error(error);
    renderError();
  }
}

function applyTheme() {
  const theme = SOP.data.theme?.style || SOP.data.theme || "wedding";
  document.body.classList.add(`theme-${theme}`);
}

function renderContent() {
  document.title = `${SOP.data.title || "Memory"} | StudioOfPages`;

  setText(SOP.el.label, SOP.data.label || "StudioOfPages Memories");
  setText(SOP.el.title, SOP.data.title || "Untitled Memory");
  setText(SOP.el.names, SOP.data.names || "");
  setText(SOP.el.date, SOP.data.date || "");
  setText(SOP.el.message, SOP.data.message || "");

  setText(
    SOP.el.storyTitle,
    SOP.data.story?.title || SOP.data.storyTitle || "A moment worth remembering."
  );

  setText(
    SOP.el.endingQuote,
    SOP.data.footer?.quote || "Every memory deserves to be remembered."
  );

  setText(
    SOP.el.endingNames,
    SOP.data.names ? `Created for ${SOP.data.names}` : ""
  );

  setText(SOP.el.audioTitle, getAudioTitle());
  setText(SOP.el.audioSubtitle, "Tap to hear this moment");
}

function renderMedia() {
  SOP.el.heroPhoto.src = assetPath(SOP.data.photo || "photo.jpg");
  SOP.el.audio.src = assetPath(getAudioFile());
}

function renderGallery() {
  const gallery = SOP.data.gallery || [];
  SOP.el.galleryGrid.innerHTML = "";

  if (!gallery.length) {
    SOP.el.gallerySection.style.display = "none";
    return;
  }

  SOP.el.gallerySection.style.display = "block";

  gallery.slice(0, 6).forEach((photo, index) => {
    const card = document.createElement("div");
    card.className = "sop-gallery__card";

    const img = document.createElement("img");
    img.src = assetPath(photo);
    img.alt = "Memory gallery photo";

    card.appendChild(img);
    card.addEventListener("click", () => openLightbox(index));

    SOP.el.galleryGrid.appendChild(card);
  });
}

function renderWaveforms() {
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
  SOP.el.audio.addEventListener("loadedmetadata", updateDuration);

  SOP.el.audio.addEventListener("ended", () => {
    setPlaying(false);
    SOP.el.progress.style.width = "0%";
    setText(SOP.el.currentTime, "0:00");
  });

  SOP.el.progressTrack.addEventListener("click", seekAudio);
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
  setText(SOP.el.audioTitle, isPlaying ? "Playing Memory" : getAudioTitle());
  setText(SOP.el.audioSubtitle, isPlaying ? "Your sound is now playing" : "Tap to hear this moment");
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
  SOP.el.progress.style.width = `${percent}%`;

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

function getGalleryItems() {
  return SOP.data.gallery || [];
}

function openLightbox(index) {
  const gallery = getGalleryItems();
  if (!gallery.length) return;

  SOP.galleryIndex = index;
  SOP.el.lightboxImage.src = assetPath(gallery[SOP.galleryIndex]);

  SOP.el.lightbox.classList.add("is-open");
  SOP.el.lightbox.setAttribute("aria-hidden", "false");
}

function closeLightbox() {
  SOP.el.lightbox.classList.remove("is-open");
  SOP.el.lightbox.setAttribute("aria-hidden", "true");
}

function changeLightbox(direction) {
  const gallery = getGalleryItems();
  if (!gallery.length) return;

  SOP.galleryIndex =
    (SOP.galleryIndex + direction + gallery.length) % gallery.length;

  SOP.el.lightboxImage.src = assetPath(gallery[SOP.galleryIndex]);
}

function bindLightbox() {
  if (!SOP.el.lightbox) return;

  SOP.el.lightboxClose.addEventListener("click", closeLightbox);
  SOP.el.lightboxPrev.addEventListener("click", () => changeLightbox(-1));
  SOP.el.lightboxNext.addEventListener("click", () => changeLightbox(1));

  SOP.el.lightbox.addEventListener("click", (event) => {
    if (event.target === SOP.el.lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (event) => {
    if (!SOP.el.lightbox.classList.contains("is-open")) return;

    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowLeft") changeLightbox(-1);
    if (event.key === "ArrowRight") changeLightbox(1);
  });
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

function initParallax() {
  let ticking = false;

  function update() {
    const scrollY = window.scrollY || 0;
    const hero = document.querySelector(".sop-hero");

    if (!hero) return;

    const limited = Math.min(scrollY, hero.offsetHeight);
    const parallax = limited * 0.12;

    document.documentElement.style.setProperty("--hero-parallax", `${parallax}px`);

    ticking = false;
  }

  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });

  update();
}

function renderError() {
  setText(SOP.el.title, "Memory Not Found");
  setText(SOP.el.names, "StudioOfPages");
  setText(SOP.el.message, "This memory page could not be loaded.");

  if (SOP.el.gallerySection) SOP.el.gallerySection.style.display = "none";
  if (SOP.el.soundSection) SOP.el.soundSection.style.display = "none";
  if (SOP.el.playButton) SOP.el.playButton.disabled = true;
}

loadMemory();