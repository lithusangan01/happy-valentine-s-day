const appShell = document.getElementById("appShell");
const AUTOPLAY_HANDOFF_KEY = "valentine_autoplay_handoff";
const contentScroller = document.getElementById("contentScroller");
const petalLayer = document.getElementById("petalLayer");
const liveHeartLayer = document.getElementById("liveHeartLayer");
const cursorHeartLayer = document.getElementById("cursorHeartLayer");
const sceneFlash = document.getElementById("sceneFlash");

const stepButton = document.getElementById("stepButton");
const heroSection = document.getElementById("heroSection");
const letterSection = document.getElementById("letterSection");
const memoriesSection = document.getElementById("memoriesSection");
const songsSection = document.getElementById("songsSection");
const footerSection = document.getElementById("footerSection");

const typedLetter = document.getElementById("typedLetter");
const logoutBtn = document.getElementById("logoutBtn");

const nowPlayingCard = document.getElementById("nowPlayingCard");
const mediaPlayer = document.getElementById("audioPlayer");
const playPauseBtn = document.getElementById("playPauseBtn");
const seekBar = document.getElementById("seekBar");
const currentTimeEl = document.getElementById("currentTime");
const totalTimeEl = document.getElementById("totalTime");
const currentTrackTitle = document.getElementById("currentTrackTitle");
const currentTrackArtist = document.getElementById("currentTrackArtist");
const playlistEl = document.getElementById("playlist");

const letterText =
  "My Dear Kattachiii...\n\n" +
  "From the day you walked into my life, everything turned gentle and bright. " +
  "You made my ordinary world feel like a beautiful dream.\n\n" +
  "Your smile is still my favorite sunrise, and your voice is still my calmest home. " +
  "In every season, your love gives my heart courage and peace.\n\n" +
  "Thank you for holding me in my weak moments, cheering me in my strong moments, and choosing me every single day. " +
  "You are my comfort, my strength, my happiness, and my forever.\n\n" +
  "No matter where life takes us, I promise to keep loving you deeper, caring for you softer, and standing beside you always.\n\n" +
  "Happy Valentine's Day Kattachiiiiii... I am endlessly grateful for you.\n\n" +
  "Forever yours.";

const tracks = [
  {
    title: "Anbil Avan",
    artist: "A.R. Rahman",
    length: "--:--",
    src: "anbil-avan.mp3",
  },
  {
    title: "Pookal Pookum",
    artist: "Madharasapattinam",
    length: "--:--",
    src: "pookal-pookum.mp3",
  },
  {
    title: "Oru Paadhi Kadhavu",
    artist: "Thaandavam",
    length: "--:--",
    src: "oru-paathi-kadhavu.mp3",
  },
  {
    title: "Anbe En Anbe",
    artist: "Harris Jayaraj",
    length: "--:--",
    src: "anbe-en-anbe.mp3",
  },
];

const storySections = [letterSection, memoriesSection, songsSection, footerSection];

let typingTimer;
let typingInProgress = false;
let letterTypingPromise = Promise.resolve();
let petalTimer;
let liveHeartTimer;
let currentTrackIndex = 0;
let storyStep = 0;
let storyBusy = false;
let lastCursorHeartAt = 0;

