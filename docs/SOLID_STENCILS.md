# Solid-line stencils and junction bridges

Solid mode means continuous cuts **between junctions**, not continuous cuts
through junctions. It removes the running-stitch gaps along each interval while
retaining the selected junction opening as uncut material. This is different
from cutting the entire unsplit construction network, which can release islands.

The junction-opening field remains enabled in solid mode. At a junction, the
cut generator starts with the shared pattern engine's clearance, then accounts
for the selected opening width and rounded end caps. Incident curve endpoints
are compared in one coordinate system, including junctions across tile edges.
At acute or tangent contacts, additional setback can be necessary so the wide
caps do not fill the gap. This does not modify the SVG or saved stitch settings.

Internal primitive joins along a continuous curve and periodic wave seams are
not treated as new junctions. The engine still unions overlapping caps at those
joins. Slot and dot modes retain their existing fitted-stitch behavior.

If the requested clearances leave no usable cut on an interval, export is
blocked with an explanation. Cuts are never silently omitted. Increase tile
size or reduce opening width/junction opening as appropriate. A genuinely closed
cut without authored junctions can still create a loose island; disconnected
meshes remain blocked. This is not an automatic bridge-placement algorithm for
arbitrary unsplit loops. Internal solid-mode web thickness remains unmeasured.

## Regression checks

```sh
node tests/test_solid_junctions.js
python3 tests/validate_solid_junctions.py
```

The Node suite is dependency-free and runs in the build workflow. The independent
Python checks use NumPy, Shapely 2, and trimesh, as in the other mesh tests.
Generated STLs and reports are written under `test-results/solid-junctions/`.

Coverage includes editable junction controls; rounded-cap and periodic-boundary
clearances; increasing opening size; independence from stitch length/ratio;
source-model immutability; continuous wave joins; invalid-span rejection;
unchanged slot/dot placement; and explicit reproduction of the old grid-island
failure. There are 45 connected STL cases: one repeat and a 3x3 panel for each
of 22 designs, plus a dedicated grid regression. These use 1.8 mm opening width,
1 mm junction opening, 0.9 mm thickness, and the default rim. Twenty-one designs
use 48 mm tiles; Seigaiha uses a 120 mm tile because its tight tangent arcs need
more space at that opening width. The independent checks verify connectedness,
mesh closure/winding, dimensions, volume, and through-cuts.

These are sampled software/geometry tests, not a physical-print certification.
