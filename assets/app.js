const SOP = {
  memoryId: new URLSearchParams(window.location.search).get("id") || "0001",
  data: null,
  page: 0,
  pages: [],
  pageElements: {},
  albumImages: [],
  audioReady: false,
  lightboxIndex: 0,
  touchStartX: 0,
  touchStartY: 0,
  lightboxTouchStartX: 0,
  startRequested: false,
  introStarted: false,
  el: {
    intro: document.getElementById("intro"),
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
    prevPage: document.getElementById("prevPage"),
    nextPage: document.getElementById("nextPage"),
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


function isMovieTheme() {
  return normalizeThemeName(SOP.data?.theme) === "movie";
}

function getDisplayNames() {
  return String(SOP.data?.names || SOP.data?.coupleNames || SOP.data?.castNames || "").trim();
}

function splitCastNames() {
  const raw = getDisplayNames();
  return raw
    .split(/\s*&\s*|\s+and\s+|\s*,\s*/i)
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, 4);
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

function getLetterText() {
  return String(SOP.data.letter || SOP.data.longMessage || SOP.data.customerLetter || "").trim();
}

function imageExists(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = `${assetPath(file)}?check=${Date.now()}`;
  });
}

async function fileExists(file) {
  try {
    const response = await fetch(assetPath(file), { cache: "no-store" });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function loadMemory() {
  try {
    const response = await fetch(assetPath("memory.json"), { cache: "no-store" });
    if (!response.ok) throw new Error("Memory not found");
    SOP.data = await response.json();
    loadTheme(SOP.data.theme || "wedding");

    // FAST LOAD FIX:
    // Sayfaları ve oynatıcıyı hiçbir fotoğraf/ses kontrolünü bekletmeden kur.
    renderMemory();
    bindIntro();
    bindPages();
    bindAudio();
    bindLightbox();
    renderWaveforms();
    preloadHeroImage();

    if (window.__SOP_INTRO_REQUESTED) startExperience();
  } catch (error) {
    console.error(error);
    renderError();
  }
}

function renderMemory() {
  document.body.classList.add("book-mode");
  const movie = isMovieTheme();
  const displayNames = getDisplayNames();
  const fullName = movie
    ? (SOP.data.movieTitle || SOP.data.title || "The Story Of Us")
    : (SOP.data.coupleNames || SOP.data.names || SOP.data.title || "");

  document.title = `${fullName || "Memory"} | StudioOfPages`;
  setText(SOP.el.label, movie ? "Now Showing" : "");

  if (SOP.el.title) {
    if (movie) {
      SOP.el.title.innerHTML = `<span class="movie-title-line">${fullName}</span>`;
    } else {
      const parts = fullName.split("&");
      if (parts.length === 2) {
        SOP.el.title.innerHTML = `<span class="memory-name">${parts[0].trim()}</span><span class="memory-amp">&</span><span class="memory-name">${parts[1].trim()}</span>`;
      } else {
        SOP.el.title.innerHTML = `<span class="memory-name">${fullName}</span>`;
      }
    }
  }

  setText(SOP.el.names, movie ? (displayNames || "Based On A True Story") : "♡");
  setText(
    SOP.el.date,
    movie
      ? (SOP.data.tagline || SOP.data.coupleQuote || SOP.data.subtitle || SOP.data.date || SOP.data.message || "A personal film based on true moments.")
      : (SOP.data.coupleQuote || SOP.data.subtitle || SOP.data.date || SOP.data.message || "")
  );
  setText(SOP.el.audioTitle, movie ? (getAudioTitle() === "Play Memory" ? "Official Soundtrack" : getAudioTitle()) : getAudioTitle());
  setText(SOP.el.audioSubtitle, movie ? "Tap to play this scene" : "Music is ready");
  setText(SOP.el.currentTime, "0:00");
  setText(SOP.el.durationTime, "0:00");

  const heroFile = SOP.data.heroImage || SOP.data.photo || "photo.jpg";
  SOP.el.heroPhoto.src = assetPath(heroFile);
  document.body.style.setProperty("--sop-hero-bg", `url("${assetPath(heroFile)}")`);

  prepareAudio();
  renderAlbum();
  renderLetter();
  renderThanks();
  renderMovieTheme();
  buildPages();
  renderDots();
  goToPage(0, false);
}

function prepareAudio() {
  const audioFile = getAudioFile();
  SOP.audioReady = Boolean(audioFile);

  if (SOP.audioReady && SOP.el.audio) {
    SOP.el.audio.src = assetPath(audioFile);
    SOP.el.audio.load?.();
    document.body.classList.remove("no-audio");

    SOP.el.audio.addEventListener("error", () => {
      SOP.audioReady = false;
      document.body.classList.add("no-audio");
      document.body.classList.remove("is-playing");
      setText(SOP.el.audioSubtitle, "Music file not found");
    }, { once: true });
  } else if (SOP.el.audio) {
    SOP.el.audio.removeAttribute("src");
    document.body.classList.add("no-audio");
    document.body.classList.remove("is-playing");
  }
}

function renderAlbum() {
  const configuredFiles = Array.isArray(SOP.data.album) && SOP.data.album.length
    ? SOP.data.album.map((item) => typeof item === "string" ? item : item.file).filter(Boolean)
    : Array.isArray(SOP.data.gallery) && SOP.data.gallery.length
      ? SOP.data.gallery.map((item) => typeof item === "string" ? item : item.file).filter(Boolean)
      : [];

  const defaultFiles = Array.from({ length: 9 }, (_, i) => `photo${i + 2}.jpg`);
  const heroFile = SOP.data.heroImage || SOP.data.photo || "photo.jpg";

  // Bekleme yok: imageExists ile tek tek kontrol etmiyoruz.
  // Görsel yoksa img.onerror ile kartı otomatik kaldırıyoruz.
  SOP.albumImages = [...new Set([...(configuredFiles || []), ...defaultFiles])]
    .filter((file) => file && file !== "photo.jpg" && file !== heroFile)
    .slice(0, 10);

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
    img.decoding = "async";

    img.onerror = () => {
      const removeIndex = SOP.albumImages.indexOf(file);
      if (removeIndex > -1) SOP.albumImages.splice(removeIndex, 1);
      button.remove();
      if (!SOP.albumImages.length) {
        buildPages();
        renderDots();
        goToPage(Math.min(SOP.page, SOP.pages.length - 1), false);
      }
    };

    button.appendChild(img);
    button.addEventListener("click", () => openLightbox(SOP.albumImages.indexOf(file)));
    SOP.el.albumGrid.appendChild(button);
  });
}

