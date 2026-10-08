# Sashiko Pattern Studio 1.3

A browser-only tool for tileable sashiko designs, actual-size SVG/paper output,
and 3D-printable marking stencils. The library contains 22 patterns. See
[PATTERN_LIBRARY.md](PATTERN_LIBRARY.md) for reference coverage and the one
intentionally omitted reconstruction.

## Run, build, and publish

Open `index.html` in a modern browser, or publish the repository root through
GitHub Pages. Everything runs locally: no server, uploads, CDNs, accounts, or
runtime dependencies. `index.html` remains the complete, self-contained runtime.

After editing source or adding a pattern:

```sh
python3 build.py
```

The build uses only Python's standard library. Designs under `src/patterns/*.js`
are discovered automatically; there is no manifest to maintain. Read
[PATTERN_FORMAT.md](PATTERN_FORMAT.md) for the registration contract, primitives,
intersection helpers, tileability requirements, and examples.

The **Build standalone application** workflow runs dependency-free checks on
`dev` pushes and pull requests. After a successful source push to `dev`, its
separate write-scoped job commits a rebuilt `index.html` to `dev` when needed.
It never merges a PR or modifies `main`. A rejected non-fast-forward push does
not overwrite concurrent work; rerun the build after reconciling the branch.
Local builds remain supported. Pull requests check that the committed runtime
matches the source. GitHub Pages still serves the built file from `main` after
review and merge; Pages does not run Python at request time.

## Independent tile and export sizes

**Tile width** controls motif scale. Tile height follows each design's aspect
ratio so the geometry is not distorted. **Export width/height** control the
final panel canvas independently.

The app fits as many **complete** tiles as possible into that canvas, preserves
tile dimensions, and centers any leftover space. It does not stretch the pattern
or crop partial tiles just to fill the requested size. The calculated row and
column counts and margins are displayed. If no complete tile fits, panel and
stencil export are blocked with an explanation.

The starting layout is **3 x 3 tiles**, including the enabled protective rim.
While this automatic starting layout is selected, changing tile size or design
updates the canvas to retain three rows and columns. The preset menu includes
100, 150, and 200 mm squares, US Letter, A4, and A3. These presets only populate
editable width/height fields; editing either field switches to a fixed canvas.
Choosing a fixed preset or editing dimensions keeps the canvas fixed while tile
size changes. Selecting **3 x 3 tiles** returns to the automatic starting layout.
Automatic canvas dimensions round upward to 0.001 mm, avoiding fractional
rounding that would accidentally exclude the last row.

Panel SVG and full-panel STL use the selected outer width and height. For example,
a **100 x 100 mm** selection remains **100 x 100 mm**, including the STL rim.
A single **Repeat SVG** is still the unpadded, exact repeat rectangle and remains
suitable for edge-to-edge digital tiling. Canvas SVGs include the centered margins
and should not be treated as fundamental repeat units.

Paper-sized canvases print on one matching nominal sheet at 100% scale. Disable
browser headers/footers and automatic scaling. Physical printer margins may clip
artwork near an edge; use a smaller canvas or borderless printing as appropriate.
Larger canvases are split across sheets with 5 mm overlap, without rescaling.

## Stencil defaults and controls

| Setting | New default |
| --- | ---: |
| SVG line weight | 0.9 mm |
| Export area | Full panel |
| Plate thickness | 0.9 mm |
| Opening width | 1.8 mm |
| Protective rim | Enabled |
| Minimum rim width | 1.0 mm |
| Outer corner radius | 0.6 mm |
| Cut style | Stitch slots (dashed) |

Stencil fields accept typed decimals, arrow stepping, and sliders. A focused
field is not normalized during typing, so entering `1.2` does not become `12`.
Validation is finalized on change/blur or Enter. Invalid intermediate entries
cannot leave a stale STL download enabled.

**The width default is not a printability guarantee.** Some fitted 2 mm stitches
are shorter than 1.8 mm or too close at junctions for 1.8 mm openings. Those
combinations correctly block export. Reduce opening width, increase stitch
length/tile size/junction opening, or use an appropriate checked example. The
app does not silently remove marks, widen gaps, or alter the design to make an
unsafe configuration appear valid.

### Protective rim and rounded corners

The rim is uncut material around the centered complete-tile array. For a fixed
canvas its width is reserved **inside** the selected outer dimensions before
calculating tile counts. Remainder space can make the actual border wider than
the selected minimum. For **One repeat**, the plate is one tile plus the rim on
all four sides. Cuts that reach the design area's boundary stop there, not at
the outside of the rimmed plate.

Outer corners are rounded in XY only; there is no Z bevel or backing floor.
The effective corner radius is limited to the rim width and half the plate size
so rounding cannot intrude into the design. A warning reports any radius limit.
Disabling the rim restores square outer corners.

