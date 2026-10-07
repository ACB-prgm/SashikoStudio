# Sashiko Pattern Studio 1.1

A self-contained browser app for periodic sashiko stitch maps, SVG export,
actual-size paper printing, and **3D-printable marking stencils**.

## Run or publish

Open `index.html` in a modern browser. All pattern computation and STL generation
are local. There are no external JavaScript libraries, CDNs, API calls, fonts,
accounts, runtime dependencies, or uploaded designs.

For a static website (including GitHub Pages), put `index.html` at the site's
entry location. Only that file is required at runtime. The `src/`, `tests/`, and
`build.py` files are for maintenance; they do not need to run on the host.

## Add or edit patterns

Pattern definitions are modular. Each design lives in its own JavaScript file
under `src/patterns/`; `build.py` discovers the directory automatically and
bundles every design into the standalone `index.html`. There is no pattern
manifest to maintain.

For the exact registration contract, available geometry primitives, tileability
rules, and examples, see **[PATTERN_FORMAT.md](PATTERN_FORMAT.md)**.

Typical workflow:

```sh
cp src/patterns/grid.js src/patterns/my-pattern.js
# edit the new file
python build.py
```

Then inspect **One repeat** and **Seam check** in the app before testing SVG and
STL output. Pattern files define continuous geometry only; stitch fitting and all
exports remain shared engine behavior.

## Make a stencil

1. Select and size a design with the normal pattern controls.
2. Click **Stencil / STL** below the main preview.
3. Choose **One seamless repeat** or **Full panel**.
4. Set plate thickness and slot width. Defaults are 1.4 mm and 0.9 mm.
5. Review the top view, optional rotatable 3D mesh, and spacing warnings.
6. Download the binary STL and import it into your slicer as millimeters.

The 3D object is a flat plate. Each stitch is a **hole all the way through**,
with rounded ends in the XY plane. There is no backing floor, recessed level,
raised relief, or Z bevel. The plate's outside corners are not rounded: its exact
rectangular dimensions are part of the repeat. An individual slot intersecting
the perimeter is intentionally open at that perimeter; the next tile completes
it. Do not resize individual tiles inconsistently or insert a gap between them.

The STL always uses the stitches, even when the main 2D display is set to solid
construction geometry. SVG line weight and STL slot width are separate controls.
Increasing slot width does not extend the nominal stitch length: the slot's
centerline is shortened before its round caps are added.

**Junction opening** in the stencil dialog is linked to the main pattern setting.
Changing it updates the SVG/stitch map as well. It can change the fitted stitch
lengths, which remain visible in the main app. Nothing automatically changes
stitch length, junctions, or the design merely to suppress a warning.

## Check the plastic, not just the mesh

The default minimum-plastic-spacing threshold is 0.9 mm. It is an advisory
threshold, **not a guarantee for any nozzle or material**. The checks include:

- Shortest distance between nearby distinct slot polygons.
- Positive plastic rims between a slot and an outside edge.
- Touching/overlapping slots, point-touching boundaries, and detached pieces.
- Mesh edge closure, oriented faces, finite triangle area after Float32 STL
  serialization, and positive volume consistent with plate area and thickness.

Thin-web and thin-rim warnings require explicit acknowledgement before download.
Touching/overlapping slots, disconnected plates, a slot wider than its fitted
stitch, or a failed mesh check block the STL. The app does not quietly delete
stitches or add bridges to make an invalid selection printable.

Widening marks from a thin SVG stroke to a useful marking slot can significantly
reduce plastic near a junction. For the default interlaced pattern at 48 mm repeat
width, 2 mm target stitches, and 0.9 mm slots, the measured slot-to-slot web is
about 0.35 mm with a 1 mm junction opening. Increasing that opening to 2 mm gives
about 1.00 mm between slots, but can still leave thin rims at the repeat boundary.
Both configurations are mathematically connected; neither is a physical-print
certification. Look at the slicer's actual toolpaths and print a small sample.

The red top-view indicators mark examples of sub-threshold areas (up to 80), not
all possible weak sections. `>=` before the minimum-web metric means no closer
pair was found within the measured search radius. The check is not a medial-axis
analysis, minimum load-bearing-neck proof, printer tolerance simulation, or
mechanical-strength analysis. Thin rims and boundary openings need particular
attention on a finite physical tile.

The **Save build report** button records dimensions, source settings, mesh
statistics, and warnings in JSON. It is separate from **Save settings**, which
stores both pattern and stencil controls. Version-1 settings files still load;
missing stencil fields receive their defaults.

## How the geometry is made

