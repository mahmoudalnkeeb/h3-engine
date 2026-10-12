# Canvas 2D vs WebGL: how they work under the hood

This page compares the browser's two classic drawing APIs from the inside: what happens between your JavaScript call and a pixel on the screen, where the time goes, and what that means for a 2D engine like h3-engine. It isn't part of the beginner guide. Read it when you're deciding whether a game has outgrown the Canvas renderer.

Browser internals change between versions. Where a detail is engine-specific, the engine is named. Treat performance figures as orders of magnitude, not benchmarks.

## The short version

| | Canvas 2D | WebGL (1 / 2) |
| --- | --- | --- |
| Model | Immediate mode: "draw this shape now" | Programmable GPU pipeline: you upload data and shaders, then issue draw calls |
| Abstraction level | Shapes, paths, images, text | Triangles, buffers, textures, shaders |
| Who rasterizes | The browser's 2D library (Skia in Chrome and Firefox, CoreGraphics in Safari), on the GPU or the CPU | Your shaders, on the GPU |
| State | One context with a save/restore stack | Many GPU objects you create and bind |
| Cost per draw | Every `fillRect` / `drawImage` is a call through the bindings, with batching left to the browser | One draw call can cover thousands of sprites, and you control the batching |
| Per-pixel effects | Fixed menu (`globalCompositeOperation`, `filter`) | Anything you can write in a fragment shader |
| Text and vectors | Built in, high quality | Not provided. You build it (texture atlases, SDF, tessellation) |
| Code to draw a box | 1 line | About 80 lines the first time |
| Failure modes | Software fallback, slow readbacks | Context loss, shader compile stalls, driver quirks |
| Good for | UI, vector art, small-to-medium sprite counts | Thousands of sprites, lighting, post-processing, big tile maps |

## Shared ground: how a frame reaches the screen

Both APIs draw into a *backing store* owned by the `<canvas>` element, and both hand that buffer to the browser's compositor in the same way:

1. Your code runs in a task, usually a `requestAnimationFrame` callback.
2. Drawing commands accumulate. Neither API puts pixels on screen synchronously.
3. When the task ends, the browser marks the canvas dirty. At the next frame, its contents become a texture that the compositor places in the page's layer tree.
4. The compositor (in Chrome, the `cc` layer and Viz in the GPU process) draws all layers into the window's surface and presents it at vsync.

So "drawing to a canvas" really means "filling in a texture that the compositor will use". The two APIs differ in how that texture gets filled.

