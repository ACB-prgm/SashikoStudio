# Reference pattern library update

Adds **16 designs**, preserving the original six (**22 patterns total**).
Each added design is a separate `src/patterns/<id>.js` file. Names and reference
identifiers follow the supplied filenames; they are not independent historical
attributions or claims about a definitive traditional variant.

These are **geometric reconstructions**, not the manufacturer's vector sources or
stitch-by-stitch transcriptions. Rectangular repeats replace the arbitrary image
crops. Borders, labels and watermarks are not included. The common engine applies
the selected stitch length, ratio and negative space at corners/intersections,
even where a reference shows continuous or crossing stitches. Curved proportions
and some internal fold proportions are inferred from the raster images.

## Included references

| Design | Module | Supplied reference | Reconstruction note |
| --- | --- | --- | --- |
| Shippo | [`shippo.js`](src/patterns/shippo.js) | `01_L-1001_shippo.jpg` | Circular reconstruction of the four-petal lattice. |
| Asanoha | [`asanoha.js`](src/patterns/asanoha.js) | `02_L-1003_asanoha.jpg` | Straight-line hemp-leaf geometry on a triangular lattice. |
| Hanaguruma | [`hanaguruma.js`](src/patterns/hanaguruma.js) | `03_L-1004_hanaguruma.jpg` | Six-petal flowers reconstructed with circular arcs. |
| Yoshiwara tsunagi | [`yoshiwara-tsunagi.js`](src/patterns/yoshiwara-tsunagi.js) | `04_H-2148_yoshiwara-tsunagi.jpg` | Hooked diagonal chains reconstructed using the enlarged inset; a 3:1 repeat preserves the chain phase. |
| Kasane rindou | [`kasane-rindou.js`](src/patterns/kasane-rindou.js) | `06_H-1142_kasane-rindou.jpg` | Symmetric folded-triangle reconstruction. The inner fold proportions are inferred from the image. |
| Kamon | [`kamon.js`](src/patterns/kamon.js) | `07_H-1141_kamon.jpg` | Petal shoulders use fitted cubic curves, not exact source curves. |
| Tsubomi | [`tsubomi.js`](src/patterns/tsubomi.js) | `08_H-1075_tsubomi.jpg` | The solid-guide reference is converted to the selected running-stitch rhythm; geometry mode shows the unstitched guides. |
| Nowaki | [`nowaki.js`](src/patterns/nowaki.js) | `09_201_nowaki.jpg` | Outer circular waves with fitted cubic inner wind strokes. |
| Sayagata | [`sayagata.js`](src/patterns/sayagata.js) | `10_204_sayagata.jpg` | Alternating angular meanders on a diagonal lattice. |
| Seigaiha | [`seigaiha.js`](src/patterns/seigaiha.js) | `11_207_seigaiha.jpg` | Double circular waves with inner arcs ending at the next row. |
| Juuji | [`juuji.js`](src/patterns/juuji.js) | `12_208_juuji.jpg` | Five-unit crossed/stepped lattice, rather than a two-cross checkerboard. |
| Fundou tsunagi | [`fundou-tsunagi.js`](src/patterns/fundou-tsunagi.js) | `13_211_fundou-tsunagi.jpg` | Alternating-curvature quarter circles form crossing S-curves. |
| Yabane | [`yabane.js`](src/patterns/yabane.js) | `14_209_yabane.jpg` | Diagonal shafts and staggered staircase feathers on a six-unit grid. |
| Chidori tsunagi | [`chidori-tsunagi.js`](src/patterns/chidori-tsunagi.js) | `15_293_chidori-tsunagi.jpg` | Scalloped horizontal and vertical paths; smooth joins share stitch rhythm. |
| Hishi seigaiha | [`hishi-seigaiha.js`](src/patterns/hishi-seigaiha.js) | `16_H-2037_hishi-seigaiha.jpg` | Four nested angular waves in a staggered diamond lattice. |
| Kaki no hana | [`kaki-no-hana.js`](src/patterns/kaki-no-hana.js) | `17_H-2039_kaki-no-hana.jpg` | Stepped cross/flower outlines and the small central squares. |

## Omitted

**Onoe Kasane -- `05_H-2139_onoe-kasane.jpg`.** I did not recover the overlapping
curved network and repeat reliably enough from this reference to include it.
This is a reconstruction limitation, not a claim that the app cannot represent
it. It would need a reliable continuous-curve definition and explicitly resolved
intersections before inclusion. No different motif has been substituted.

## STL use and included examples

The drawings and stencil holes share the same fitted stitch intervals. Widening
a thin drawing into 0.9 mm slots can make nearby holes overlap, especially where
several curves have similar tangents. The app blocks those exports; it does not
silently erase stitches or merge cutouts.