function renderLetter() {
  const text = getLetterText();
  SOP.el.letterText.innerHTML = "";
  if (!text) return;

  text.split(/\n{2,}/).forEach((paragraph) => {
    const p = document.createElement("p");
    p.textContent = paragraph.trim();
    if (p.textContent) SOP.el.letterText.appendChild(p);
  });
}

function renderThanks() {
  setText(SOP.el.thanksText, SOP.data.thankYouText || "Thank you for visiting our memories.");
  setText(SOP.el.thanksBrand, SOP.data.thankYouBrand || SOP.data.brandText || "STUDIO OF PAGES");
}


function renderMovieTheme() {
  const track = SOP.el.track;
  if (!track) return;

  document.querySelectorAll(".sop-movie-extra-page").forEach((el) => el.remove());

  const intro = SOP.el.intro;
  if (intro && isMovieTheme()) {
    const icon = intro.querySelector(".sop-intro__heart");
    const tap = intro.querySelector(".sop-intro__tap");
    const brand = intro.querySelector(".sop-intro__brand strong");
    const sub = intro.querySelector(".sop-intro__brand span");
    if (icon) icon.textContent = "🎬";
    if (tap) tap.textContent = "Tap to Watch The Story";
    if (brand) brand.textContent = "Studio Of Pages Presents";
    if (sub) sub.textContent = "A Film Based On True Moments";
  }

  const albumLabel = document.querySelector('[data-page="album"] .sop-section__label');
  const albumTitle = document.querySelector('[data-page="album"] .sop-section__title');
  const thanksCard = document.querySelector('[data-page="thanks"] .sop-thanks-card h2');
  const letterHeart = document.querySelector('[data-page="letter"] .sop-letter-heart');
  const thanksHeart = document.querySelector('[data-page="thanks"] .sop-thanks-heart');

  if (!isMovieTheme()) {
    if (albumLabel) albumLabel.textContent = "Our Memories";
    if (albumTitle) albumTitle.textContent = "A little album of moments.";
    if (thanksCard) thanksCard.textContent = "Thank You";
    if (letterHeart) letterHeart.textContent = "♡";
    if (thanksHeart) thanksHeart.textContent = "♡";
    return;
  }

  if (albumLabel) albumLabel.textContent = "Scenes From The Movie";
  if (albumTitle) albumTitle.textContent = "Selected scenes from this story.";
  if (thanksCard) thanksCard.textContent = "The End";
  if (letterHeart) letterHeart.textContent = "FADE IN";
  if (thanksHeart) thanksHeart.textContent = "★";
  setText(SOP.el.thanksText, SOP.data.thankYouText || "Until the next chapter...");
  setText(SOP.el.thanksBrand, SOP.data.thankYouBrand || "A Studio Of Pages Original");

  const castNames = splitCastNames();
  const title = SOP.data.movieTitle || SOP.data.title || "The Story Of Us";
  const releaseDate = SOP.data.date || SOP.data.subtitle || "Forever";
  const musicTitle = getAudioTitle() === "Play Memory" ? "Official Soundtrack" : getAudioTitle();

  const castPage = document.createElement("section");
  castPage.className = "sop-book-page sop-page-movie-cast sop-movie-extra-page";
  castPage.dataset.page = "movieCast";
  castPage.innerHTML = `
    <div class="sop-page-inner sop-movie-cast-card">
      <p class="sop-section__label">Meet The Cast</p>
      <h2 class="sop-section__title">Starring in ${escapeHtml(title)}</h2>
      <div class="sop-movie-cast-grid">
        ${(castNames.length ? castNames : ["The Main Character"]).map((name, index) => `
          <article class="sop-movie-cast-member">
            <span>${index === 0 ? "Lead Role" : index === 1 ? "Co-Star" : "Special Appearance"}</span>
            <strong>${escapeHtml(name)}</strong>
            <small>${index === 0 ? "as The One Who Started It All" : index === 1 ? "as The One Who Made It Unforgettable" : "as A Beautiful Part Of The Story"}</small>
          </article>
        `).join("")}
      </div>
    </div>`;

  const creditsPage = document.createElement("section");
  creditsPage.className = "sop-book-page sop-page-movie-credits sop-movie-extra-page";
  creditsPage.dataset.page = "movieCredits";
  creditsPage.innerHTML = `
    <div class="sop-page-inner sop-movie-credits-card">
      <div class="sop-movie-credits-roll">
        <p>Studio Of Pages Presents</p>
        <h2>${escapeHtml(title)}</h2>
        <p>Based On True Moments</p>
        <p>Starring</p>
        <strong>${escapeHtml(getDisplayNames() || title)}</strong>
        <p>Release Date</p>
        <strong>${escapeHtml(releaseDate)}</strong>
        <p>Official Soundtrack</p>
        <strong>${escapeHtml(musicTitle)}</strong>
        <p>Directed By</p>
        <strong>Love</strong>
        <p>Produced By</p>
        <strong>Memory</strong>
        <p>Running Time</p>
        <strong>Forever</strong>
        <h3>THE END</h3>
      </div>
    </div>`;

  const albumPage = document.querySelector('[data-page="album"]');
  if (albumPage) track.insertBefore(castPage, albumPage);
  const thanksPage = document.querySelector('[data-page="thanks"]');
  if (thanksPage) track.insertBefore(creditsPage, thanksPage);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildPages() {
  SOP.pageElements = {
    hero: document.querySelector('[data-page="hero"]'),
    movieCast: document.querySelector('[data-page="movieCast"]'),
    album: document.querySelector('[data-page="album"]'),
    letter: document.querySelector('[data-page="letter"]'),
    movieCredits: document.querySelector('[data-page="movieCredits"]'),
    thanks: document.querySelector('[data-page="thanks"]')
  };

  SOP.pages = ["hero"];
  if (isMovieTheme() && SOP.pageElements.movieCast) SOP.pages.push("movieCast");
  if (SOP.albumImages.length) SOP.pages.push("album");
  if (getLetterText()) SOP.pages.push("letter");
  if (isMovieTheme() && SOP.pageElements.movieCredits) SOP.pages.push("movieCredits");
  SOP.pages.push("thanks");

  Object.entries(SOP.pageElements).forEach(([name, element]) => {
    if (!element) return;
    element.hidden = !SOP.pages.includes(name);
    element.style.display = SOP.pages.includes(name) ? "" : "none";
  });

  if (SOP.el.track) SOP.el.track.style.width = `${SOP.pages.length * 100}vw`;
  document.body.dataset.pageCount = String(SOP.pages.length);
}

function renderDots() {
  SOP.el.dots.innerHTML = "";
  SOP.pages.forEach((page, index) => {
    const dot = document.createElement("span");
    dot.className = "sop-page-dot";
    dot.setAttribute("aria-hidden", "true");
    SOP.el.dots.appendChild(dot);
  });
}

function goToPage(index, animate = true) {
  SOP.page = Math.max(0, Math.min(index, SOP.pages.length - 1));
  if (!animate) SOP.el.track.style.transition = "none";
  SOP.el.track.style.transform = `translateX(-${SOP.page * 100}vw)`;
  document.querySelectorAll(".sop-page-dot").forEach((dot, i) => dot.classList.toggle("is-active", i === SOP.page));
  if (SOP.el.prevPage) SOP.el.prevPage.disabled = SOP.page === 0;
  if (SOP.el.nextPage) SOP.el.nextPage.disabled = SOP.page === SOP.pages.length - 1;
  if (!animate) requestAnimationFrame(() => { SOP.el.track.style.transition = ""; });
}

function bindPages() {
  SOP.el.prevPage?.addEventListener("click", () => goToPage(SOP.page - 1));
  SOP.el.nextPage?.addEventListener("click", () => goToPage(SOP.page + 1));

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
    if (SOP.startRequested) startExperience();
  };
  image.src = assetPath(SOP.data.heroImage || SOP.data.photo || "photo.jpg");
}