function consumeAutoplayHandoff() {
  try {
    const raw = window.sessionStorage.getItem(AUTOPLAY_HANDOFF_KEY);
    window.sessionStorage.removeItem(AUTOPLAY_HANDOFF_KEY);

    if (!raw) {
      return false;
    }

    const stamp = Number(raw);
    if (Number.isFinite(stamp) && stamp > 0) {
      return Date.now() - stamp < 15000;
    }

    // Backward compatibility for old boolean flag values.
    return raw === "true";
  } catch (error) {
    return false;
  }
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function sectionTargetTop(section) {
  return Math.max(0, section.offsetTop - 18);
}

function animateScroll(targetTop, duration = 900) {
  return new Promise((resolve) => {
    const startTop = contentScroller.scrollTop;
    const distance = targetTop - startTop;

    if (Math.abs(distance) < 2) {
      resolve();
      return;
    }

    const startTime = performance.now();
    function frame(time) {
      const progress = Math.min((time - startTime) / duration, 1);
      const eased =
        progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      contentScroller.scrollTop = startTop + distance * eased;

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(frame);
  });
}

function typeLetter(forceRestart = false) {
  if (typingInProgress && !forceRestart) {
    return letterTypingPromise;
  }

  if (typingInProgress && forceRestart) {
    window.clearInterval(typingTimer);
    typedLetter.classList.remove("typing");
    typingInProgress = false;
  }

  typedLetter.textContent = "";
  typedLetter.classList.add("typing");
  typingInProgress = true;

  letterTypingPromise = new Promise((resolve) => {
    let pointer = 0;
    typingTimer = window.setInterval(() => {
      typedLetter.textContent += letterText.charAt(pointer);
      pointer += 1;

      if (pointer >= letterText.length) {
        window.clearInterval(typingTimer);
        typedLetter.classList.remove("typing");
        typingInProgress = false;
        resolve();
      }
    }, 19);
  });

  return letterTypingPromise;
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function setPlaybackVisualState() {
  const isPlaying = !mediaPlayer.paused && !mediaPlayer.ended;
  playPauseBtn.textContent = isPlaying ? "Pause" : "Play";
  nowPlayingCard.classList.toggle("playing", isPlaying);
}

function renderPlaylist() {
  playlistEl.innerHTML = "";

  tracks.forEach((track, index) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";

    if (index === currentTrackIndex) {
      button.classList.add("active");
    }

    button.innerHTML = `
      <span class="song-meta">
        <strong>${track.title}</strong>
        <small>${track.artist}</small>
      </span>
      <span class="song-time">${track.length}</span>
    `;

    button.addEventListener("click", async () => {
      await loadTrack(index, true);
    });

    item.appendChild(button);
    playlistEl.appendChild(item);
  });
}

async function loadTrack(index, autoplay = false) {
  currentTrackIndex = index;
  const track = tracks[index];

  mediaPlayer.pause();
  mediaPlayer.src = track.src;
  mediaPlayer.preload = "auto";

  currentTrackTitle.textContent = track.title;
  currentTrackArtist.textContent = track.artist;
  currentTimeEl.textContent = "0:00";
  totalTimeEl.textContent = track.length;
  seekBar.value = "0";

  renderPlaylist();
  setPlaybackVisualState();

  if (!autoplay) {
    return;
  }

  try {
    await mediaPlayer.play();
  } catch (error) {
    // Ignore autoplay rejections in browsers.
  }
}

async function attemptAutoplay(retries = 1, retryDelayMs = 0) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      await mediaPlayer.play();
      return true;
    } catch (error) {
      if (attempt < retries - 1 && retryDelayMs > 0) {
        await wait(retryDelayMs);
      }
    }
  }

  return false;
}

function bindMusicControls() {
  playPauseBtn.addEventListener("click", async () => {
    if (!mediaPlayer.src) {
      await loadTrack(currentTrackIndex, true);
      return;
    }

    if (mediaPlayer.paused) {
      try {
        await mediaPlayer.play();
      } catch (error) {
        // Ignore user-gesture related play errors.
      }
    } else {
      mediaPlayer.pause();
    }
  });

  mediaPlayer.addEventListener("play", setPlaybackVisualState);
  mediaPlayer.addEventListener("pause", setPlaybackVisualState);
  mediaPlayer.addEventListener("loadedmetadata", () => {
    totalTimeEl.textContent = formatTime(mediaPlayer.duration);
  });

  mediaPlayer.addEventListener("timeupdate", () => {
    if (!mediaPlayer.duration) {
      return;
    }
    seekBar.value = String((mediaPlayer.currentTime / mediaPlayer.duration) * 100);
    currentTimeEl.textContent = formatTime(mediaPlayer.currentTime);
  });

  seekBar.addEventListener("input", () => {
    if (!mediaPlayer.duration) {
      return;
    }

    const target = (Number(seekBar.value) / 100) * mediaPlayer.duration;
    mediaPlayer.currentTime = target;
  });

  mediaPlayer.addEventListener("ended", async () => {
    const nextIndex = (currentTrackIndex + 1) % tracks.length;
    await loadTrack(nextIndex, true);
  });
}

function bindAutoplayFallback() {
  async function tryResume() {
    if (!mediaPlayer.src || !mediaPlayer.paused) {
      window.removeEventListener("pointerdown", tryResume);
      window.removeEventListener("keydown", tryResume);
      window.removeEventListener("touchstart", tryResume);
      window.removeEventListener("wheel", tryResume);
      return;
    }

    try {
      await mediaPlayer.play();
    } catch (error) {
      return;
    }

    window.removeEventListener("pointerdown", tryResume);
    window.removeEventListener("keydown", tryResume);
    window.removeEventListener("touchstart", tryResume);
    window.removeEventListener("wheel", tryResume);
  }

  window.addEventListener("pointerdown", tryResume);
  window.addEventListener("keydown", tryResume);
  window.addEventListener("touchstart", tryResume, { passive: true });
  window.addEventListener("wheel", tryResume, { passive: true });
}

