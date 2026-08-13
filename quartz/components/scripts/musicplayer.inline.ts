import jsmediatags from "jsmediatags/dist/jsmediatags.min.js"

const PLAYLIST = [
  { src: "/static/music/Miguel - damned (Lyrics).mp3", title: "Miguel - damned" },
  { src: "/static/music/sombr - back to friends.mp3", title: "Sombr - back to friends" },
  // { src: "/static/music2.mp3", title: "Rainy Afternoon" },
]

let audio: HTMLAudioElement
let unlocked = false
let currentTrack = PLAYLIST[0]

function setup() {
  if (!audio) {
    currentTrack = PLAYLIST[Math.floor(Math.random() * PLAYLIST.length)]
    audio = new Audio(currentTrack.src)
    audio.loop = PLAYLIST.length === 1
    audio.volume = 0.5

    if (PLAYLIST.length > 1) {
      audio.addEventListener("ended", playNext)
    }

    attemptPlay()
  }

  const btn = document.getElementById("music-toggle")
  if (btn) {
    syncIcon()

    // .onclick always overwrites any previous handler on this node,
    // so it's safe to call setup() as many times as nav fires
    btn.onclick = (e) => {
      e.stopPropagation()
      unlocked = true
      if (audio.paused) audio.play().then(syncIcon)
      else {
        audio.pause()
        syncIcon()
      }
    }
  }
}

function playNext() {
  const idx = PLAYLIST.indexOf(currentTrack)
  currentTrack = PLAYLIST[(idx + 1) % PLAYLIST.length]
  audio.src = currentTrack.src
  audio.play().then(syncIcon)
}

function attemptPlay() {
  audio.play().then(() => {
    unlocked = true
    syncIcon()
  }).catch((err) => {
    console.warn("Autoplay blocked, waiting for first interaction:", err.name)
    syncIcon()
    const startOnInteract = () => {
      if (unlocked) return
      unlocked = true
      audio.play().then(syncIcon).catch((err2) => console.error("Play failed:", err2))
    }
    document.addEventListener("click", startOnInteract, { once: true })
    document.addEventListener("keydown", startOnInteract, { once: true })
  })
}

function syncIcon() {
  const btn = document.getElementById("music-toggle")
  const tooltip = document.getElementById("track-tooltip")
  const isPlaying = !audio.paused

  if (btn) btn.dataset.playing = isPlaying ? "true" : "false"
  if (tooltip) tooltip.textContent = `${currentTrack.title} · ${isPlaying ? "Playing" : "Paused"}`
}

document.addEventListener("nav", setup)

export {} 