function bindIntro() {
  const intro = SOP.el.intro;
  if (!intro || intro.dataset.bound === "true") return;
  intro.dataset.bound = "true";

  const requestStart = (event) => {
    if (event) {
      if (event.cancelable) event.preventDefault?.();
      event.stopPropagation?.();
    }

    window.__SOP_INTRO_REQUESTED = true;
    SOP.startRequested = true;

    document.body.classList.remove("is-preloading-memory");
    document.body.classList.add("is-memory-ready", "sop-intro-opened");

    intro.classList.add("is-hidden", "force-hidden");
    intro.setAttribute("aria-hidden", "true");
    intro.style.opacity = "0";
    intro.style.visibility = "hidden";
    intro.style.pointerEvents = "none";
    intro.style.display = "none";

    startExperience();
  };

  ["pointerdown", "touchstart", "mousedown", "click"].forEach((eventName) => {
    intro.addEventListener(eventName, requestStart, { passive: false, capture: true });
  });

  intro.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") requestStart(event);
  }, { capture: true });

  if (window.__SOP_INTRO_REQUESTED) requestStart();
}


async function startExperience() {
  const intro = SOP.el.intro;
  if (!intro || SOP.introStarted) return;
  SOP.introStarted = true;

  document.body.classList.remove("is-preloading-memory");
  document.body.classList.add("is-memory-ready", "sop-intro-opened");

  intro.classList.add("is-hidden", "force-hidden");
  intro.setAttribute("aria-hidden", "true");
  intro.style.opacity = "0";
  intro.style.visibility = "hidden";
  intro.style.pointerEvents = "none";
  intro.style.display = "none";

  if (SOP.audioReady && SOP.el.audio) {
    try {
      await SOP.el.audio.play();
      setPlaying(true);
    } catch (error) {
      setPlaying(false);
    }
  }
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
  if (!SOP.el.audio || !SOP.audioReady) return;
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
  if (!SOP.audioReady) return;
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
  setText(SOP.el.audioTitle, isPlaying ? (isMovieTheme() ? "Now Playing" : "Playing Memory") : (isMovieTheme() && getAudioTitle() === "Play Memory" ? "Official Soundtrack" : getAudioTitle()));
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

  SOP.el.lightbox?.addEventListener("touchstart", (event) => {
    SOP.lightboxTouchStartX = event.touches[0].clientX;
  }, { passive: true });

  SOP.el.lightbox?.addEventListener("touchend", (event) => {
    const dx = event.changedTouches[0].clientX - SOP.lightboxTouchStartX;
    if (Math.abs(dx) > 50) {
      if (dx < 0) showLightbox(SOP.lightboxIndex + 1);
      else showLightbox(SOP.lightboxIndex - 1);
    }
  }, { passive: true });
}
function openLightbox(index) {
  if (!SOP.albumImages.length) return;
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

// Intro listener is bound immediately so first tap/click never gets missed.
bindIntro();
loadMemory();

/* =========================================================
   Movie Theme v3.0 — cinematic layer
   Safe override: only activates when memory.json has "theme": "movie".
========================================================= */
function getMovieMeta() {
  const movie = (SOP.data && typeof SOP.data.movie === "object") ? SOP.data.movie : {};
  const title = SOP.data?.movieTitle || movie.title || SOP.data?.title || "The Story Of Us";
  const names = getDisplayNames() || SOP.data?.coupleNames || SOP.data?.names || title;
  const tagline = movie.tagline || SOP.data?.tagline || SOP.data?.subtitle || SOP.data?.coupleQuote || "Based on a True Story";
  const releaseDate = movie.releaseDate || movie.date || SOP.data?.date || "Forever";
  const rating = movie.rating || "★★★★★";
  const genre = movie.genre || "Romance";
  const duration = movie.duration || "Forever";
  const director = movie.director || "Love";
  const producer = movie.producer || "Destiny";
  const studio = movie.studio || "Studio Of Pages";
  const soundtrack = getAudioTitle() === "Play Memory" ? (movie.soundtrack || "Official Soundtrack") : getAudioTitle();
  return { title, names, tagline, releaseDate, rating, genre, duration, director, producer, studio, soundtrack };
}

function decorateMovieHero(meta) {
  const hero = document.querySelector('[data-page="hero"] .sop-hero__content');
  if (!hero || hero.dataset.movieV3 === "true") return;
  hero.dataset.movieV3 = "true";

  const posterTop = document.createElement("div");
  posterTop.className = "sop-movie-poster-top sop-movie-v3-only";
  posterTop.innerHTML = `
    <span>${escapeHtml(meta.rating)}</span>
    <strong>NOW SHOWING</strong>
    <span>${escapeHtml(meta.genre)}</span>
  `;
  hero.insertBefore(posterTop, hero.firstChild);

  const metaLine = document.createElement("div");
  metaLine.className = "sop-movie-poster-meta sop-movie-v3-only";
  metaLine.innerHTML = `
    <span>${escapeHtml(meta.releaseDate)}</span>
    <span>${escapeHtml(meta.duration)}</span>
    <span>PRIVATE SCREENING</span>
  `;
  const date = SOP.el.date;
  if (date && date.parentNode === hero) date.insertAdjacentElement("afterend", metaLine);

  const cta = document.createElement("button");
  cta.className = "sop-movie-play-story sop-movie-v3-only";
  cta.type = "button";
  cta.innerHTML = `<span>▶</span> Play Story`;
  cta.addEventListener("click", () => {
    if (SOP.audioReady && SOP.el.audio && SOP.el.audio.paused) toggleAudio();
    goToPage(Math.min(1, SOP.pages.length - 1));
  });
  const player = hero.querySelector(".sop-player");
  if (player) hero.insertBefore(cta, player);

  const billing = document.createElement("div");
  billing.className = "sop-movie-billing sop-movie-v3-only";
  billing.innerHTML = `DIRECTED BY ${escapeHtml(meta.director)} · PRODUCED BY ${escapeHtml(meta.producer)} · A ${escapeHtml(meta.studio).toUpperCase()} ORIGINAL`;
  hero.appendChild(billing);
}

function decorateMovieAlbum() {
  if (!isMovieTheme() || !SOP.el.albumGrid) return;
  Array.from(SOP.el.albumGrid.children).forEach((button, index) => {
    button.classList.add("sop-movie-scene-card");
    button.dataset.scene = `SCENE ${String(index + 1).padStart(2, "0")}`;
  });
}

function buildMovieTimeline(meta) {
  const configured = Array.isArray(SOP.data?.movieTimeline) ? SOP.data.movieTimeline : [];
  const fallback = [
    { year: "Opening", title: "The First Scene", text: "Where this story begins." },
    { year: "Chapter I", title: "The Moment", text: "A memory worth keeping forever." },
    { year: "Forever", title: "The Next Chapter", text: "Still being written." }
  ];
  const items = configured.length ? configured : fallback;
  return `
    <div class="sop-page-inner sop-movie-timeline-card">
      <p class="sop-section__label">Story Timeline</p>
      <h2 class="sop-section__title">A film told in moments.</h2>
      <div class="sop-movie-timeline-list">
        ${items.slice(0, 5).map((item, index) => `
          <article class="sop-movie-timeline-item">
            <span>${escapeHtml(item.year || item.date || `Scene ${index + 1}`)}</span>
            <strong>${escapeHtml(item.title || item.name || "A Beautiful Moment")}</strong>
            <small>${escapeHtml(item.text || item.description || meta.tagline)}</small>
          </article>
        `).join("")}
      </div>
    </div>`;
}

function renderMovieTheme() {
  const track = SOP.el.track;
  if (!track) return;

  document.querySelectorAll(".sop-movie-extra-page, .sop-movie-v3-only").forEach((el) => el.remove());

  const intro = SOP.el.intro;
  if (intro && isMovieTheme()) {
    const icon = intro.querySelector(".sop-intro__heart");
    const tap = intro.querySelector(".sop-intro__tap");
    const brand = intro.querySelector(".sop-intro__brand strong");
    const sub = intro.querySelector(".sop-intro__brand span");
    if (icon) icon.textContent = "🎬";
    if (tap) tap.textContent = "Tap to Watch The Story";
    if (brand) brand.textContent = "Studio Of Pages Presents";
    if (sub) sub.textContent = "A Film Based On True Moments";
  }

  const albumLabel = document.querySelector('[data-page="album"] .sop-section__label');
  const albumTitle = document.querySelector('[data-page="album"] .sop-section__title');
  const thanksCard = document.querySelector('[data-page="thanks"] .sop-thanks-card h2');
  const letterHeart = document.querySelector('[data-page="letter"] .sop-letter-heart');
  const thanksHeart = document.querySelector('[data-page="thanks"] .sop-thanks-heart');

  if (!isMovieTheme()) {
    if (albumLabel) albumLabel.textContent = "Our Memories";
    if (albumTitle) albumTitle.textContent = "A little album of moments.";
    if (thanksCard) thanksCard.textContent = "Thank You";
    if (letterHeart) letterHeart.textContent = "♡";
    if (thanksHeart) thanksHeart.textContent = "♡";
    return;
  }

  const meta = getMovieMeta();
  document.body.classList.add("movie-v3-ready");

  setText(SOP.el.label, "Now Showing");
  setText(SOP.el.names, meta.names);
  setText(SOP.el.date, meta.tagline);
  setText(SOP.el.audioTitle, meta.soundtrack);
  setText(SOP.el.audioSubtitle, "Official soundtrack · tap to play");
  decorateMovieHero(meta);
  decorateMovieAlbum();

  if (albumLabel) albumLabel.textContent = "Scenes From The Movie";
  if (albumTitle) albumTitle.textContent = "Selected scenes from this story.";
  if (thanksCard) thanksCard.textContent = "The End";
  if (letterHeart) letterHeart.textContent = "FADE IN";
  if (thanksHeart) thanksHeart.textContent = "★";
  setText(SOP.el.thanksText, SOP.data.thankYouText || "Until the next chapter...");
  setText(SOP.el.thanksBrand, SOP.data.thankYouBrand || "A Studio Of Pages Original");

  const castNames = splitCastNames();
  const castPage = document.createElement("section");
  castPage.className = "sop-book-page sop-page-movie-cast sop-movie-extra-page";
  castPage.dataset.page = "movieCast";
  castPage.innerHTML = `
    <div class="sop-page-inner sop-movie-cast-card">
      <p class="sop-section__label">Meet The Cast</p>
      <h2 class="sop-section__title">Starring in ${escapeHtml(meta.title)}</h2>
      <div class="sop-movie-cast-grid">
        ${(castNames.length ? castNames : ["The Main Character"]).map((name, index) => `
          <article class="sop-movie-cast-member">
            <span>${index === 0 ? "Lead Role" : index === 1 ? "Co-Star" : "Special Appearance"}</span>
            <strong>${escapeHtml(name)}</strong>
            <small>${index === 0 ? "as The One Who Started It All" : index === 1 ? "as The One Who Made It Unforgettable" : "as A Beautiful Part Of The Story"}</small>
          </article>
        `).join("")}
      </div>
    </div>`;

  const timelinePage = document.createElement("section");
  timelinePage.className = "sop-book-page sop-page-movie-timeline sop-movie-extra-page";
  timelinePage.dataset.page = "movieTimeline";
  timelinePage.innerHTML = buildMovieTimeline(meta);

  const creditsPage = document.createElement("section");
  creditsPage.className = "sop-book-page sop-page-movie-credits sop-movie-extra-page";
  creditsPage.dataset.page = "movieCredits";
  creditsPage.innerHTML = `
    <div class="sop-page-inner sop-movie-credits-card">
      <div class="sop-movie-credits-roll">
        <p>${escapeHtml(meta.studio)} Presents</p>
        <h2>${escapeHtml(meta.title)}</h2>
        <p>${escapeHtml(meta.tagline)}</p>
        <p>Starring</p>
        <strong>${escapeHtml(meta.names)}</strong>
        <p>Release Date</p>
        <strong>${escapeHtml(meta.releaseDate)}</strong>
        <p>Official Soundtrack</p>
        <strong>${escapeHtml(meta.soundtrack)}</strong>
        <p>Genre</p>
        <strong>${escapeHtml(meta.genre)}</strong>
        <p>Directed By</p>
        <strong>${escapeHtml(meta.director)}</strong>
        <p>Produced By</p>
        <strong>${escapeHtml(meta.producer)}</strong>
        <p>Running Time</p>
        <strong>${escapeHtml(meta.duration)}</strong>
        <p>Special Thanks</p>
        <strong>Family · Friends · Every Beautiful Memory</strong>
        <h3>THE END</h3>
      </div>
    </div>`;

  const albumPage = document.querySelector('[data-page="album"]');
  if (albumPage) {
    track.insertBefore(castPage, albumPage);
    track.insertBefore(timelinePage, albumPage);
  }
  const thanksPage = document.querySelector('[data-page="thanks"]');
  if (thanksPage) track.insertBefore(creditsPage, thanksPage);
}

function buildPages() {
  SOP.pageElements = {
    hero: document.querySelector('[data-page="hero"]'),
    movieCast: document.querySelector('[data-page="movieCast"]'),
    movieTimeline: document.querySelector('[data-page="movieTimeline"]'),
    album: document.querySelector('[data-page="album"]'),
    letter: document.querySelector('[data-page="letter"]'),
    movieCredits: document.querySelector('[data-page="movieCredits"]'),
    thanks: document.querySelector('[data-page="thanks"]')
  };

  SOP.pages = ["hero"];
  if (isMovieTheme() && SOP.pageElements.movieCast) SOP.pages.push("movieCast");
  if (isMovieTheme() && SOP.pageElements.movieTimeline) SOP.pages.push("movieTimeline");
  if (SOP.albumImages.length) SOP.pages.push("album");
  if (getLetterText()) SOP.pages.push("letter");
  if (isMovieTheme() && SOP.pageElements.movieCredits) SOP.pages.push("movieCredits");
  SOP.pages.push("thanks");

  Object.entries(SOP.pageElements).forEach(([name, element]) => {
    if (!element) return;
    element.hidden = !SOP.pages.includes(name);
    element.style.display = SOP.pages.includes(name) ? "" : "none";
  });

  if (SOP.el.track) SOP.el.track.style.width = `${SOP.pages.length * 100}vw`;
  document.body.dataset.pageCount = String(SOP.pages.length);
}
