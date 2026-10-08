"""Independent Shapely/trimesh checks, including rounded outer boundaries/unions."""
from pathlib import Path
import json,numpy as np,trimesh
from shapely.geometry import Polygon,Point
from shapely.ops import unary_union
from shapely.strtree import STRtree
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results/layout';report=[]
for file in sorted(OUT.glob('*.json')):
    if file.name=='summary.json' or file.name=='independent.json':continue
    spec=json.loads(file.read_text());mesh=trimesh.load(file.with_suffix('.stl'),force='mesh',process=True)
    assert mesh.is_volume and mesh.is_watertight and mesh.is_winding_consistent,file.name
    assert len(mesh.split(only_watertight=False))==1,file.name
    W,H,T=spec['W'],spec['H'],spec['thickness']
    assert np.allclose(mesh.bounds,[[0,0,0],[W,H,T]],atol=1e-4),file.name
    outer=Polygon(spec['outer']);cut=unary_union([Polygon(p) for p in spec['holes']]);material=outer.difference(cut)
    assert abs(mesh.volume-material.area*T)<.015,(file.name,mesh.volume,material.area*T)
    top=mesh.triangles[np.all(np.isclose(mesh.triangles[:,:,2],T),axis=1)][:,:,:2]
    tree=STRtree([Polygon(t) for t in top]);samples=[]
    for ring in spec['holes']:
        p=Polygon(ring).representative_point();samples.append(Point(p.x,H-p.y))
    assert tree.query(samples,predicate='within').shape[1]==0,file.name
    assert len(np.unique(mesh.vertices[:,2]))==2,file.name
    report.append({'case':file.stem,'closed':True,'connected':True,'throughHoles':True,'independentVolumeError':abs(mesh.volume-material.area*T),'triangles':len(mesh.faces)})
    print(file.stem,'PASS',flush=True)
(OUT/'independent.json').write_text(json.dumps(report,indent=2))
