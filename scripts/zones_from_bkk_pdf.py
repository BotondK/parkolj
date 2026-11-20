import json, math, sys
import numpy as np, pymupdf
from shapely.geometry import Polygon, Point, LineString, MultiPolygon
from shapely.ops import unary_union
from scipy.spatial import cKDTree
from scipy.optimize import minimize
# Használat: python scripts/zones_from_bkk_pdf.py <parkolasi_rend_khatarokkal_2607.pdf> <districts.json> <kimenet.json>
#   districts.json: a src/data/districts.ts tömbje JSON-ként; kell: pip install pymupdf shapely numpy scipy
# A BKK zónatérkép (CorelDRAW-ból exportált vektoros PDF) kitöltött zónasokszögeit kinyeri, majd a rajta lévő
# kerülethatár-vonalakat az OSM kerülethatárokra illeszti (affin transzformáció Web Mercatorban, ICP),
# és az OSM utcaszintű zónajelöléseivel ellenőrzi.
PDF, DISTRICTS, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
pg = pymupdf.open(PDF)[0]
ZC = {(80,69,156):'B',(242,110,131):'C',(240,110,132):'C',(241,91,34):'A',(219,225,57):'D'}

def bez(p0,p1,p2,p3,n=8):
    return [((1-t)**3*p0.x+3*(1-t)**2*t*p1.x+3*(1-t)*t*t*p2.x+t**3*p3.x,(1-t)**3*p0.y+3*(1-t)**2*t*p1.y+3*(1-t)*t*t*p2.y+t**3*p3.y) for t in [i/n for i in range(1,n+1)]]

def subpaths(d):
    subs=[]; cur=[]
    for it in d['items']:
        op=it[0]
        if op=='l':
            a,b=it[1],it[2]
            if cur and (abs(cur[-1][0]-a.x)>1e-3 or abs(cur[-1][1]-a.y)>1e-3): subs.append(cur); cur=[]
            if not cur: cur=[(a.x,a.y)]
            cur.append((b.x,b.y))
        elif op=='c':
            a=it[1]
            if cur and (abs(cur[-1][0]-a.x)>1e-3 or abs(cur[-1][1]-a.y)>1e-3): subs.append(cur); cur=[]
            if not cur: cur=[(a.x,a.y)]
            cur+=bez(*it[1:5])
        elif op=='re':
            r=it[1]; subs.append([(r.x0,r.y0),(r.x1,r.y0),(r.x1,r.y1),(r.x0,r.y1)])
    if cur: subs.append(cur)
    return subs

zones={'A':[], 'B':[], 'C':[], 'D':[]}
borders=[]
for d in pg.get_drawings():
    f=d.get('fill'); c=d.get('color')
    if f:
        k=tuple(round(x*255) for x in f)
        if k in ZC and len(d['items'])>1:
            geom=None
            for sp in subpaths(d):
                if len(sp)<3: continue
                p=Polygon(sp).buffer(0)
                geom = p if geom is None else geom.symmetric_difference(p)   # even-odd
            if geom is not None: zones[ZC[k]].append(geom)
    if c and tuple(round(x*255) for x in c)==(236,0,140):
        for sp in subpaths(d):
            if len(sp)>1: borders.append(sp)
zones={k:unary_union(v) for k,v in zones.items()}
for k,v in zones.items(): print(k, v.geom_type, round(v.area))
print('border polylines', len(borders))

# --- Web Mercator ---
R=6378137.0
def merc(lat,lng): return (math.radians(lng)*R, math.log(math.tan(math.pi/4+math.radians(lat)/2))*R)
def unmerc(x,y): return (math.degrees(2*math.atan(math.exp(y/R))-math.pi/2), math.degrees(x/R))

