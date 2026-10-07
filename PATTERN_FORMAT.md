# Pattern design file format

Sashiko Pattern Studio keeps each design in its own JavaScript file under
`src/patterns/`. The build script discovers every `*.js` file in that directory,
validates its basic registration metadata, and bundles it into the standalone
`index.html`.

There is no manually maintained pattern manifest. To add a design, add one file
and run:

```sh
python build.py
```

The output remains a single self-contained HTML file suitable for GitHub Pages or
offline use.

## Minimal pattern file

Each file must call `registerPattern(...)` **exactly once**:

```js
registerPattern({
  id: 'example',
  order: 100,
  name: 'Example pattern',
  note: 'Short description shown below the pattern picker.',
  aspect: 1,

  build(W) {
    const H = W;

    return {
      W,
      H,
      edges: [
        edge(line([0, H / 2], [W, H / 2]), 'horizontal')
      ]
    };
  }
});
```

Do not use `import` or `export`. Pattern files are source modules for this project,
not browser ES modules: `build.py` injects them into the common geometry engine so
they can use the engine primitives listed below without duplicating code.

## Required metadata

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string | Stable internal key. Lowercase letters, numbers, and hyphens only. Must be unique. |
| `name` | string | Human-readable name shown in the UI and exports. |
| `note` | string | Short explanation shown when the design is selected. |
| `aspect` | positive number | Nominal repeat height / repeat width. Used as design metadata. |
| `build(W)` | function | Creates the continuous repeat geometry at repeat width `W` millimeters. |

`order` is optional. Lower values appear earlier in the pattern picker. If it is
omitted, the engine uses `1000`.

## `build(W)` contract

`build(W)` receives the requested repeat width in millimeters and must return:

```js
{
  W,       // repeat width in mm
  H,       // repeat height in mm
  edges    // array of engine paths
}
```

`W` and `H` define the exact repeating rectangle. They are not a crop box around
visible artwork. Adjacent copies of this rectangle must continue the geometry
seamlessly on both axes.

The design file defines **continuous construction geometry only**. It must not
place individual sashiko stitches or STL holes. The shared engine handles:

- junction detection and clearance;
- stitch/gap fitting;
- periodic replication and clipping;
- SVG and print output;
- rounded through-slots and STL generation.

This separation is intentional: one geometric design drives every output mode.

## Geometry primitives available to a pattern

Pattern files are bundled inside the geometry-engine scope and may use these
helpers directly.

### `line(p0, p1)`

Straight primitive between two `[x, y]` points.

```js
line([0, 10], [20, 10])
```

### `cubic([p0, p1, p2, p3])`

Cubic Bezier primitive. The engine computes arc length and can slice the curve at
stitch boundaries.

```js
cubic([
  [0, 10],
  [5, 0],
  [15, 20],
  [20, 10]
])
```

### `arc(center, radius, startAngle, endAngle)`

Circular arc. Angles are radians.

```js
arc([20, 20], 10, 0, Math.PI)
```

### `path(parts, options)`

Combines multiple primitives into one continuous engine path.

```js
path([partA, partB], { route: 'wave' })
```

For a path whose stitch rhythm should wrap continuously around its own period,
set `periodic: true`:

```js
path(parts, { periodic: true, route: 'wave' })
```

A periodic path is treated as having no junction endpoints for stitch fitting.
Use it only when the path itself represents a complete continuous period.

### `edge(primitive, route)`

Convenience wrapper for a single primitive:

```js
edge(line([0, 0], [W, H]), 'diagonal')
```

### Other helpers

- `TAU` = `Math.PI * 2`
- `mod(value, modulus)` = positive modulo helper

Normal JavaScript and `Math.*` functions are available, so procedural geometry,
loops, calculated intersections, rotations, and offsets are all valid.

## Junctions

For non-periodic paths, the engine identifies junctions from matching path
endpoints, including equivalent endpoints across opposite repeat boundaries.
Those junctions receive the user-selected negative-space opening before stitches
are fitted.

Therefore, when two construction lines are intended to meet, their endpoint
coordinates should be mathematically identical. Avoid visually approximate points
such as `19.999` and `20` unless they are intentionally separate.

The optional `route` string labels related geometry for debugging/inspection. It
does not currently determine sewing order.

## Tileability requirements

A pattern is considered correctly defined only when its **continuous geometry** is
periodic at the exact `W x H` boundary.

A curve may cross or be cut by a tile edge. That is often correct. What matters is
that the geometry entering the neighboring tile is the exact continuation of the
geometry leaving the current tile.

For example, a horizontal line can be defined beyond the tile so periodic copies
supply both sides:

```js
edge(
  line([W / 2, H / 2], [W * 1.5, H / 2]),
  'horizontal'
)
```

The renderer creates translated copies first and clips only after replication.
Do **not** design a visually pleasing arbitrary crop and assume that matching
pixels at the edges makes it a true repeat.

Use the app's **Seam check** view to inspect a 3 x 3 repeat before accepting a new
design.

## Example: chevrons

```js
registerPattern({
  id: 'chevrons',
  order: 50,
  name: 'Chevron rows',
  note: 'Parallel zigzags. Stitches stop short of each peak and valley.',
  aspect: 0.5,

  build(W) {
    const H = W / 2;
    const a = [0, H / 4];
    const b = [W / 2, H * 3 / 4];
    const c = [W, H / 4];

    return {
      W,
      H,
      edges: [
        edge(line(a, b), 'zigzag'),
        edge(line(b, c), 'zigzag')
      ]
    };
  }
});
```

The two line segments terminate at exactly the same `b` coordinate. The engine
recognizes that point as a junction and applies junction spacing there.

## File and build rules

- Put pattern files directly in `src/patterns/` with a `.js` extension.
- One file = one design = one `registerPattern(...)` call.
- `id` must be a literal lowercase identifier matching `[a-z0-9-]+`.
- IDs must be unique across all pattern files.
- Do not include a literal `</script` token; source is ultimately inlined into HTML.
- Do not modify stitch spacing, DOM controls, exports, or STL logic from a pattern file.
- Keep geometry in millimeters relative to `W`; avoid fixed physical sizes unless the design specifically requires them.

`build.py` catches missing files, duplicate IDs, malformed registration count,
missing literal IDs, and unsafe inline-script tokens. Runtime registration also
validates required metadata and duplicate IDs.

## Adding a new design

1. Copy a simple existing file from `src/patterns/`.
2. Give it a new `id`, `name`, `note`, `aspect`, and `order`.
3. Implement only the continuous tile geometry in `build(W)`.
4. Run `python build.py`.
5. Open `index.html` and inspect **One repeat** and **Seam check**.
6. Test several repeat sizes, stitch lengths, and junction openings.
7. Open **Stencil / STL** and verify that practical slot widths do not create
   disconnected or excessively thin plastic.
8. Run the test suite before merging.

For a new family of geometry that cannot be expressed with the existing
primitives, extend the shared geometry engine first rather than implementing an
export-specific workaround inside one pattern file.