function spawnPetal() {
  const petal = document.createElement("span");
  petal.className = "petal";
  petal.textContent =
    Math.random() > 0.55
      ? String.fromCharCode(10084)
      : Math.random() > 0.5
        ? String.fromCharCode(10085)
        : String.fromCharCode(10086);
  petal.style.left = `${Math.random() * 100}%`;
  petal.style.opacity = `${0.2 + Math.random() * 0.35}`;
  petal.style.fontSize = `${0.72 + Math.random() * 0.72}rem`;
  petal.style.animationDuration = `${8 + Math.random() * 8}s`;
  petal.style.setProperty("--drift-x", `${(Math.random() - 0.5) * 180}px`);

  petalLayer.appendChild(petal);
  window.setTimeout(() => {
    petal.remove();
  }, 17000);
}

function startPetals() {
  if (petalTimer) {
    window.clearInterval(petalTimer);
  }
  petalTimer = window.setInterval(spawnPetal, 460);
}

function spawnLiveHeart() {
  if (!liveHeartLayer) {
    return;
  }

  const heart = document.createElement("span");
  heart.className = "live-heart";
  heart.textContent =
    Math.random() > 0.6
      ? String.fromCharCode(10084)
      : Math.random() > 0.5
        ? String.fromCharCode(10085)
        : String.fromCharCode(10086);
  heart.style.left = `${8 + Math.random() * 84}%`;
  heart.style.fontSize = `${0.7 + Math.random() * 0.72}rem`;
  heart.style.opacity = `${0.18 + Math.random() * 0.42}`;
  heart.style.animationDuration = `${5.4 + Math.random() * 3.4}s`;
  heart.style.setProperty("--drift-x", `${(Math.random() - 0.5) * 100}px`);

  liveHeartLayer.appendChild(heart);
  window.setTimeout(() => {
    heart.remove();
  }, 9200);
}

function startLiveHearts() {
  if (liveHeartTimer) {
    window.clearInterval(liveHeartTimer);
  }
  liveHeartTimer = window.setInterval(spawnLiveHeart, 1180);
}

function spawnCursorHeart(clientX, clientY, burst = false) {
  if (!cursorHeartLayer || !appShell) {
    return;
  }

  const rect = appShell.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
    return;
  }

  const heart = document.createElement("span");
  heart.className = "cursor-heart";
  heart.textContent =
    Math.random() > 0.6
      ? String.fromCharCode(10084)
      : Math.random() > 0.5
        ? String.fromCharCode(10085)
        : String.fromCharCode(10086);
  heart.style.left = `${x}px`;
  heart.style.top = `${y}px`;
  heart.style.fontSize = burst ? `${0.9 + Math.random() * 0.5}rem` : `${0.72 + Math.random() * 0.32}rem`;
  heart.style.setProperty("--x", `${(Math.random() - 0.5) * (burst ? 84 : 44)}px`);
  heart.style.setProperty("--y", `${-(burst ? 96 : 58) - Math.random() * 32}px`);

  cursorHeartLayer.appendChild(heart);
  window.setTimeout(() => {
    heart.remove();
  }, 900);
}

function bindCursorHearts() {
  if (!appShell || !cursorHeartLayer) {
    return;
  }

  const prefersTouch = window.matchMedia("(pointer: coarse)").matches;
  if (prefersTouch) {
    appShell.addEventListener("pointerdown", (event) => {
      for (let i = 0; i < 5; i += 1) {
        spawnCursorHeart(event.clientX, event.clientY, true);
      }
    });
    return;
  }

  appShell.addEventListener("pointermove", (event) => {
    const now = performance.now();
    if (now - lastCursorHeartAt < 65) {
      return;
    }
    lastCursorHeartAt = now;
    spawnCursorHeart(event.clientX, event.clientY, false);
  });

  appShell.addEventListener("pointerdown", (event) => {
    for (let i = 0; i < 7; i += 1) {
      spawnCursorHeart(event.clientX, event.clientY, true);
    }
  });
}

function pulseStepButton() {
  if (!stepButton) {
    return;
  }
  stepButton.classList.remove("pulse");
  void stepButton.offsetWidth;
  stepButton.classList.add("pulse");
  window.setTimeout(() => {
    stepButton.classList.remove("pulse");
  }, 480);
}

