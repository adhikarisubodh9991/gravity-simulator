# Gravity Simulator (Browser Sandbox)

This is a browser-based 3D physics sandbox built with Three.js and Cannon.js.

The idea is simple: drop objects, tweak physics values, and watch how they behave.

## What It Has Right Now

- 3D rendering with Three.js
- Gravity simulation with Cannon.js
- Object types: ball, box, cylinder, cone, pyramid, capsule, torus, icosahedron
- Shape-aware rigid bodies for non-sphere objects (fixed cone/pyramid ground clipping, horizontal cylinder/capsule behavior, and improved torus rolling)
- Adjustable object mass, size, and drop position (X/Z) with shorter, compact control fields
- Adjustable gravity, friction, restitution, and air resistance (linear + angular)
- Atmosphere toggle to compare with/without drag in the same gravity preset
- Adjustable ground width/height and void threshold
- Play/pause and slow-motion toggle
- Nuke drop with configurable power
- Destruction mode (click object to remove)
- Sound effects generated in browser with Web Audio API
- Mobile/touch support with landscape-first behavior
- Real-time stats (objects, FPS, bodies, physics time)
- Dual-panel UI (left: object/scene actions, right: environment/stats) with hide/show handles

## Drop Behavior

Clicking an object button now drops that object immediately.

- No pre-selection needed
- Works for shapes like ball, cone, box, etc.
- Drop height comes from the `Drop Height` input (default: 60)
- Drop position defaults to center (`X=0`, `Z=0`)
- You can set custom `Drop X Position` and `Drop Z Position`

## Controls

Mouse:
- Left drag: rotate camera
- Right drag: pan camera
- Scroll: zoom
- Left click in scene: no drop/select behavior in normal mode

Keyboard:
- Space: play/pause
- Shift (hold): slow motion
- Delete: clear all objects

UI:
- Object buttons drop objects immediately using configured `Drop Height`, `X`, and `Z`
- Physics inputs change simulation parameters live (including air resistance)
- `Use Atmosphere Drag` lets you switch between atmospheric drag and vacuum behavior quickly
- You can create your own planet environments by manually tuning gravity and drag values
- Nuke power controls explosion strength
- Destruction Mode toggles click-to-delete
- Left and right panels can be collapsed independently
- UI keeps readable text size while reducing control lengths so the scene stays visible

## Void Handling

- Objects that leave arena bounds are treated as out-of-world bodies
- Collision response is disabled after leaving bounds so they fall away cleanly
- Out-of-bounds bodies fade out and are removed to keep sessions stable

## Project Structure

```text
gravity simulator/
├── index.html
├── styles.css
├── README.md
└── js/
    ├── interactions.js
    ├── objects.js
    ├── physics.js
    ├── renderer.js
    └── ui.js
```

## Run Locally

You can open `index.html` directly, but using a local server is more reliable.

Option 1 (Python):

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`.

Option 2 (Node):

```powershell
npx serve .
```

## Technical Notes

- Sounds are generated directly in the browser (Web Audio API).
- Physics runs at a fixed timestep and rendering runs via requestAnimationFrame.
- Damping and low-speed settling are used to reduce endless micro-sliding.
- Torus uses a ring-style collider so it rolls naturally instead of balancing upright.
- Mobile rendering keeps full-width canvas active; portrait mode now shows a non-blocking rotate hint instead of hiding the scene.
- Renderer resize now follows actual canvas bounds (`getBoundingClientRect`) and preserves CSS sizing to avoid half-width mobile rendering artifacts.
- Portrait mobile flow now matches Universe Simulator: app shows a dedicated rotate overlay and only runs full scene UI in landscape.

## Known Limitations

- No save/load scene UI yet.
- No per-object material editor.
- Very high object counts can lower FPS on weaker devices.

## Next Improvements

- Add preset scene templates (stack tests, slope tests, impact tests)
- Add optional per-object drag/spin overrides
- Add contact debug view (normals, collision points)