**Do not butt rimmed stencil edges together to repeat a pattern.** Their outside
size includes blank border material. Align by the pattern repeat coordinates.
For physically edge-to-edge repeat tiles, disable the rim and choose One repeat.

### Three through-cut styles

- **Stitch slots:** round-ended slots on the fitted stitch intervals. Opening
  width is independent of SVG line weight. Slot centerlines are shortened before
  adding caps so widening them does not increase nominal stitch length.
- **Dots:** one circular hole at the midpoint of every fitted stitch; opening
  width is the diameter. These are marking dots, not needle-puncture endpoints.
- **Solid lines:** continuous construction geometry without stitch gaps.
  Intersecting cuts are explicitly unioned before meshing. A closed cut loop can
  release a loose island; the exporter blocks disconnected plates instead of
  quietly dropping islands or adding unrequested bridges. Open patterns such as
  wave rows can remain connected through the protective rim. Minimum internal
  web thickness is not measured in solid mode, and the UI says so.

All modes cut completely through a flat plate. There is no recessed floor.
STL coordinates are millimeters; import them as millimeters in the slicer.

## Geometry and safety checks

The periodic construction paths remain the source of truth for SVGs and STLs.
Stitch fitting, junction clearances, and exports are common engine behavior, not
part of each pattern file. SVG curves are analytic; STL boundaries are sampled
polygonal approximations on a 0.0001 mm XY grid. Solid intersections are split
at shared quantized vertices before the scanline union, material decomposition,
and extrusion. Surface joins share matching vertices rather than T-junctions.

Discrete cutouts are checked for overlaps, nearby thin webs, and edge margins.
The threshold (default 0.9 mm) is advisory, not a nozzle/material certification.
Thin-plastic warnings require acknowledgement. Overlapping discrete holes,
disconnected material, point-touching boundaries, invalid triangles, inconsistent
orientation, failed area/volume checks, and non-closed meshes block downloads.
Solid mode permits intentional overlapping cuts, but not disconnected material.
Checks are not a full mechanical, medial-axis, tolerance, or slicer simulation.

Generation runs in a cancellable local Blob worker, with a main-thread fallback.
The top view and rotatable 3D view use the computed geometry. Mesh complexity
limits produce an error rather than an incomplete file. Inspect the sliced
result and print a small test; software checks do not certify physical prints.

## Saved settings

Version 3 stores canvas sizing, cut style, and rim controls together with the
existing pattern and stencil settings. Version 1/2 JSON files still load: their
row/column counts are converted to physical canvas dimensions and their stencils
retain the legacy no-rim behavior. The checked examples in
`presets/reference-library/` intentionally keep their original dimensions.

This release uses versioned browser storage so first load starts with the new
defaults rather than the previous automatic preferences. Explicit saved JSON
files remain importable. **Reset** restores the current defaults.

## Source layout

```text
index.html                  Generated, self-contained runtime
build.py                    Python standard-library build
src/panel-layout.js         Pure canvas / complete-tile fitting math
src/pattern-app.js          Geometry, stitch fitting, SVG, print, main UI
src/pattern-helpers.js      Shared pattern-authoring geometry helpers
src/patterns/*.js           One source file per design
src/template.html          Page layout and main styles
src/stencil-dialog.html    Stencil controls
src/stencil.css            Responsive stencil styling
src/stencil-ui.js          Input, curve sampling, worker and downloads
src/stencil-engine.js      Cut outlines, union, material mesh, STL checks
src/stencil-preview.js     3D mesh viewers
presets/reference-library/ Legacy checked example settings
PATTERN_FORMAT.md          Design authoring guide
PATTERN_LIBRARY.md         Reference reconstruction notes
validation/export-controls/ Current feature and regression summaries
```

## Verification

Dependency-free checks:

```sh
python3 tests/test_build.py
node tests/test_pattern_helpers.js
node tests/test_layout_stencil.js
```

Optional development-only browser and independent mesh checks (use a virtual
environment for Python packages):

```sh
python3 -m venv .venv
. .venv/bin/activate
python -m pip install playwright trimesh shapely numpy
python -m playwright install chromium
python tests/test_export_controls.py
python tests/validate_layout_stl.py
python tests/test_browser.py
python tests/test_guards.py
node tests/test_geometry.js
python tests/validate_stl.py
python tests/test_reference_patterns.py
node tests/test_reference_meshes.js
python tests/validate_reference_stl.py
```

Tests honor `CHROMIUM_PATH`, an installed `chromium`, or Playwright's downloaded
browser. Generated fixtures go in `test-results/` (ignored by Git). New checks
cover slow typed decimals, preset edits, independent tile size, exact SVG/STL
canvas dimensions, rounded rims, dots, solid unions, island blocking, zero-fit
handling, settings compatibility, mobile layout, and actual browser downloads.
Historical inputs are explicit in regression tests because new defaults are
intentionally different. Tests are sampled coverage, not proof of every possible
combination or a physical-print certification.