The backing store size is `canvas.width × canvas.height` pixels, not CSS pixels. On a 2× display, a 320×180 logical game drawn at native resolution needs a 640×360 store (h3-engine's `Renderer` handles this with `devicePixelRatio`). Every pixel in the store is RGBA, 4 bytes, stored premultiplied by alpha in both APIs.

## Canvas 2D in depth

### The programming model

`CanvasRenderingContext2D` is a state machine with an immediate-mode drawing API. The state includes:

- the current transform (a 2×3 affine matrix)
- `fillStyle`, `strokeStyle`, `globalAlpha`, `globalCompositeOperation`
- line settings (`lineWidth`, `lineCap`, `lineJoin`, dash pattern)
- the clip region, `font`, text alignment, `filter`, shadows
- `imageSmoothingEnabled`
- the current path, which isn't saved by `save()`

`save()` pushes a copy of this state onto a stack and `restore()` pops it. h3-engine's `r.push()` and `r.pop()` map straight onto these calls.

Each call is "draw this now, with the current state". The API keeps nothing afterwards. Once a rect is drawn, the canvas only has pixels; there's no object you can move later.

### What happens on a call (Chrome)

Take `ctx.fillRect(10, 10, 32, 32)`:

1. **Binding.** The call crosses from V8 into Blink's C++ through generated bindings. The arguments get type-converted, and non-finite values make the call a no-op, as the spec requires.
2. **Recording.** In accelerated mode Blink doesn't rasterize right away. It appends a paint op (a `cc::PaintOp`, here a `DrawRect` with the current matrix and paint) to a recording buffer. This is called *deferred rendering*.
3. **Flush.** The recording is played back into Skia when the frame is produced, when it gets too big, or when something forces it (`getImageData`, `toDataURL`, drawing this canvas into another one).
4. **Rasterization.** Skia turns the ops into GPU work. In Chrome that runs in the GPU process, reached through a shared-memory *command buffer*. Recent Chrome versions use Skia's Graphite backend on some platforms; older ones use Ganesh. Skia picks a strategy per op: simple rects go through a fast path, paths are tessellated into triangles or rendered with coverage masks, and anti-aliasing is computed analytically or through MSAA.
5. **Handoff.** The finished texture goes to the compositor as a resource, as described above.

Skia does some batching of its own. Consecutive ops with compatible state, such as several `drawImage` calls from the same image with the same blend mode, can be merged into one GPU draw. You can't control or rely on this, though. A state change between draws breaks the batch: a different image, a different `fillStyle`, or a different `globalCompositeOperation`.

### Software vs accelerated

A canvas is either *accelerated* (rasterized on the GPU) or *software* (rasterized by Skia on the CPU into memory, then uploaded). Browsers choose based on several things:

- GPU availability and driver blocklists
- canvas size (very small canvases may stay on the CPU)
- memory pressure
- the `willReadFrequently: true` context attribute, which asks for CPU rasterization so `getImageData` is cheap

In software mode, the cost of filling pixels grows with the area you cover. A full-screen `fillRect` at 1920×1080 touches about 2 million pixels on the CPU, every frame.

### Images

`drawImage(img, ...)` needs the image decoded and, on an accelerated canvas, in a GPU texture:

- The first draw of an `HTMLImageElement` may trigger a decode and an upload, which shows up as a hitch the first time a sprite appears. `img.decode()` or `createImageBitmap()` up front moves that work out of the frame. h3-engine's `Assets` loader decodes before the scene starts.
- Browsers cache the GPU copy, so later draws of the same image are cheap.
- With `imageSmoothingEnabled = false`, nearest-neighbour sampling is used, which is what pixel art needs.
- Drawing a cross-origin image without CORS *taints* the canvas. After that, reading pixels back throws a security error.

Sprite sheets help Canvas too. Drawing many sub-rects of one sheet keeps the same source image, which gives Skia's batching a chance.

### Text

`fillText` shapes the string (HarfBuzz in Chrome and Firefox), rasterizes glyphs into a glyph atlas texture, and draws textured quads from that atlas. It's high quality and handles any script, but it's comparatively expensive. Changing `font` means parsing a CSS font string, and measuring text needs a shaping pass. Caching static text in an offscreen canvas is a common optimization.

### Reading pixels back

`getImageData` on an accelerated canvas forces three things:

- a flush of all deferred ops
- the GPU to finish all queued work
- a GPU→CPU copy

That's a synchronous pipeline stall that can take milliseconds, which is why per-frame pixel tricks (manual lighting, pixel collision) are slow on Canvas. `willReadFrequently` trades GPU drawing speed for cheap reads.

### Where Canvas 2D time goes

For a sprite-heavy game, the cost per frame looks roughly like this:

```
frame time ≈ Σ calls × (binding + state validation + recording)
           + flush/playback in Skia
           + GPU raster time (fill rate, path tessellation)
```

The first term usually dominates. Each call costs well under a microsecond on desktop, but that adds up. Several thousand `drawImage` calls per frame is where frame budgets typically start to hurt, sooner on mobile and later on fast desktops. State changes (`fillStyle`, `globalAlpha`, `setTransform`) are calls too, and they also split Skia's batches.

### Canvas 2D in OffscreenCanvas and workers

`canvas.transferControlToOffscreen()` moves the context into a Web Worker. Drawing then runs off the main thread, so heavy DOM work or GC on the main thread doesn't block it. The per-call costs stay the same; they just move to another thread.

## WebGL in depth

### The programming model

WebGL 1 exposes OpenGL ES 2.0 and WebGL 2 exposes OpenGL ES 3.0. Instead of shapes, you work with GPU objects:

- **Buffers** (`ARRAY_BUFFER`, `ELEMENT_ARRAY_BUFFER`): raw bytes in GPU memory, such as vertex positions, UVs and colors, or indices.
- **Textures**: images in GPU memory, with filtering and wrap settings.
- **Shaders**: small GLSL ES programs. The *vertex shader* runs once per vertex and outputs a clip-space position. The *fragment shader* runs once per covered pixel sample and outputs a color.
- **Programs**: a linked vertex/fragment pair, plus its *uniforms* (per-draw constants such as the camera matrix) and *attributes* (per-vertex inputs).
- **Framebuffers**: render targets. The default one is the canvas. Others render into a texture, for lighting buffers or post-processing.
- **VAOs** (WebGL 2, or an extension in WebGL 1): saved vertex attribute layouts.

A draw call (`drawArrays` or `drawElements`) means "run the bound program over N vertices from the bound buffers, with the bound textures, current blend state and current viewport".

### The GPU pipeline

```
vertex buffers ─▶ vertex fetch ─▶ VERTEX SHADER ─▶ primitive assembly ─▶ clipping
   ─▶ perspective divide ─▶ viewport transform ─▶ rasterization
   ─▶ FRAGMENT SHADER ─▶ scissor / stencil / depth tests ─▶ blending ─▶ framebuffer
```

- **Vertex stage:** for 2D, the vertex shader usually multiplies a world-space position by a 3×3 camera matrix and outputs `vec4(pos, 0, 1)`.
- **Rasterization:** fixed-function hardware decides which pixels each triangle covers and interpolates the vertex outputs (UVs, colors) across them.
- **Fragment stage:** samples textures and computes the final color. Lighting, palette swaps, outlines and dissolves all happen here.
- **Blending:** also fixed-function. You configure it with `blendFunc` and `blendEquation`; normal alpha blending with premultiplied colors is `blendFunc(ONE, ONE_MINUS_SRC_ALPHA)`.

### What happens on a call (Chrome)

WebGL in Chrome is a client/server system:

1. **Client side.** Each `gl.*` call is validated in the renderer process, then encoded into the shared-memory command buffer. Calls that return values, like `getError` or `readPixels`, need a round trip and stall. Avoid them in the frame loop.
2. **GPU process.** The commands are decoded and validated again; the GPU process doesn't trust the renderer. Validation checks, for example, that indices in a `drawElements` call don't read past the end of a buffer. Chrome caches index ranges to keep this cheap.
3. **ANGLE.** Commands are translated to the platform's native API: Direct3D 11 on Windows, Metal on macOS, Vulkan or desktop OpenGL elsewhere. GLSL ES shaders are translated as well (to HLSL, MSL or SPIR-V) and compiled by the driver.
4. **Driver and GPU.** The driver builds hardware command lists and the GPU executes them asynchronously. Your JavaScript returns long before any pixel is drawn.
5. **Presentation.** When the task ends, the drawing buffer goes to the compositor. With the default `preserveDrawingBuffer: false`, the browser can swap buffers instead of copying, and the canvas is cleared for the next frame.

Firefox and Safari follow the same pattern with their own processes, also using ANGLE for translation.

### The draw call is the unit of cost

Each draw call carries a roughly fixed CPU cost: JS binding, client validation, command encoding, server validation, translation and driver work. On top of that come state changes between draws: binding a different texture, switching programs, changing blend mode, uploading uniforms. GPUs themselves can push millions of triangles per frame. What limits a WebGL 2D game is almost always the number of draw calls and state changes, not triangle count or fill rate.

That's why the core of every WebGL 2D renderer is a **sprite batcher**:

```js
// One frame, conceptually:
let n = 0;
for (const s of sprites) {           // plain JS, no GL calls
  writeQuad(vertexData, n++, s.x, s.y, s.w, s.h, s.u0, s.v0, s.u1, s.v1, s.color);
}
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertexData.subarray(0, n * FLOATS_PER_QUAD));
gl.uniformMatrix3fv(uCamera, false, cameraMatrix);
gl.bindTexture(gl.TEXTURE_2D, atlas);
gl.drawElements(gl.TRIANGLES, n * 6, gl.UNSIGNED_SHORT, 0);   // one draw for every sprite
```

- Every sprite becomes 4 vertices (or 1 instance with instancing) written into a preallocated `Float32Array`.
- All sprites share one **texture atlas**, so no texture switch is needed.
- The batch is flushed only when something forces it: a new texture, a different blend mode or shader, or a full buffer.
- A 16-bit index buffer can address 65,536 vertices, which is 16,384 quads per batch.

Ten thousand sprites become one buffer upload and one draw call. The JS loop that fills the array is the main cost, and it's plain arithmetic on a typed array, which V8 runs very fast.

**Instancing** (WebGL 2 `drawArraysInstanced`, or `ANGLE_instanced_arrays` in WebGL 1) shrinks the upload further. Send one small record per sprite (position, size, UV rect, color) and let the vertex shader expand it into a quad.

### Textures and memory

- `texImage2D` uploads pixels from an image, canvas, `ImageBitmap` or typed array. Uploads are expensive and can stall, so do them at load time, not mid-frame.
- Textures live in GPU memory. A 4096×4096 RGBA atlas is 64 MB uncompressed, plus a third more with mipmaps. Mobile GPUs have tighter limits; `gl.getParameter(gl.MAX_TEXTURE_SIZE)` tells you the largest size.
- WebGL 1 restricts non-power-of-two textures: no mipmaps and no `REPEAT` wrapping. WebGL 2 lifts this.
- Set `UNPACK_PREMULTIPLY_ALPHA_WEBGL` and the blend function consistently, or transparent edges get dark or bright fringes.
- For pixel art, use `NEAREST` filtering and pad atlas entries by at least one pixel. Otherwise neighbouring sprites bleed into each other when sampled at fractional positions.

### Shaders

Shaders are compiled the first time they're used, and in practice that happens twice: once by ANGLE's translator and again by the driver. That can take tens of milliseconds and cause a visible hitch. Compile and link every program during loading. `KHR_parallel_shader_compile` lets you poll for completion without blocking.

Fragment shader precision matters on mobile. `mediump` is often a 16-bit float, and that isn't enough for large world coordinates or long-running time values. Keep world-space maths in the vertex shader or pass small, relative values.

### Context loss

The GPU can be taken away from the page at any time: a driver reset, the OS reclaiming memory, too many contexts open. When that happens, `webglcontextlost` fires and every buffer, texture and program is gone. A robust renderer listens for the event, calls `preventDefault()`, and rebuilds everything on `webglcontextrestored`. Canvas 2D can also lose its context in some browsers, but the browser usually restores its contents for you.

### Where WebGL time goes

```
frame time ≈ JS work filling vertex arrays
           + draw calls × (binding + validation + command buffer + driver)
           + state changes between draws
           + GPU time (vertex + fragment work, fill rate, overdraw)
```

With good batching, the draw-call term drops to a handful per frame. The usual limits then become JS-side game logic and **overdraw**: every transparent layer that covers the screen runs the fragment shader again for each of those pixels. That cost matters most on mobile GPUs.

## Side by side: drawing 10,000 sprites

| Step | Canvas 2D | WebGL with a batcher |
| --- | --- | --- |
| JS calls per frame | ~10,000 `drawImage`, plus state changes | ~5 (`bufferSubData`, `uniformMatrix3fv`, `bindTexture`, `drawElements`) |
| Work per sprite | binding, validation, a recorded paint op, later Skia playback | ~16–20 float writes into a typed array |
| Batching | Browser heuristics; broken by any state change | Explicit; broken only by texture, blend or shader changes |
| GPU draws | Varies with Skia's merging | 1 |
| Per-pixel effects | None beyond blend modes and `filter` | Free to add in the fragment shader |

Canvas spreads its cost across many small calls, while a WebGL batcher pays a fixed cost for the whole batch. That's why WebGL scales with sprite count and Canvas doesn't.

## Features that change the decision

**Lighting.** Terraria-style per-tile light needs a value for every tile, smoothed across tile boundaries, recomputed when the world changes.

- On Canvas you either draw a dark rect per tile with varying alpha (thousands more calls) or compute a light bitmap on the CPU and upload it with `putImageData`/`drawImage` (a CPU pass plus an upload every frame).
- On WebGL, you upload the light grid as a small texture (one texel per tile) and let the fragment shader sample it with linear filtering. Smooth lighting then costs one texture lookup per pixel.

**Large tile maps.**

- On Canvas, pre-render static chunks (say 32×32 tiles) into offscreen canvases and draw one image per visible chunk. Re-render a chunk only when one of its tiles changes. This works well for Stardew-style maps that rarely change.
- On WebGL you can keep all visible tiles in one batch, or store the map itself as a texture of tile IDs and let a shader look each one up in the atlas. That draws the entire visible map in one quad.

**Blend modes and effects.**

- Canvas has 26 `globalCompositeOperation` modes and CSS-style `filter`s (blur, brightness and so on). They're convenient, but `filter` in particular can be slow, and you can't add your own.
- WebGL has fixed-function blending plus arbitrary shaders and render-to-texture. Bloom, distortion, palette effects, outlines, CRT effects and day/night grading all become a pass over a framebuffer.

**Text, vector shapes, anti-aliased lines.**

- This is Canvas's strength: correct shaping for any script, sub-pixel anti-aliasing, curves, dashes and joins, all built in.
- In WebGL you rebuild each of these. For text, you rasterize glyphs into an atlas (often by drawing them with a Canvas 2D context and uploading the result) or use signed distance field fonts. For shapes, you tessellate them yourself, or draw circles and rounded rects analytically in a fragment shader.

**Debuggability.**

- Canvas errors are immediate and readable.
- WebGL errors are silent until you call `getError` (which stalls the pipeline) or turn on a debug wrapper. Tools like Spector.js capture a frame's GL calls and state.

## What about WebGPU?

WebGPU is the successor to WebGL. It's modelled on Vulkan, Metal and D3D12:

- Pipeline state objects are compiled ahead of time, so there's less validation per draw.
- Command encoders are recorded explicitly.
- Compute shaders are built in. Terraria-style light propagation and particle simulation could run entirely on the GPU.
- Shaders are written in WGSL.

Draw calls are cheaper than in WebGL, and the batching ideas above still apply. Browser support is broad but newer than WebGL, so WebGL 2 remains the safe baseline, with WebGPU as an optional backend.

## What this means for h3-engine

h3-engine's `Renderer` is a thin layer over Canvas 2D: `rect`, `circle`, `line`, `poly`, `text`, `image`, `sprite`, and `push`/`pop` with transforms. That's the right choice for its goals: tiny, readable, high-quality text and shapes with no setup, and enough speed for games like the examples.

A WebGL backend behind the same interface (listed under "After 1.0, maybe" in the README) would look like this:

| `Renderer` call | WebGL implementation |
| --- | --- |
| `push` / `pop` / `translate` / `scale` / `rotate` | A matrix stack in JS; vertices are transformed on the CPU, or the matrix is sent as a uniform |
| `rect(x, y, w, h, color)` | A quad sampling a 1×1 white texel in the atlas, tinted by vertex color, so it batches with sprites |
| `sprite` / `image` | Quads with UVs into a texture atlas packed at load time |
| `circle` / `strokeCircle` | A quad with an analytic circle (signed distance) in the fragment shader |
| `line` / `poly` | Quads per segment; triangles via fan or ear-clipping for `poly` |
| `text` | Glyphs rendered once with a hidden Canvas 2D context into an atlas, then drawn as quads |
| `alpha` | Multiplied into vertex color |
| end of frame | Flush the batch |

Game code wouldn't change. `Renderer` is already an abstract base with `CanvasRenderer` as the default backend, so a WebGL backend is one more subclass. The game would choose it at startup by passing the class, for example `new Game({ renderer: WebGLRenderer })`, and fall back to Canvas when WebGL isn't available. Passing a class rather than a string means bundlers only include the backends a game imports.

Until then, these steps keep the Canvas renderer competitive for bigger maps:

- Cache static tile layers in offscreen-canvas chunks.
- Keep sprites on shared sheets.
- Avoid per-frame `getImageData`.
- Minimize state changes, for example by grouping draws by color or sheet.
