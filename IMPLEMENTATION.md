# Personal studio preview

The original source is preserved in `backup-original-20261008-205435/`.
The original model in Downloads is unchanged. `public/models/scholar.glb`
is a web-optimized copy: 7,082,192 bytes and 154,012 triangles. It contains
no skins or animation clips. The supplied character ends at the thighs;
the desktop composition therefore emphasizes the upper body.

## Local preview

```sh
npm install
npm run dev -- --host 127.0.0.1
npm run build
```

Open http://127.0.0.1:5173/ . No deployment or push has been performed.
The build warning for the Three.js bundle is expected; the studio is loaded
asynchronously while the original landing page remains visible.

## Scene and content

- `src/components/cinematic-studio.tsx`: model loading, blue-hour studio,
  face close-up, chapter arcs, face-tracking depth of field and cleanup.
- `src/components/studio-experience.tsx`: chapter navigation, original facts,
  focus-area cards and accessible native dialog, language switch, fallbacks.
- `src/index.css`: responsive studio layout and landing-page transition.

Camera motion occupies a short interval before each chapter, then holds.
Scrolling backwards follows the same path. Reduced-motion preferences
replace continuous scene movement with discrete poses and stop video playback.

The cinematic revision anchors the person at the same computer workstation
throughout. The opening glides from an upper-left portrait into a centred
face close-up, then pulls back to show desk and screen. Chapter arcs use
quintic easing with zero endpoint velocity and acceleration. Opening a
focus-area card moves the camera toward the workstation and lights its board.
The closing composition lowers the whole static model behind the desk and
chair to suggest sitting; it is not a skeletal sit-down animation. Geometry
below the desktop is clipped so the truncated thighs are never shown.
Desktop depth of field tracks the face; mobile and reduced-motion views skip
the depth blur. The sky-blue window, amber lamp, dark blue walls and wood grain
carry the original landing page palette into the room.

The existing source supplied a landing page and navigation labels but no
project descriptions, music releases, resume PDF, dates or job history.
The added sections reuse the existing education and focus areas. Expandable
cards describe focus areas and link to the original GitHub profile; they do
not claim specific projects or achievements. Add verified project data here
when available.

## Model and animation

`node scripts/optimize-model.mjs <original.glb>` regenerates the web copy.
This is lossy simplification; the original is retained separately.
For actual limb animation, export a rigged, textured GLB from Meshy with the
desired clips. Inspect skins and clips before integrating an AnimationMixer.
Do not describe the current whole-character transforms as skeletal actions.

## Verification

`scripts/preview-check.cjs` uses this workstation's bundled Playwright and
installed Chrome. Change its runtime paths when moving to another machine.
It produces desktop/mobile screenshots and checks navigation, keyboard dialog
opening and Escape closing with focus restored, horizontal overflow, reduced
motion, and model-load failure. Results live in `preview-artifacts/` and are
ignored together with the backup directory.

`scripts/cinematic-check.cjs` records the continuous tour and checks that a
reading frame stays still, reverse scrolling returns to the same frame, and
opening/closing a focus-area detail changes/restores the actual camera pose.
Camera diagnostics are emitted only in development. FFmpeg for the recorder
is installed in `node_modules/.cache/playwright`, outside the shipped build.