function triggerButtonBurst() {
  if (!stepButton || !appShell) {
    return;
  }

  const shellRect = appShell.getBoundingClientRect();
  const buttonRect = stepButton.getBoundingClientRect();
  const originX = buttonRect.left + buttonRect.width / 2 - shellRect.left;
  const originY = buttonRect.top + buttonRect.height / 2 - shellRect.top;

  for (let i = 0; i < 16; i += 1) {
    const heart = document.createElement("span");
    heart.className = "burst-heart";
    heart.textContent =
      Math.random() > 0.5 ? String.fromCharCode(10084) : String.fromCharCode(10085);
    heart.style.left = `${originX}px`;
    heart.style.top = `${originY}px`;
    heart.style.setProperty("--x", `${(Math.random() - 0.5) * 180}px`);
    heart.style.setProperty("--y", `${-38 - Math.random() * 140}px`);
    heart.style.animationDelay = `${Math.random() * 80}ms`;

    appShell.appendChild(heart);
    window.setTimeout(() => {
      heart.remove();
    }, 920);
  }
}

async function flashSceneTransition() {
  sceneFlash.classList.remove("active");
  void sceneFlash.offsetWidth;
  sceneFlash.classList.add("active");
  await wait(540);
}

function lockStorySections() {
  storySections.forEach((section) => {
    section.classList.add("locked");
    section.classList.remove("in-view");
  });

  heroSection.classList.add("in-view");
  contentScroller.scrollTop = 0;
}

function unlockSection(section) {
  section.classList.remove("locked");
  section.classList.remove("in-view");
  window.requestAnimationFrame(() => {
    section.classList.add("in-view");
  });
}

function placeStepButton(section) {
  if (!stepButton || !section) {
    return;
  }
  if (stepButton.parentElement !== section) {
    section.appendChild(stepButton);
  }
}

function setStepLabel(label, disabled = false) {
  if (!stepButton) {
    return;
  }
  stepButton.textContent = label;
  stepButton.disabled = disabled;
}

async function revealSection(section) {
  pulseStepButton();
  triggerButtonBurst();
  await flashSceneTransition();
  unlockSection(section);
  await wait(130);
}

async function advanceStoryByClick() {
  if (storyBusy) {
    return;
  }
  storyBusy = true;

  try {
    if (storyStep === 0) {
      await revealSection(letterSection);
      await animateScroll(sectionTargetTop(letterSection), 980);
      await typeLetter(true);
      placeStepButton(letterSection);
      setStepLabel("Open Memories");
      storyStep = 1;
      return;
    }

    if (storyStep === 1) {
      await revealSection(memoriesSection);
      await animateScroll(sectionTargetTop(memoriesSection), 1160);
      placeStepButton(memoriesSection);
      setStepLabel("Open Songs");
      storyStep = 2;
      return;
    }

    if (storyStep === 2) {
      await revealSection(songsSection);
      await animateScroll(sectionTargetTop(songsSection), 1160);
      placeStepButton(songsSection);
      setStepLabel("Open Final Page");
      storyStep = 3;
      return;
    }

    if (storyStep === 3) {
      await revealSection(footerSection);
      await animateScroll(sectionTargetTop(footerSection), 1160);
      if (stepButton && stepButton.parentElement) {
        stepButton.remove();
      }
      storyStep = 4;
    }
  } finally {
    storyBusy = false;
  }
}

function bindStoryButton() {
  if (!stepButton) {
    return;
  }

  stepButton.addEventListener("click", async () => {
    await advanceStoryByClick();
  });
}

function bindLogoutButton() {
  if (!logoutBtn) {
    return;
  }

  logoutBtn.addEventListener("click", () => {
    mediaPlayer.pause();
    mediaPlayer.currentTime = 0;

    try {
      window.sessionStorage.removeItem("valentine_logged_in");
      window.localStorage.removeItem("valentine_logged_in");
      window.sessionStorage.removeItem(AUTOPLAY_HANDOFF_KEY);
    } catch (error) {
      // Ignore storage errors and continue redirect.
    }
    window.location.replace("login.html");
  });
}

async function boot() {
  mediaPlayer.loop = false;
  mediaPlayer.volume = 1;
  mediaPlayer.preload = "auto";
  const cameFromLoginGesture = consumeAutoplayHandoff();

  if (cameFromLoginGesture) {
    await loadTrack(0, true);
    if (mediaPlayer.paused) {
      await attemptAutoplay(28, 15);
    }
  } else {
    await loadTrack(0, false);
  }

  lockStorySections();
  placeStepButton(heroSection);
  bindStoryButton();
  bindLogoutButton();
  bindCursorHearts();
  bindMusicControls();
  bindAutoplayFallback();

  if (!cameFromLoginGesture && mediaPlayer.paused) {
    await attemptAutoplay(1, 0);
  }

  startPetals();
  startLiveHearts();
  setStepLabel("Open Love Letter", false);
}

boot();
