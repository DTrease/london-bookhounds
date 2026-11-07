"""Shrink a binary STL into a compact indexed mesh for the book's viewer (pure Python, no packages).

usage: python stl2mesh.py in.stl out.json [cells [top_fraction top_cells]]
  cells = how many grid cells along the longest side (more = finer, bigger). Vertices that fall in one cell are merged.
  top_fraction, top_cells = optional: above this fraction of the height (0 to 1, e.g. 0.76 for a head) use this finer grid instead,
  so a face keeps its detail while the body stays light. A vertex is always merged by its own position, so the surface stays closed.
The mesh is centred, scaled so its longest side is 2, and stored as 16-bit integers (base64).
"""
import base64, json, struct, sys, array

src, dst = sys.argv[1], sys.argv[2]
cells = int(sys.argv[3]) if len(sys.argv) > 3 else 110
top_frac = float(sys.argv[4]) if len(sys.argv) > 4 else None
top_cells = int(sys.argv[5]) if len(sys.argv) > 5 else cells

data = open(src, 'rb').read()
n = struct.unpack_from('<I', data, 80)[0]
assert len(data) == 84 + 50 * n, 'not a binary STL'
tris = []
for i in range(n):
    o = 84 + 50 * i + 12
    tris.append(struct.unpack_from('<9f', data, o))

xs = [t[k] for t in tris for k in (0, 3, 6)]
ys = [t[k] for t in tris for k in (1, 4, 7)]
zs = [t[k] for t in tris for k in (2, 5, 8)]
lo = (min(xs), min(ys), min(zs)); hi = (max(xs), max(ys), max(zs))
size = [hi[i] - lo[i] for i in range(3)]
print('triangles', n, 'bbox min', [round(v, 3) for v in lo], 'max', [round(v, 3) for v in hi], 'size', [round(v, 3) for v in size])
longest = max(size)
cell = longest / cells
cell_top = longest / top_cells
z_split = lo[2] + (top_frac if top_frac is not None else 2.0) * size[2]

# vertex clustering: merge every vertex that lands in the same grid cell, at the mean of those vertices
clusters = {}      # cell -> [sx, sy, sz, count]
tri_cells = []
for t in tris:
    keys = []
    for k in (0, 3, 6):
        x, y, z = t[k], t[k + 1], t[k + 2]
        c_ = cell_top if z >= z_split else cell
        key = (c_, int((x - lo[0]) / c_), int((y - lo[1]) / c_), int((z - lo[2]) / c_))
        c = clusters.get(key)
        if c is None:
            clusters[key] = [x, y, z, 1]
        else:
            c[0] += x; c[1] += y; c[2] += z; c[3] += 1
        keys.append(key)
    if keys[0] != keys[1] and keys[1] != keys[2] and keys[0] != keys[2]:
        tri_cells.append(keys)

index = {}
verts = []
for key, c in clusters.items():
    index[key] = len(verts)
    verts.append((c[0] / c[3], c[1] / c[3], c[2] / c[3]))

# drop duplicate faces (two triangles that collapse onto the same three vertices)
seen = set(); faces = []
for a, b, c in tri_cells:
    f = (index[a], index[b], index[c])
    k = tuple(sorted(f))
    if k in seen:
        continue
    seen.add(k); faces.append(f)

# keep only vertices that are used, and renumber
used = sorted({v for f in faces for v in f})
remap = {v: i for i, v in enumerate(used)}
verts = [verts[v] for v in used]
faces = [(remap[a], remap[b], remap[c]) for a, b, c in faces]
assert len(verts) < 65536, 'too many vertices for 16-bit indices; use fewer cells'

# centre on the middle of the box, scale the longest side to 2
mid = [(lo[i] + hi[i]) / 2 for i in range(3)]
scale = 2.0 / longest
pos = array.array('h')
for v in verts:
    for i in range(3):
        pos.append(max(-32767, min(32767, round((v[i] - mid[i]) * scale * 32767))))
idx = array.array('H')
for f in faces:
    idx.extend(f)
if sys.byteorder == 'big':
    pos.byteswap(); idx.byteswap()
out = {
    'v': base64.b64encode(pos.tobytes()).decode('ascii'),
    'i': base64.b64encode(idx.tobytes()).decode('ascii'),
    'size': [round(s * scale, 4) for s in size],   # half-extents are size/2; the mesh spans these along x, y, z as exported
}
json.dump(out, open(dst, 'w'))
print('cells', cells, '-> vertices', len(verts), 'triangles', len(faces), 'json chars', len(out['v']) + len(out['i']))
