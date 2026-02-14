const AUTH_KEY = "valentine_logged_in";
const AUTOPLAY_HANDOFF_KEY = "valentine_autoplay_handoff";
const LOGIN_USERNAME = "i love you";
const LOGIN_PASSWORD = "2615";

const authCard = document.getElementById("authCard");
const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const message = document.getElementById("message");
const INVALID_POPUP_TEXT = "You'r Not My Girl";

function showMessage(text, type) {
  message.textContent = text;
  message.classList.remove("error", "success");
  if (type) {
    message.classList.add(type);
  }
}

function triggerShake() {
  authCard.classList.remove("shake");
  void authCard.offsetWidth;
  authCard.classList.add("shake");
}

function redirectToHome() {
  window.location.replace("index.html");
}

function setAutoplayHandoff() {
  try {
    window.sessionStorage.setItem(AUTOPLAY_HANDOFF_KEY, String(Date.now()));
  } catch (error) {
    // Ignore storage errors and continue login flow.
  }
}

function checkExistingAuth() {
  try {
    if (window.sessionStorage.getItem(AUTH_KEY) === "true") {
      redirectToHome();
    }
  } catch (error) {
    showMessage("Browser storage is blocked.", "error");
  }
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const username = usernameInput.value.trim().replace(/\s+/g, " ").toLowerCase();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    showMessage(INVALID_POPUP_TEXT, "error");
    triggerShake();
    return;
  }

  if (username !== LOGIN_USERNAME || password !== LOGIN_PASSWORD) {
    showMessage(INVALID_POPUP_TEXT, "error");
    triggerShake();
    return;
  }

  try {
    window.sessionStorage.setItem(AUTH_KEY, "true");
    window.localStorage.removeItem(AUTH_KEY);
    setAutoplayHandoff();
    redirectToHome();
  } catch (error) {
    showMessage("Unable to save login in this browser.", "error");
  }
});

checkExistingAuth();