The existing geometric primitives and fitted stitch intervals remain the source
of truth. The STL engine does not trace a raster or reverse-engineer an exported
SVG.

1. Sample each fitted stitch along its original curve, insetting each end by
   half the selected slot width. Adaptive centerline chord tolerance: 0.0015 mm.
2. Construct a constant-width polygonal slot with round end caps. Nominal cap
   chord tolerance: 0.003 mm. Smooth sampled curves use offset joins.
3. Quantize to a 0.0001 mm XY grid, make periodic copies, and clip to the complete
   tile or panel. The final STL then uses Float32 coordinates.
4. Diagnose distinct slot collisions and insufficient spacing.
5. Sweep the remaining material into trapezoidal cells, retaining unchanged
   intervals across adjacent scan bands. Split every shared horizontal edge at
   identical vertices to avoid T-junctions.
6. Triangulate the cells and assemble the actual material boundary loops.
7. Extrude the surface and its boundaries to the chosen thickness, with no
   faces covering the slot interiors.
8. Validate topology, orientation, area, and volume, then write binary STL.

SVG curves stay analytic as before. STL outlines are necessarily polygonal
approximations. Repeat dimensions are quantized to the XY grid before replication
so neighboring stencil tiles use the same lattice. Displayed dimensions are
rounded for readability; slicer and report values are more precise.

Geometry calculation normally runs in a cancellable Blob Web Worker. An older
browser that cannot construct a worker uses the same engine on the main thread;
large panels may pause the UI in that fallback. The 3D preview uses the actual
mesh with WebGL, or a software-projected, flat-shaded mesh and verified boundary
loops when WebGL is unavailable. Drag to rotate, wheel to zoom, double-click or
Home to reset; keyboard arrows and +/- are also supported.

There are explicit complexity limits: 10,000 slot cutouts, 400,000 slot-boundary
vertices, 400,000 surface triangles, and 900,000 final STL triangles. Hitting a
limit asks for a smaller panel instead of an incomplete export.

## Source layout

```text
index.html                 The complete runtime app; publish this file
build.py                   Rebuild index.html from src (Python 3, standard library)
src/
  template.html            Existing page layout plus integration markers
  pattern-app.js           Shared geometry/stitch engine, SVGs, print, presets
  patterns/                One JavaScript source file per design; auto-discovered
    interlaced.js
    grid.js
    diamonds.js
    circles.js
    chevrons.js
    waves.js
  stencil-dialog.html      Stencil controls and preview dialog
  stencil.css              Responsive stencil UI
  stencil-ui.js            Settings, sampling, worker, preview, downloads
  stencil-engine.js        Slot geometry, material sweep, mesh, STL, validation
  stencil-preview.js       WebGL and software mesh viewers
tests/
  test_browser.py          Offline browser flow, downloads, desktop/mobile
  test_guards.py           Invalid settings, cancellation, preset regression
  test_geometry.js         Mesh generation and invalid-geometry guards
  validate_stl.py          Independent trimesh/Shapely validation
PATTERN_FORMAT.md           Pattern authoring contract and examples
validation/                Results from this delivery
```

After editing source or adding/removing a file in `src/patterns/`, run:

```sh
python build.py
```

No npm install or front-end build framework is needed.

## Verification

The delivered version was tested in Chromium, with the browser context offline.
The test harness injects the self-contained HTML because this environment blocks
navigation to local file and HTTP URLs. Therefore a live GitHub Pages deployment,
Safari/Firefox, and physical prints were **not** verified here. The software 3D
fallback was exercised and visually inspected; WebGL was unavailable in this
test environment.

Checks covered all six designs as one-repeat and 2x2 stencils, plus the default
4x6 interlaced panel. Independent trimesh/Shapely checks verified a single closed
component, consistent winding, expected dimensions/volume, no covering triangles
at hole-interior samples, and matching opposite-edge opening traces. Browser
checks included SVG/print regression, version-1 and version-2 settings, warning
acknowledgement, overly wide slots, cancellation, and full-panel export.

These are geometric/software tests, not exhaustive tests of every setting.
Inspect each generated file in a slicer and test your printer/material.

To repeat the checks, install the optional **development-only** tools:

```sh
python -m pip install playwright trimesh shapely numpy
python -m playwright install chromium
python tests/test_build.py
python tests/test_browser.py
python tests/test_guards.py
node tests/test_geometry.js
python tests/validate_stl.py
```

Tests use `CHROMIUM_PATH` when set, an installed `chromium` command when present,
or Playwright's downloaded Chromium otherwise. Generated fixtures and STLs go
in `test-results/` and are not required by the application.
