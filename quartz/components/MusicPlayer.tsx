import { QuartzComponent, QuartzComponentConstructor } from "./types"
import script from "./scripts/musicplayer.inline"
import style from "./styles/musicplayer.scss"

const MusicPlayer: QuartzComponent = () => (
  <div class="music-player">
    <span class="music-label">Music for the vibe</span>
    <div class="vinyl-wrapper">
      <button id="music-toggle" aria-label="Toggle background music">
      <svg viewBox="0 0 24 24" class="vinyl-icon">
        <circle cx="12" cy="12" r="10" class="vinyl-disc" />
        <circle cx="12" cy="12" r="3.2" class="vinyl-label" />
        <circle cx="12" cy="12" r="0.6" class="vinyl-hole" />
        <line x1="12" y1="12" x2="12" y2="3" class="vinyl-mark" />
      </svg>
      </button>
      <span id="track-tooltip" class="track-tooltip">Loading…</span>
    </div>
  </div>
)

MusicPlayer.css = style
MusicPlayer.afterDOMLoaded = script

export default (() => MusicPlayer) satisfies QuartzComponentConstructor