# Kezdő illesztés: városrész-feliratok helye a PDF-en (a szöveg görbékké alakítva, ezért kézzel olvasva, 40 dpi-s képen)
# és a városrészek közelítő középpontja; a pontos illesztést az ICP végzi.
LAB={'VÁROSLIGET':(47.5145,19.0815),'ANGYALFÖLD':(47.537,19.072),'KELENFÖLD':(47.463,19.027),'ALBERTFALVA':(47.441,19.035),'NÉPLIGET':(47.476,19.103),'ÓBUDA':(47.548,19.034),'TÖRÖKŐR':(47.519,19.112),'GELLÉRTHEGY':(47.487,19.045),'KISPEST':(47.453,19.141),'ÚJPEST':(47.567,19.085)}
PX={'VÁROSLIGET':(590,418),'ANGYALFÖLD':(505,468),'KELENFÖLD':(287,1081),'ALBERTFALVA':(306,1281),'NÉPLIGET':(677,995),'ÓBUDA':(259,473),'TÖRÖKŐR':(720,731),'GELLÉRTHEGY':(316,927),'KISPEST':(882,1160),'ÚJPEST':(666,204)}
src=[(x/0.55556,y/0.55556,t) for t,(x,y) in PX.items()]; dst=[merc(*LAB[t]) for t in PX]
print('labels', [s_[2] for s_ in src])
def fit(P,Q):
    A=np.c_[P,np.ones(len(P))]; X,_,_,_=np.linalg.lstsq(A,Q,rcond=None); return X
X=fit(np.array([s_[:2] for s_ in src]),np.array(dst))
def apply(X,P): return np.c_[P,np.ones(len(P))]@X

# ICP on district borders
dist=json.load(open(DISTRICTS))
osm=[]
for d in dist:
    for r in d['rings']:
        for i in range(len(r)):
            a=merc(*r[i]); b=merc(*r[(i+1)%len(r)])
            n=max(1,int(math.hypot(b[0]-a[0],b[1]-a[1])/10))
            for j in range(n): osm.append((a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n))
osm=np.array(osm); tree=cKDTree(osm)
bp=[]
for sp in borders:
    for i in range(len(sp)-1):
        a,b=sp[i],sp[i+1]; n=max(1,int(math.hypot(b[0]-a[0],b[1]-a[1])/2))
        for j in range(n): bp.append((a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n))
bp=np.array(bp)
for it in range(40):
    T=apply(X,bp); dd,ii=tree.query(T)
    thr=max(30, np.percentile(dd,80))
    m=dd<thr
    X=fit(bp[m],osm[ii[m]])
T=apply(X,bp); dd,_=tree.query(T)
print('ICP border residual median %.1f m, p90 %.1f m'%(np.median(dd),np.percentile(dd,90)))
sc=np.linalg.norm(X[0]), np.linalg.norm(X[1]); print('scale m/pt', sc)

# validate with OSM zone streets
zs=json.load(open('public/data/zone-streets.json'))['items']
def to_ll(geom):
    def tr(coords):
        P=np.array(coords); Q=apply(X,P); return [unmerc(x,y) for x,y in Q]
    polys=[geom] if geom.geom_type=='Polygon' else list(geom.geoms)
    out=[]
    for p in polys:
        if p.area<50: continue
        out.append([tr(p.exterior.coords)]+[tr(h.coords) for h in p.interiors])
    return out
zll={k:to_ll(v) for k,v in zones.items()}
from shapely.geometry import Polygon as P2
zshape={k:unary_union([P2([(b,a) for a,b in poly[0]],[[(b,a) for a,b in h] for h in poly[1:]]) for poly in v]) for k,v in zll.items()}
ok=tot=0; wrong={}; outside=0
for s_ in zs:
    c=s_['c'][len(s_['c'])//2]; pt=Point(c[0],c[1])
    hit=[k for k,g in zshape.items() if g.contains(pt)]
    tot+=1
    if s_['z'] in hit: ok+=1
    elif not hit: outside+=1
    else: wrong[(s_['z'],hit[0])]=wrong.get((s_['z'],hit[0]),0)+1
print('OSM street agreement %d/%d = %.1f%%, outside any zone %d, mismatches %s'%(ok,tot,100*ok/tot,outside,wrong))

# simplified output (~3 m tolerance) for the app
out={}
nv=0
for k,v in zones.items():
    g=v.simplify(0.3, preserve_topology=True)
    ll=to_ll(g)
    out[k]=[[[[round(a,5),round(b,5)] for a,b in ring] for ring in poly] for poly in ll]
    nv+=sum(len(r) for poly in ll for r in poly)
json.dump(out, open(OUT,'w'), separators=(',',':'))
print('vertices', nv, 'polys', {k:len(v) for k,v in out.items()})
