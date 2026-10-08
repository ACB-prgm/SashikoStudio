"""Independent checks for reference-library example STLs. Run browser + reference-mesh tests first."""
from pathlib import Path
import json,numpy as np,trimesh
from shapely.geometry import Polygon,LineString,Point
from shapely.strtree import STRtree
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results'/'references'
report=[]
for geometry in sorted(OUT.glob('*-verified-*-mesh.json')):
 spec=json.loads(geometry.read_text());name=geometry.name.replace('-mesh.json','');mesh=trimesh.load(OUT/(name+'.stl'),force='mesh',process=True)
 assert mesh.is_watertight,name
 assert mesh.is_winding_consistent,name
 assert mesh.is_volume,name
 assert len(mesh.split(only_watertight=False))==1,name
 W,H,T=spec['W'],spec['H'],spec['thickness']
 assert np.allclose(mesh.bounds,[[0,0,0],[W,H,T]],atol=1e-4),name
 assert abs(mesh.volume-spec['area']*T)<.04,name
 z=np.unique(mesh.vertices[:,2]);assert len(z)==2 and abs(z[0])<1e-6 and abs(z[1]-T)<1e-5,name
 top=mesh.triangles[np.all(np.isclose(mesh.triangles[:,:,2],T),axis=1)][:,:,:2]
 # Verify that no top triangles cover interior points of any slot.
 # Spatial lookup instead of testing every slot sample against every face.
 # A hit inside a triangle (not merely on its edge) would roof over a slot.
 rings=[Polygon(p) for p in spec['rings']]
 triangle_tree=STRtree([Polygon(t) for t in top])
 samples=[]
 for hole in rings:
  pt=hole.representative_point();samples.append(Point(pt.x,H-pt.y))
 if samples:
  hits=triangle_tree.query(samples,predicate='within')
  assert hits.shape[1]==0,f'{name}: slot roof/floor found'
 holes=unary_union(rings)
 assert holes.is_valid,name
 # Material-area agreement is independent of the sweep decomposition.
 expected=(W*H-holes.area)*T
 assert abs(mesh.volume-expected)<.05,name
 seam_errors={}
 for axis,length,other in [('x',W,H),('y',H,W)]:
  # Normalize opposite boundary traces onto the same axis, then compare.
  if axis=='x':lines=[LineString([(v,0),(v,H)]) for v in [0,W]]
  else:lines=[LineString([(0,v),(W,v)]) for v in [0,H]]
  from shapely.affinity import translate
  aa=holes.intersection(lines[0]);bb=holes.intersection(lines[1]);bb=translate(bb,xoff=-W if axis=='x' else 0,yoff=-H if axis=='y' else 0)
  error=aa.symmetric_difference(bb).length
  assert error<.003,(name,axis,error)
  seam_errors[axis]=error
 report.append({'file':name,'watertight':True,'connectedComponents':1,'volume_mm3':float(mesh.volume),'dimensions_mm':list(mesh.extents),'noSlotRoofs':True,'seamTraceDifference_mm':seam_errors})
 (OUT/'independent-stl-validation.json').write_text(json.dumps(report,indent=2))
 print(name,'PASS',len(mesh.faces),'faces',flush=True)
(OUT/'independent-stl-validation.json').write_text(json.dumps(report,indent=2))
