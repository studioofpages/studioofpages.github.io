const params = new URLSearchParams(window.location.search);
const memoryId = params.get("id") || "0001";

const titleEl = document.getElementById("memoryTitle");
const namesEl = document.getElementById("memoryNames");
const dateEl = document.getElementById("memoryDate");
const messageEl = document.getElementById("memoryMessage");
const photoEl = document.getElementById("memoryPhoto");
const audioEl = document.getElementById("memoryAudio");
const button = document.getElementById("playButton");
const progress = document.getElementById("progressBar");
const playerTitle = document.getElementById("playerTitle");
const playerSubtitle = document.getElementById("playerSubtitle");

function setPlayingState(isPlaying) {
  document.body.classList.toggle("is-playing", isPlaying);
  button.querySelector(".play-icon").textContent = isPlaying ? "❚❚" : "▶";
  playerTitle.textContent = isPlaying ? "Playing Memory" : "Play Memory";
  playerSubtitle.textContent = isPlaying ? "Your sound is now playing" : "Tap to hear this moment";
}

async function loadMemory() {
  try {
    const response = await fetch(`../data/${memoryId}/memory.json`, { cache: "no-store" });
    if (!response.ok) throw new Error("Memory not found");

    const data = await response.json();
const theme = data.theme?.style || "wedding";
document.body.classList.add(`theme-${theme}`);

    document.title = `${data.title || "Memory"} | StudioOfPages`;
    titleEl.textContent = data.title || "Untitled Memory";
    namesEl.textContent = data.names || "";
    dateEl.textContent = data.date || "";
    messageEl.textContent = data.message || "";

    photoEl.src = `../data/${memoryId}/${data.photo || "photo.jpg"}`;
    audioEl.src = `../data/${memoryId}/${data.audio || "audio.mp3"}`;

  } catch (error) {
    titleEl.textContent = "Memory Not Found";
    namesEl.textContent = "StudioOfPages";
    dateEl.textContent = "";
    messageEl.textContent = "This memory page could not be loaded.";
    button.disabled = true;
  }
}

button.addEventListener("click", async () => {
  try {
    if (audioEl.paused) {
      await audioEl.play();
      setPlayingState(true);
    } else {
      audioEl.pause();
      setPlayingState(false);
    }
  } catch (error) {
    playerTitle.textContent = "Tap again";
    playerSubtitle.textContent = "Your browser needs one more tap";
  }
});

audioEl.addEventListener("timeupdate", () => {
  if (!audioEl.duration) return;
  progress.style.width = `${(audioEl.currentTime / audioEl.duration) * 100}%`;
});

audioEl.addEventListener("ended", () => {
  setPlayingState(false);
  progress.style.width = "0%";
});

loadMemory();
