"""Independent checks with trimesh + Shapely, not the browser's mesh code."""
from pathlib import Path
import json,numpy as np,trimesh
from shapely.geometry import Polygon,LineString
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results'
report=[]
for geometry in sorted(OUT.glob('*-geometry.json')):
 spec=json.loads(geometry.read_text());name=geometry.name.replace('-geometry.json','');mesh=trimesh.load(OUT/(name+'.stl'),force='mesh',process=True)
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
 A,B,C=top[:,0],top[:,1],top[:,2]
 cross=lambda a,b:a[:,0]*b[:,1]-a[:,1]*b[:,0]
 denom=cross(B-A,C-A)
 rings=[Polygon(p) for p in spec['rings']]
 for hole in rings:
  pt=hole.representative_point();q=np.array([pt.x,H-pt.y]);ab=cross(B-A,q-A);bc=cross(C-B,q-B);ca=cross(A-C,q-C)
  covers=((ab>1e-8)&(bc>1e-8)&(ca>1e-8))|((ab<-1e-8)&(bc<-1e-8)&(ca<-1e-8))
  assert not covers.any(),f'{name}: slot roof/floor found'
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
 print(name,'PASS',len(mesh.faces),'faces',flush=True)
(OUT/'independent-stl-validation.json').write_text(json.dumps(report,indent=2))