The JSON files in [`presets/reference-library/`](presets/reference-library/) can
be opened through the application's **Load settings** button. Each example was
checked as a one-repeat and a 2 x 2 stencil with 0.9 mm slots and 1.4 mm plate
thickness, without omitted stitches or skipped curve intervals. **These are
mesh-checked examples, not mechanically validated or print-certified settings.**
Thin web and edge-rim warnings remain in many examples and must be reviewed in
the app and slicer before printing. Some measured webs are substantially thinner
than the 0.9 mm advisory threshold; a closed mesh is not a guarantee of strength.

Examples deliberately retain all warnings, and changing the dimensions, line
weight, stitch rhythm or opening requires a fresh check. Some examples use a
0.9 mm line weight: line weight participates in junction clearance as well as
SVG appearance, so returning it to 0.35 mm can change slot separation. The app
does not auto-load these examples when selecting a pattern.

| Design | Width (mm) | Target stitch (mm) | Junction opening (mm) | Line weight (mm) | Default STL settings |
| --- | ---: | ---: | ---: | ---: | --- |
| Shippo | 48 | 3 | 1 | 0.9 | Blocked: slot collisions |
| Asanoha | 48 | 2 | 3 | 0.35 | Blocked: slot collisions |
| Hanaguruma | 48 | 3 | 1 | 0.9 | Blocked: slot collisions |
| Yoshiwara tsunagi | 48 | 2 | 1 | 0.35 | Mesh passes; inspect warnings |
| Kasane rindou | 72 | 2 | 6 | 0.35 | Blocked: slot collisions |
| Kamon | 48 | 3 | 1 | 0.9 | Blocked: slot collisions |
| Tsubomi | 48 | 2 | 1 | 0.35 | Mesh passes; inspect warnings |
| Nowaki | 48 | 3 | 1 | 0.9 | Blocked: slot collisions |
| Sayagata | 48 | 2 | 1 | 0.35 | Mesh passes; inspect warnings |
| Seigaiha | 48 | 3 | 1 | 0.9 | Blocked: slot collisions |
| Juuji | 48 | 2 | 1 | 0.35 | Mesh passes; inspect warnings |
| Fundou tsunagi | 48 | 2 | 1 | 0.35 | Mesh passes; inspect warnings |
| Yabane | 48 | 2 | 2 | 0.35 | Blocked: slot collisions |
| Chidori tsunagi | 48 | 2 | 1 | 0.35 | Mesh passes; inspect warnings |
| Hishi seigaiha | 48 | 2 | 2 | 0.35 | Blocked: slot collisions |
| Kaki no hana | 48 | 2 | 1 | 0.35 | Mesh passes; inspect warnings |

## Implementation changes

`src/pattern-helpers.js` adds polyline construction and a periodic line/circular
arc graph builder. Crossings with neighboring repeat copies are split into real
junction endpoints and coincident segments are emitted only once. The build
script inlines this shared helper before the automatically discovered patterns.
Cubic intersections are not automatically solved; the cubic designs here are
explicitly arranged and segmented.

The stitch engine now uses actual curved arms to calculate near-tangent
clearance instead of relying only on a straight-ray estimate. This prevents an
unnecessarily large clearance from erasing short wave intervals. The existing
stencil topology and overlap guards remain unchanged.

## Verification

- Build discovers all 22 pattern modules; original build/discovery checks pass.
- All 16 added designs render offline in Chromium, with no JavaScript page errors.
- 432 size/stitch/opening combinations are exercised for finite, nonempty stitch
  output. Cramped settings may still warn about skipped intervals; the test does
  not label every possible setting printable.
- All 32 example STLs (16 designs x one-repeat / 2 x 2) pass mesh checks.
- Independent trimesh/Shapely checks confirm one watertight, consistently wound
  component, matching dimensions/volume, no slot roofs, and matching opposite
  boundary opening traces to the test tolerance (0.003 mm).
- All six original designs pass the existing browser, export-guard and geometry
  regression tests, including the original 4 x 6 interlaced panel.
- Shared graph-helper unit tests cover line/arc intersections, periodic neighbor
  intersections, coincident and reversed geometry, and unsupported-curve rejection.

Reports are in `validation/reference-library/`. Physical prints, other browsers,
and deployment of this ZIP to the live website have not been tested.

### Repeat the new checks

Use the optional development dependencies described in README.md. The runtime
application itself still needs no server, Node installation or network access.

```sh
python3 build.py
python3 tests/test_build.py
node tests/test_pattern_helpers.js
python3 tests/test_reference_patterns.py
node tests/test_reference_meshes.js
python3 tests/validate_reference_stl.py
```

The final independent validator uses Shapely 2.x, trimesh and NumPy. Browser
tests use Playwright/Chromium. Node is only needed for development tests.
