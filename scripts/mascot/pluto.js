// Pluto, ReadFluent's mascot: a little space reader.
// A big pale-cyan helmet with a glossy navy visor (glowing cyan eyes and smile, a cyan bezel glow), chunky
// deep-cyan ear pods, one short deep-cyan antenna tipped with a glowing star. A two-tone cyan suit
// (bright #22D3EE on one side, deep teal on the other: the language you speak and the one you are learning),
// short chunky arms in the tone of the half they grow from, white mittens and round boots, an open-book badge.
// World units: x,y in [-3, 3] fill the 720x720 frame (orthographic camera, straight on).

// ---------- tuning (overridable with ?key=value on the module url, for quick variants) ----------
let Q = null;
try { Q = new URLSearchParams(new URL(import.meta.url).search); } catch { Q = new URLSearchParams(); }
const num = (k, d) => (Q.has(k) ? +Q.get(k) : d);
const flag = (k, d) => (Q.has(k) ? Q.get(k) : d);

// ---------- palette ----------
const COL = {
  shell: 0xe6f8fc,
  bright: 0x22d3ee,
  deep: num("deep", 0x0b86a8),
  cup: num("cupC", 0x1199bb),
  ink: 0x0e7490,
  navy: 0x0b1b22,
  glove: 0xf2fafc,
  page: num("pageC", 0xfff1d6),
  cover: 0x0e7490,
};
const GLOW_CORE = "#F2FEFF";
const GLOW_HALO = "rgba(34,211,238,1)";
// one eye colour for every pose (the face's features: eyes, lids, mouth), with white catchlights on open eyes
const EYE_FILL = flag("eyeC", "#A9F4FF");
// which side of the suit is bright (screen right) and which is deep (screen left); arms and legs match their half
const SIDE_TONE = { l: "deep", r: "bright" };

// ---------- head and visor shape (head-local units, head centre at origin) ----------
const HEAD = { rx: num("hrx", 1.345), ry: 1.08, rz: 1.13, p: 2.35, taper: 0.05 };
const VIS = { cx: 0, cy: -0.08, ax: num("vax", 1.055), ay: 0.81, q: 2.75, lift: 0.025, bulge: 0.08 };
const NECK_Y = -0.42; // figure coords
const HEAD_UP = num("headUp", 0.935); // head centre above the neck pivot
const HEAD_SCALE = num("hs", 1.0);
const S_R = [0.7, -0.86, 0.04];
const S_L = [-0.7, -0.86, 0.04];
// full-figure arms have no shoulder ball: each is one smooth tapered capsule whose rounded end is sunk inside the
// torso's shoulder, so the shoulder line flows straight into the arm (no hump, no kink)
const SI_R = [num("six", 0.54), num("siy", -0.9), num("siz", 0.06)];
const SI_L = [-SI_R[0], SI_R[1], SI_R[2]];

// ---------- poses ----------
// root: rotation about the feet (yaw y, lean x forward-to-camera, lean z), lift: bounce, squash: [sx, sy]
// head: rotation about the neck (x nod down, z tilt, y extra yaw)
// arms: s shoulder, e elbow, w wrist (figure coords), hand kind, layer (separate asset)
// The arm layers (hello-arm, cheer-arm-l/-r) start in a round shoulder ball that tapers smoothly into the arm (it
// hides the seam while the app rotates them). Raised arms are as short and chunky as the hanging ones (about 1.1
// units, shoulder to wrist): the hands end level with the ear pods, in front of them.
// the raised arms' shoulder: on the shoulder line just under the helmet rim (mirrors the hanging arm's shoulder)
const SR_UP = [num("rsx", 0.64), num("rsy", -0.69), 0.06];
const POSES = {
  hello: {
    root: { y: -0.22, x: 0, z: 0 }, shift: num("hshift", -0.04), head: { x: 0.02, y: 0, z: -0.05 },
    face: { eyes: "pill", mouth: "smile" },
    arms: {
      l: { s: SI_L, e: [num("hlex", -0.86), num("hley", -1.26), 0.22], w: [num("hlwx", -1.04), num("hlwy", -1.62), 0.3], hand: "mitt" },
      r: { s: SR_UP, e: [num("ex", 1.16), num("ey", -0.56), 0.18], w: [num("wx", 1.33), num("wy", -0.05), 0.28], hand: "open", layer: "hello-arm", splay: num("hsplay", -0.22) },
    },
  },
  reading: {
    root: { y: -0.12, x: 0, z: 0 }, shift: num("rdshift", 0.11), head: { x: num("nod", 0.38), y: 0, z: num("rtilt", 0.07) },
    face: { eyes: "down", mouth: "content" },
    book: true,
  },
  cheer: {
    root: { y: -0.16, x: -0.03, z: 0.0 }, lift: 0.06, squash: [1.02, 0.975], head: { x: -0.08, y: 0, z: 0.03 },
    face: { eyes: "happy", mouth: "big" },
    legs: { l: { x: num("klx", 0.45), z: num("klz", -0.42) } }, // one foot kicked back and out: a happy hop
    arms: {
      l: { s: [-SR_UP[0], SR_UP[1], SR_UP[2]], e: [-num("cex", 1.2), num("cey", -0.5), 0.16], w: [-num("cwx", 1.4), num("cwy", 0.04), 0.22], hand: "open", layer: "cheer-arm-l", splay: num("csplay", -0.35) },
      r: { s: SR_UP, e: [num("cex", 1.2), num("cey", -0.5), 0.16], w: [num("cwx", 1.4), num("cwy", 0.04), 0.22], hand: "open", layer: "cheer-arm-r", splay: num("csplay", -0.35) },
    },
  },
  sleepy: {
    // slumped: leaning a little forward and over, shoulders dropped, head heavy on one side, hands clasped on the tummy
    root: { y: -0.1, x: num("sdroop", 0.1), z: num("srz", 0.05) }, shift: num("sshift", 0.03), head: { x: num("snod", 0.14), y: 0, z: num("stilt", -0.2) },
    face: { eyes: "sleep", mouth: "o", dim: 0.6 },
    arms: {
      // forearms across the front, the two mittens meeting (one over the other) on the belly, half in the cuffs
      l: { s: [-0.54, -1.0, 0.12], e: [-0.9, -1.42, 0.46], w: [num("swx", -0.3), num("swy", -1.62), num("swz", 0.78)], hand: "clasp" },
      r: { s: [0.54, -1.0, 0.12], e: [0.9, -1.42, 0.46], w: [num("srwx", 0.15), num("srwy", -1.55), num("srwz", 0.86)], hand: "clasp" },
    },
  },
  ready: {
    // eager: tipped forward and toward the thumbs-up
    root: { y: -0.26, x: num("lean", 0.12), z: num("rrz", -0.06) }, shift: num("rshift", -0.145), head: { x: num("rnod", 0.06), y: 0, z: num("rhz", -0.1) },
    face: { eyes: "wide", mouth: "grin" },
    legs: { l: { x: num("rlegs", -0.12), z: num("rlz", 0.06) }, r: { x: num("rlegs", -0.12), z: num("rlz", 0.06) } }, // soles flat on the floor under the lean
    arms: {
      l: { s: SI_L, e: [-0.9, -1.26, 0.3], w: [-1.0, -1.58, 0.44], hand: "fist" },
      r: { s: SI_R, e: [num("tex", 1.22), num("tey", -1.1), 0.34], w: [num("twx", 1.36), num("twy", -0.62), 0.6], hand: "thumb" },
    },
  },
};

function poseFor(name) {
  const base = name.split("-")[0];
  const pose = JSON.parse(JSON.stringify(POSES[base]));
  if (name.endsWith("-blink")) { pose.face.open = pose.face.eyes; pose.face.eyes = base === "reading" ? "readBlink" : "blink"; }
  if (name.endsWith("-talk")) pose.face.mouth = base === "ready" ? "talkBig" : "talk";
  return pose;
}

// ---------- materials ----------
let MATS = null;
// A cool rim (fresnel) and a darker underside so pale parts keep their silhouette on white.
function rimify(mat, key, tint, amt, under) {
  mat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace("#include <opaque_fragment>", `
      {
        float fr = 1.0 - clamp(abs(normal.z), 0.0, 1.0);
        float k = smoothstep(0.25, 1.0, fr) * ${amt.toFixed(3)} + smoothstep(0.1, -0.9, normal.y) * ${under.toFixed(3)};
        outgoingLight = mix(outgoingLight, outgoingLight * vec3(${tint.map((v) => v.toFixed(3)).join(",")}), clamp(k, 0.0, 1.0));
      }
      #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => "rim-" + key;
  return mat;
}
// Soft occlusion, all faked in the shaders (the key light's hard cast shadows are kept off these joins):
//  - under the helmet: the suit darkens toward the collar (figure-space y), so the head sits in its own soft shadow;
//  - "torso": the suit darkens softly round each arm (capsules in world space, set per asset in CAPS), so an arm
//    pressing on the body leaves a soft contact shadow, and a raised arm's shoulder ball sits in a faint halo;
//  - "arm": an arm darkens where it meets or nears the torso (the torso's lathe profile, figure space), so the
//    join reads as soft occlusion instead of a hard intersection line.
const CAP_MAX = 8;
let CAPS = null;
function capsUniforms(THREE) {
  if (!CAPS) CAPS = { uCapA: { value: Array.from({ length: CAP_MAX }, () => new THREE.Vector4()) }, uCapB: { value: Array.from({ length: CAP_MAX }, () => new THREE.Vector4()) }, uCapN: { value: 0 } };
  return CAPS;
}
const PROF = [[0, -2.02], [0.5, -2.0], [0.77, -1.9], [0.87, -1.7], [0.88, -1.45], [0.83, -1.12], [0.7, -0.78], [0.5, -0.52], [0.24, -0.4], [0, -0.38]];
function torsoGLSL() {
  const pts = PROF.slice(1, -1); // ascending y
  let code = "float torsoR(float y) {\n  if (y <= " + pts[0][1].toFixed(3) + ") return " + pts[0][0].toFixed(3) + ";\n";
  for (let i = 0; i < pts.length - 1; i++) {
    const [r0, y0] = pts[i], [r1, y1] = pts[i + 1];
    code += `  if (y <= ${y1.toFixed(3)}) return mix(${r0.toFixed(3)}, ${r1.toFixed(3)}, (y - (${y0.toFixed(3)})) / ${(y1 - y0).toFixed(3)});\n`;
  }
  return code + "  return 0.0;\n}\n";
}
function aoify(mat, key, kind = "torso") {
  const m = mat.clone();
  const LO = num("aoLo", -1.2).toFixed(3), HI = num("aoHi", -0.45).toFixed(3), K = num("aoK", 0.6).toFixed(3);
  const CK = num("capK", 0.42).toFixed(3), CW = num("capW", 0.2).toFixed(3), TK = num(kind === "layer" ? "lK" : "tK", kind === "layer" ? 0.22 : 0.42).toFixed(3), TW = num("tW", 0.16).toFixed(3);
  m.onBeforeCompile = (sh) => {
    if (kind === "torso") Object.assign(sh.uniforms, CAPS);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vFigPos;\nvarying vec3 vWPos;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvFigPos = position;\nvWPos = (modelMatrix * vec4(position, 1.0)).xyz;");
    const decl = kind === "torso"
      ? `uniform vec4 uCapA[${CAP_MAX}];\nuniform vec4 uCapB[${CAP_MAX}];\nuniform int uCapN;\nfloat sdCap(vec3 p, vec4 a, vec4 b) { vec3 pa = p - a.xyz, ba = b.xyz - a.xyz; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0); return length(pa - ba * h) - mix(a.w, b.w, h); }\n`
      : torsoGLSL();
    const body = kind === "torso"
      ? `float occ = 0.0;
        for (int i = 0; i < ${CAP_MAX}; i++) { if (i >= uCapN) break; float d = sdCap(vWPos, uCapA[i], uCapB[i]); occ = max(occ, 1.0 - smoothstep(0.0, ${CW}, d)); }
        outgoingLight *= 1.0 - ${CK} * occ * occ;`
      : `float dT = (vFigPos.y > -2.0 && vFigPos.y < -0.39) ? length(vec2(vFigPos.x, vFigPos.z / 0.8)) - torsoR(vFigPos.y) : 1.0;
        float occ = 1.0 - smoothstep(-0.02, ${TW}, dT);
        outgoingLight *= 1.0 - ${TK} * occ * occ;`;
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vFigPos;\nvarying vec3 vWPos;\n" + decl).replace("#include <opaque_fragment>", `
      {
        float ao = smoothstep(${LO}, ${HI}, vFigPos.y);
        ao = ao * ao * (1.0 + 0.6 * smoothstep(0.1, 0.7, normal.y));
        ${kind === "layer" ? "" : `outgoingLight *= 1.0 - ${K} * clamp(ao, 0.0, 1.0);`}
        ${body}
      }
      #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => "ao-" + kind + "-" + key;
  return m;
}
function mats(THREE) {
  if (MATS) return MATS;
  capsUniforms(THREE);
  const vinyl = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.42, metalness: 0, clearcoat: 0.4, clearcoatRoughness: 0.3, sheen: 0.25, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xffffff), ...o });
  // the white parts' edges turn a clean cool cyan (not grey), so the shell stays white like ref 1 yet keeps its
  // silhouette on a white page
  const RIM = [num("rimR", 0.7), num("rimG", 0.9), num("rimB", 0.97)];
  MATS = {
    shell: rimify(vinyl(COL.shell, { roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.3, sheenColor: new THREE.Color(0xd8f6fb) }), "shell", RIM, num("rim", 0.75), num("under", 0.3)),
    glove: rimify(vinyl(COL.glove, { roughness: 0.4, clearcoat: 0.5, sheenColor: new THREE.Color(0xd8f6fb) }), "glove", RIM, num("rim", 0.75), num("under", 0.3)),
    // the ear pods: opaque satin cyan vinyl, like the suit (no gloss rings, no glow)
    cup: vinyl(num("cupC", 0x13b2d2), { roughness: 0.52, clearcoat: 0.12, clearcoatRoughness: 0.5, sheen: 0.15, sheenRoughness: 0.7, sheenColor: new THREE.Color(0x8eeaf8), envMapIntensity: 0.65 }),
    glow: new THREE.MeshPhysicalMaterial({ color: 0x67e8f9, emissive: 0x22d3ee, emissiveIntensity: 0.75, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 }),
    // the suit: satin vinyl (ref 2): rougher, a thin soft clearcoat, so no hard white stripes along the arms
    bright: vinyl(COL.bright, { roughness: num("bRough", 0.52), clearcoat: num("bCC", 0.12), clearcoatRoughness: 0.55, sheen: 0.35, sheenColor: new THREE.Color(0x9cf0fb), envMapIntensity: 0.75 }),
    deep: vinyl(COL.deep, { roughness: num("dRough", 0.56), clearcoat: num("dCC", 0.1), clearcoatRoughness: 0.6, sheen: 0.4, sheenColor: new THREE.Color(0x2fc6e0), envMapIntensity: 0.7, emissive: new THREE.Color(COL.deep), emissiveIntensity: num("deepE", 0.04) }),
    ink: vinyl(COL.ink, { roughness: 0.4, sheen: 0.3, sheenColor: new THREE.Color(0x22d3ee), clearcoat: 0.5 }),
    cover: vinyl(COL.cover, { roughness: 0.38, clearcoat: 0.6, sheen: 0.3, sheenColor: new THREE.Color(0x22d3ee), emissive: new THREE.Color(COL.cover), emissiveIntensity: 0.12 }),
    page: new THREE.MeshPhysicalMaterial({ color: COL.page, roughness: 0.75, sheen: 0.2 }),
    sole: vinyl(num("soleC", 0x1199bb), { roughness: 0.5, clearcoat: 0.2, sheen: 0.3, sheenColor: new THREE.Color(0x5fe0f5) }),
  };
  MATS.bead = rimify(vinyl(num("beadC", COL.shell), { roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.3, sheenColor: new THREE.Color(0xd8f6fb), vertexColors: true, transparent: true }), "bead", RIM, num("rim", 0.75), num("under", 0.3));
  // the reading grips: a touch cooler and deeper than the other mittens, so the thumbs hold against the cream pages
  MATS.gloveCool = rimify(vinyl(num("gcC", 0xd9f0f6), { roughness: 0.42, clearcoat: 0.45, sheenColor: new THREE.Color(0xc4eef7) }), "gloveCool", RIM, num("rim", 0.75), num("under", 0.3));
  MATS.brightAO = aoify(MATS.bright, "bright", "torso");
  MATS.deepAO = aoify(MATS.deep, "deep", "torso");
  MATS.brightArm = aoify(MATS.bright, "bright", "arm");
  MATS.deepArm = aoify(MATS.deep, "deep", "arm");
  MATS.brightLayer = aoify(MATS.bright, "bright", "layer");
  MATS.deepLayer = aoify(MATS.deep, "deep", "layer");
  return MATS;
}
const tone = (M, t) => (t === "deep" ? M.deep : M.bright);
const toneAO = (M, t) => (t === "deep" ? M.deepAO : M.brightAO);
const toneArm = (M, t, layer) => (layer ? (t === "deep" ? M.deepLayer : M.brightLayer) : t === "deep" ? M.deepArm : M.brightArm);

function mesh(THREE, geo, mat) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// ---------- geometry helpers ----------
// a unit sphere with its seam welded (no pinholes for the body behind to show through as specks on the mitts)
let UNIT_SPHERE = null;
function unitSphere(THREE) {
  if (UNIT_SPHERE) return UNIT_SPHERE.clone();
  const g = new THREE.SphereGeometry(1, 48, 32);
  g.deleteAttribute("normal"); g.deleteAttribute("uv");
  const m = BGU_REF.mergeVertices(g, 1e-5);
  const pos = m.attributes.position;
  for (let i = 0; i < pos.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(pos, i).normalize(); pos.setXYZ(i, v.x, v.y, v.z); }
  m.setAttribute("normal", pos.clone());
  UNIT_SPHERE = m;
  return m.clone();
}
let BGU_REF = null;
function headZ(x, y) {
  const k = 1 + HEAD.taper * (y / HEAD.ry);
  const xu = x / k;
  const s = 1 - Math.pow(Math.abs(xu / HEAD.rx), HEAD.p) - Math.pow(Math.abs(y / HEAD.ry), HEAD.p);
  return s <= 0 ? 0 : HEAD.rz * Math.pow(s, 1 / HEAD.p);
}

function superEllipsoid(THREE, BGU, rx, ry, rz, p, ws, hs, taper = 0) {
  const g = new THREE.SphereGeometry(1, ws, hs);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const dx = pos.getX(i), dy = pos.getY(i), dz = pos.getZ(i);
    const t = Math.pow(Math.pow(Math.abs(dx), p) + Math.pow(Math.abs(dy), p) + Math.pow(Math.abs(dz), p), -1 / p);
    const y = dy * t * ry;
    const k = 1 + taper * (y / ry);
    pos.setXYZ(i, dx * t * rx * k, y, dz * t * rz);
  }
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  const m = BGU.mergeVertices(g, 1e-6);
  m.computeVertexNormals();
  // exact normals from the implicit surface (so parts laid on it, like the visor bead, shade seamlessly into it)
  const F = (x, y, z) => { const k = 1 + taper * (y / ry); return Math.pow(Math.abs(x / (k * rx)), p) + Math.pow(Math.abs(y / ry), p) + Math.pow(Math.abs(z / rz), p); };
  const mp = m.attributes.position, mn = m.attributes.normal, e = 1e-4;
  for (let i = 0; i < mp.count; i++) {
    const x = mp.getX(i), y = mp.getY(i), z = mp.getZ(i);
    let gx = F(x + e, y, z) - F(x - e, y, z), gy = F(x, y + e, z) - F(x, y - e, z), gz = F(x, y, z + e) - F(x, y, z - e);
    const l = Math.hypot(gx, gy, gz);
    if (l > 1e-9) mn.setXYZ(i, gx / l, gy / l, gz / l);
  }
  return m;
}

// A smooth variable-radius tube with round caps through a few points (arms, antenna stalk).
function sausage(THREE, pts, rad, o = {}) {
  const R = typeof rad === "number" ? () => rad : rad;
  let curve = o.curve;
  if (!curve) {
    const vs = pts.map((p) => (p.isVector3 ? p : new THREE.Vector3(...p)));
    curve = vs.length === 2 ? new THREE.LineCurve3(vs[0], vs[1]) : new THREE.CatmullRomCurve3(vs, false, "centripetal", 0.5);
  }
  const N = o.seg ?? 40, M = o.radial ?? 32, K = o.cap ?? 10;
  const fr = curve.computeFrenetFrames(N, false);
  const rings = [];
  const r0 = R(0), r1 = R(1);
  const P0 = curve.getPointAt(0), T0 = fr.tangents[0];
  if (!o.open0) for (let k = 0; k < K; k++) { const a = (k / K) * Math.PI / 2; rings.push({ c: P0.clone().addScaledVector(T0, -r0 * Math.cos(a)), r: r0 * Math.sin(a), i: 0 }); }
  for (let i = 0; i <= N; i++) rings.push({ c: curve.getPointAt(i / N), r: R(i / N), i });
  const P1 = curve.getPointAt(1), T1 = fr.tangents[N];
  for (let k = K - 1; k >= 0; k--) { const a = (k / K) * Math.PI / 2; rings.push({ c: P1.clone().addScaledVector(T1, r1 * Math.cos(a)), r: r1 * Math.sin(a), i: N }); }
  const pos = [];
  for (const rg of rings) {
    const n = fr.normals[rg.i], b = fr.binormals[rg.i];
    for (let m = 0; m <= M; m++) {
      const t = (m / M) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
      pos.push(rg.c.x + (n.x * c + b.x * s) * rg.r, rg.c.y + (n.y * c + b.y * s) * rg.r, rg.c.z + (n.z * c + b.z * s) * rg.r);
    }
  }
  const idx = [];
  for (let j = 0; j < rings.length - 1; j++) for (let m = 0; m < M; m++) {
    const a = j * (M + 1) + m, b = a + 1, c = a + (M + 1), d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // weld the seam normals (first and last column of each ring share a position)
  const nor = g.attributes.normal;
  for (let j = 0; j < rings.length; j++) {
    const a = j * (M + 1), b = a + M;
    const nx = (nor.getX(a) + nor.getX(b)) / 2, ny = (nor.getY(a) + nor.getY(b)) / 2, nz = (nor.getZ(a) + nor.getZ(b)) / 2;
    const l = Math.hypot(nx, ny, nz) || 1;
    nor.setXYZ(a, nx / l, ny / l, nz / l); nor.setXYZ(b, nx / l, ny / l, nz / l);
  }
  // make sure the normals point outward
  const mid = Math.floor(rings.length / 2) * (M + 1);
  const p = new THREE.Vector3().fromBufferAttribute(g.attributes.position, mid).sub(rings[Math.floor(rings.length / 2)].c);
  const nn = new THREE.Vector3().fromBufferAttribute(nor, mid);
  if (p.dot(nn) < 0) { g.setIndex(idx.map((v, k) => idx[k - (k % 3) + [0, 2, 1][k % 3]])); g.computeVertexNormals(); }
  return { geo: g, curve };
}

function visorBoundary(th) {
  const c = Math.cos(th), s = Math.sin(th);
  return [VIS.ax * Math.sign(c) * Math.pow(Math.abs(c), 2 / VIS.q), VIS.ay * Math.sign(s) * Math.pow(Math.abs(s), 2 / VIS.q)];
}

function visorGeometry(THREE) {
  const R = 36, S = 160;
  const pos = [], nor = [], uv = [], idx = [];
  const h = (x, y, rho) => headZ(x, y) + VIS.lift + VIS.bulge * (1 - rho * rho);
  const half = VIS.ax;
  const rr = (xx, yy) => Math.pow(Math.pow(Math.abs((xx - VIS.cx) / VIS.ax), VIS.q) + Math.pow(Math.abs((yy - VIS.cy) / VIS.ay), VIS.q), 1 / VIS.q);
  for (let i = 0; i <= R; i++) {
    const rho = i / R;
    for (let j = 0; j <= S; j++) {
      const th = (j / S) * Math.PI * 2;
      const [bx, by] = visorBoundary(th);
      const x = VIS.cx + bx * rho, y = VIS.cy + by * rho;
      const z = h(x, y, rho);
      const e = 0.002;
      const hx = (h(x + e, y, rr(x + e, y)) - h(x - e, y, rr(x - e, y))) / (2 * e);
      const hy = (h(x, y + e, rr(x, y + e)) - h(x, y - e, rr(x, y - e))) / (2 * e);
      const n = new THREE.Vector3(-hx, -hy, 1).normalize();
      pos.push(x, y, z);
      nor.push(n.x, n.y, n.z);
      uv.push((x - (VIS.cx - half)) / (2 * half), (y - (VIS.cy - half)) / (2 * half));
    }
  }
  for (let i = 0; i < R; i++) for (let j = 0; j < S; j++) {
    const a = i * (S + 1) + j, b = a + 1, c = a + (S + 1), d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

function headNormal(THREE, x, y) {
  const e = 0.002;
  const zx = (headZ(x + e, y) - headZ(x - e, y)) / (2 * e);
  const zy = (headZ(x, y + e) - headZ(x, y - e)) / (2 * e);
  return new THREE.Vector3(-zx, -zy, 1).normalize();
}
// A soft bead of shell around the visor whose edges sink tangentially into the helmet.
function visorRim(THREE) {
  const N = 200, M = 24, W = num("bw2", 0.16), H = num("bh", 0.05), SINK = num("sink", 0.003);
  const P = [];
  for (let j = 0; j < N; j++) {
    const [bx, by] = visorBoundary((j / N) * Math.PI * 2);
    const x = VIS.cx + bx, y = VIS.cy + by;
    P.push(new THREE.Vector3(x, y, headZ(x, y)));
  }
  const pos = [], blend = [], alpha = [];
  for (let j = 0; j < N; j++) {
    const T = P[(j + 1) % N].clone().sub(P[(j + N - 1) % N]).normalize();
    const n = headNormal(THREE, P[j].x, P[j].y);
    const B = new THREE.Vector3().crossVectors(T, n).normalize();
    for (let i = 0; i <= M; i++) {
      const t = -1 + (2 * i) / M;
      const qx = P[j].x + B.x * W * t, qy = P[j].y + B.y * W * t;
      const nq = headNormal(THREE, qx, qy);
      // asymmetric: a short steep inner side that drops into the glass, a long gentle outer side that melts into
      // the shell tangentially (no crease, so no grey seam line round the visor)
      const PK = num("bpk", 0.12), IN = num("bin", 0.42);
      const uu = t >= PK ? (t - PK) / (1 - PK) : (PK - t) / IN;
      const off = (uu >= 1 ? 0 : H * Math.pow(1 - uu * uu, 2)) - SINK;
      pos.push(qx + nq.x * off, qy + nq.y * off, headZ(qx, qy) + nq.z * off);
      // toward its outer edge the bead takes on the shell's own normal, so the shading runs on without a line
      const k = t >= PK ? Math.min(1, Math.max(0, (uu - num("nb0", 0)) / num("nbw", 0.5))) : 0;
      blend.push([nq, k * k * (3 - 2 * k)]);
      // and fades out over its last stretch, so its edge leaves no hairline where it meets the shell
      const fa = t >= PK ? Math.min(1, Math.max(0, (uu - num("fadeA", 0.62)) / (1 - num("fadeA", 0.62)))) : 0;
      alpha.push(1, 1, 1, 1 - fa * fa * (3 - 2 * fa));
    }
  }
  const idx = [];
  for (let j = 0; j < N; j++) {
    const j2 = (j + 1) % N;
    for (let i = 0; i < M; i++) {
      const a = j * (M + 1) + i, b = a + 1, c = j2 * (M + 1) + i, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(alpha, 4));
  g.setIndex(idx);
  g.computeVertexNormals();
  const nz = g.attributes.normal.getZ(Math.floor(M / 2));
  if (nz < 0) { g.setIndex(idx.map((v, k) => idx[k - (k % 3) + [0, 2, 1][k % 3]])); g.computeVertexNormals(); }
  const nor = g.attributes.normal, v = new THREE.Vector3();
  for (let i = 0; i < nor.count; i++) {
    const [nq, w] = blend[i];
    if (w <= 0) continue;
    v.fromBufferAttribute(nor, i).lerp(nq, w).normalize();
    nor.setXYZ(i, v.x, v.y, v.z);
  }
  return g;
}

// a clean studio reflection for the glossy visor: one big softbox top-left, a cool strip right
let VISOR_ENV = null;
function visorEnv(THREE, renderer) {
  if (VISOR_ENV) return VISOR_ENV;
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x03080b);
  const box = (w, h, color, k, pos, round = false, roll = 0) => {
    const geo = round ? new THREE.CircleGeometry(0.5, 48) : new THREE.PlaneGeometry(1, 1);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.scale.set(w, h, 1);
    m.position.set(...pos); m.lookAt(0, 0, 0); m.rotateZ(roll); s.add(m);
  };
  box(num("sbW", 9), num("sbH", 5.5), 0xffffff, num("sbK", 0), [num("sbX", -5), num("sbY", 6.5), num("sbZ", 7)], true, num("sbRoll", 0));
  box(14, 10, 0x9fdcea, num("panK", 0.14), [-2, 3, 10]);
  box(1.4, 10, 0xbff6ff, 0.7, [8, 0.5, 3]);
  const pm = new THREE.PMREMGenerator(renderer);
  VISOR_ENV = pm.fromScene(s, 0.035).texture;
  return VISOR_ENV;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
  ctx.lineTo(x + w, y + h - r);
  ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  ctx.lineTo(x + r, y + h);
  ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  ctx.lineTo(x, y + r);
  ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  ctx.closePath();
}

// The neutral tone mapper pulls every channel down by about the darkest channel (it crushes darks); this
// returns the emissive colour that comes out of it as `hex` (sRGB in, sRGB out).
function preTone(hex) {
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const srgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
  const n = parseInt(hex.slice(1), 16);
  const t = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => lin(v / 255));
  const a = Math.min(...t);
  const x = 0.4 * Math.sqrt(a); // the input whose darkest channel comes out as a
  const o = x - a;
  return "#" + t.map((v) => Math.round(Math.min(1, srgb(v + o)) * 255).toString(16).padStart(2, "0")).join("");
}

// ---------- face texture (visor-local units, y up) ----------
function faceTextures(THREE, face) {
  const W = 1024;
  const half = VIS.ax;
  const s = W / (2 * half);
  const mk = () => { const c = document.createElement("canvas"); c.width = c.height = W; return c; };
  const colorC = mk(), glowC = mk();
  const toLocal = (ctx) => ctx.setTransform(s, 0, 0, -s, W / 2 - VIS.cx * s, W / 2 + VIS.cy * s);

  const paths = [];
  const pill = (cx, cy, w, h, ang = 0) => paths.push({ type: "fill", build: (ctx) => { ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); roundRect(ctx, -w / 2, -h / 2, w, h, Math.min(w, h) / 2); ctx.restore(); } });
  const arc = (cx, cy, r, a0, a1, lw) => paths.push({ type: "stroke", lw, build: (ctx) => { ctx.beginPath(); const n = 40; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } } });
  // open mouth: a flat-ish upper lip that smiles a little, a round lower lip
  const dshape = (cx, top, w, d) => paths.push({ type: "fill", build: (ctx) => {
    ctx.beginPath(); const n = 40;
    for (let i = 0; i <= n; i++) { const t = -1 + (2 * i) / n; ctx.lineTo(cx + (w / 2) * t, top - d * 0.12 * (1 - t * t)); }
    for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI; ctx.lineTo(cx + (w / 2) * Math.cos(a), top - d * Math.sin(a)); }
    ctx.closePath();
  } });
  // a downcast eye from the pill vocabulary: a short pill whose upper lid has come down (a half-lidded D):
  // a gently curved lid with soft rounded corners on top, the pill's full round bottom below
  const downEye = (cx, top, w, h, rt, sag) => paths.push({ type: "fill", build: (ctx) => {
    const r = w / 2, x0 = cx - r, x1 = cx + r, bot = top - h;
    const lid = (x) => top - sag * (1 - Math.pow((x - cx) / r, 2)); // sag > 0 dips, < 0 arches
    ctx.beginPath();
    ctx.moveTo(x0, lid(x0 + rt) - rt);
    ctx.quadraticCurveTo(x0, lid(x0), x0 + rt, lid(x0 + rt));
    for (let i = 1; i <= 24; i++) { const x = x0 + rt + ((w - 2 * rt) * i) / 24; ctx.lineTo(x, lid(x)); }
    ctx.quadraticCurveTo(x1, lid(x1), x1, lid(x1 - rt) - rt);
    ctx.lineTo(x1, bot + r);
    ctx.arc(cx, bot + r, r, 0, -Math.PI, true);
    ctx.closePath();
  } });
  const ring = (cx, cy, rx, ry, lw) => paths.push({ type: "stroke", lw, build: (ctx) => { ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); } });

  const EX = 0.41, EY = 0.04, MY = -0.4;
  const PW = num("pw", 0.27), PH = num("ph", 0.54);
  // the open eyes of each pose (centre y, width, height): blinks close on the same centre line and width
  // ready's eyes: rounder and bigger than hello's, with bigger catchlights
  const WIDE = { y: EY + 0.02, w: num("ww", 0.35), h: num("wh", 0.6) };
  // reading: the same glowing pills as hello, about two thirds as tall and lower in the visor (looking down at the page)
  const DOWN = { w: PW, h: PH * num("dk", 0.68), y: EY + num("dy", -0.115) };
  const OPEN = { pill: { y: EY, w: PW, h: PH }, wide: WIDE, down: DOWN };
  // a closed lid: a shallow downward arc, its chord (with the round caps) as wide as the open eye, its
  // sag centred on the open eye's centre line
  const lid = (cx, cy, w, lw, sweep = 0.3) => {
    const half = Math.max(0.05, (w - lw) / 2); // w is the whole width, round caps included
    const r = half / Math.sin(sweep * Math.PI);
    const sag = r - r * Math.cos(sweep * Math.PI);
    arc(cx, cy + r - sag / 2, r, Math.PI * (1.5 - sweep), Math.PI * (1.5 + sweep), lw);
  };
  let catchAt = null;
  switch (face.eyes) {
    case "pill": pill(-EX, EY, PW, PH); pill(EX, EY, PW, PH); catchAt = { y: EY, w: PW, h: PH, k: 0.9 }; break;
    case "wide": for (const sx of [-1, 1]) pill(sx * EX, WIDE.y, WIDE.w, WIDE.h); catchAt = { y: WIDE.y, w: WIDE.w, h: WIDE.h, k: num("wk", 1.32) }; break;
    case "down": {
      // reading: open pills cast down at the page (only the top quarter flattened a touch, like a relaxed lid)
      const flat = num("dflat", 0.012);
      for (const sx of [-1, 1]) {
        if (flat > 0) downEye(sx * EX, DOWN.y + DOWN.h / 2, DOWN.w, DOWN.h, DOWN.w * num("drt", 0.36), -flat);
        else pill(sx * EX, DOWN.y, DOWN.w, DOWN.h);
      }
      catchAt = { y: DOWN.y, w: DOWN.w, h: DOWN.h, k: num("dck", 0.85) };
      break;
    }
    case "blink": {
      const o = OPEN[face.open ?? "pill"];
      for (const sx of [-1, 1]) lid(sx * EX, o.y, o.w + 0.05, 0.085);
      break;
    }
    case "readBlink": for (const sx of [-1, 1]) lid(sx * EX, DOWN.y - 0.02, DOWN.w + 0.05, 0.085); break;
    case "happy": arc(-EX, EY - 0.1, 0.17, Math.PI * 0.12, Math.PI * 0.88, 0.105); arc(EX, EY - 0.1, 0.17, Math.PI * 0.12, Math.PI * 0.88, 0.105); break;
    case "sleep": arc(-EX, EY + 0.08, 0.17, Math.PI * 1.15, Math.PI * 1.85, 0.1); arc(EX, EY + 0.08, 0.17, Math.PI * 1.15, Math.PI * 1.85, 0.1); break;
  }
  switch (face.mouth) {
    case "smile": arc(0, MY + 0.15, 0.16, Math.PI * 1.2, Math.PI * 1.8, 0.085); break;
    case "small": arc(0, MY + num("smy", -0.04), num("smr", 0.1), Math.PI * 1.25, Math.PI * 1.75, 0.075); break;
    // a gentle content smile (reading): softer than hello's, a little lower
    case "content": arc(0, MY + num("cmy", 0.09), num("cmr", 0.15), Math.PI * 1.22, Math.PI * 1.78, 0.08); break;
    // an open grin (ready): wide and shallow
    case "grin": dshape(0, MY + num("gy", 0.12), num("gw", 0.4), num("gd", 0.19)); break;
    case "talk": dshape(0, MY + 0.06, 0.36, 0.24); break;
    // ready talking: taller and rounder than the grin, so the two are clearly different
    case "talkBig": dshape(0, MY + 0.1, 0.34, 0.3); break;
    case "big": dshape(0, MY + 0.09, 0.46, 0.28); break;
    case "o": ring(0, MY + 0.02, 0.06, 0.068, 0.05); break;
  }

  const dim = face.dim ?? 1;
  const draw = (ctx, colour, halo, blur = 46) => {
    toLocal(ctx);
    for (const p of paths) {
      ctx.save();
      if (halo) { ctx.shadowColor = halo; ctx.shadowBlur = blur; }
      p.build(ctx);
      if (p.type === "fill") { ctx.fillStyle = colour; ctx.fill(); }
      else { ctx.strokeStyle = colour; ctx.lineWidth = p.lw; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke(); }
      ctx.restore();
    }
  };
  const bezel = (ctx, colour, lw, rho, alpha) => {
    toLocal(ctx); ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = colour; ctx.lineWidth = lw; ctx.beginPath();
    for (let j = 0; j <= 160; j++) { const [bx, by] = visorBoundary((j / 160) * Math.PI * 2); const x = VIS.cx + bx * rho, y = VIS.cy + by * rho; j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath(); ctx.stroke(); ctx.restore();
  };
  const BZ = num("bz", 0.915), BW = num("bw", 0.035);
  // the glass's own colour: a deep navy-teal, darkest in the middle, lifting to teal at the edges
  // (painted into the emissive map, pre-compensated for the neutral tone mapper, which crushes darks)
  const glass = (ctx) => {
    toLocal(ctx);
    ctx.save();
    ctx.translate(VIS.cx, VIS.cy + 0.04);
    ctx.scale(VIS.ax, VIS.ay);
    const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.0);
    rg.addColorStop(0, preTone(flag("visC", "#0B1B22")));
    rg.addColorStop(0.5, preTone(flag("visM", "#0C2029")));
    rg.addColorStop(1, preTone(flag("visE", "#0E3442")));
    ctx.fillStyle = rg; ctx.fillRect(-2, -2, 4, 4);
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  };
  // colour map: almost black (the glass's colour comes from the emissive map), pale features
  {
    const ctx = colorC.getContext("2d");
    ctx.fillStyle = "#03080A"; ctx.fillRect(0, 0, W, W);
    if (flag("bezel", "1") !== "0") bezel(ctx, "#5FE3F5", BW, BZ, 0.6);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    draw(ctx, EYE_FILL, null);
  }
  // emissive map: the glass gradient, one soft broad highlight, a soft cyan rim, glowing features
  {
    const ctx = glowC.getContext("2d");
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, W);
    glass(ctx);
    // the cyan bezel glow where the glass meets the shell (a third softer than before)
    if (flag("bezel", "1") !== "0") {
      const G = num("rimG", 0.66);
      ctx.save(); ctx.filter = "blur(10px)"; bezel(ctx, GLOW_HALO, BW * 2.4, BZ, 0.55 * G * dim); ctx.restore();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      bezel(ctx, "#7EEBFA", BW, BZ, 0.95 * G * dim);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    // the one soft broad highlight: the studio softbox seen in the glass, a wide soft band along the upper-left
    if (flag("hl", "1") !== "0") {
      toLocal(ctx);
      ctx.save();
      ctx.beginPath();
      for (let j = 0; j <= 160; j++) { const [bx, by] = visorBoundary((j / 160) * Math.PI * 2); const x = VIS.cx + bx * 0.88, y = VIS.cy + by * 0.88; j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.closePath(); ctx.clip();
      const HR = num("hlR", 0.74), A0 = num("hlA0", 0.48), A1 = num("hlA1", 1.04), HA = num("hlA", 0.95), HW = num("hlW", 0.24);
      const cx0 = VIS.cx + visorBoundary(Math.PI * 0.74)[0] * HR, cy0 = VIS.cy + visorBoundary(Math.PI * 0.74)[1] * HR;
      const rg = ctx.createRadialGradient(cx0, cy0, 0, cx0, cy0, num("hlF", 0.75));
      rg.addColorStop(0, `rgba(214,246,252,${HA})`); rg.addColorStop(0.45, `rgba(180,232,244,${HA * 0.5})`); rg.addColorStop(1, "rgba(180,232,244,0)");
      ctx.filter = `blur(${num("hlBlur", 14)}px)`;
      ctx.strokeStyle = rg; ctx.lineWidth = HW; ctx.lineCap = "round";
      ctx.beginPath();
      for (let j = 0; j <= 60; j++) { const [bx, by] = visorBoundary(Math.PI * (A0 + (A1 - A0) * (j / 60))); const x = VIS.cx + bx * HR, y = VIS.cy + by * HR; j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      ctx.restore();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    ctx.globalAlpha = 0.85 * dim;
    draw(ctx, GLOW_HALO, GLOW_HALO);
    draw(ctx, GLOW_HALO, GLOW_HALO);
    ctx.globalAlpha = dim;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    draw(ctx, EYE_FILL, null);
    // catchlights on open eyes (the same in hello and ready, so the eyes never change between poses)
    if (catchAt) {
      for (const c of [colorC.getContext("2d"), ctx]) {
        c.save(); toLocal(c); c.globalAlpha = 1; c.fillStyle = "#FFFFFF";
        const k = catchAt.k ?? 1;
        for (const sx of [-EX, EX]) {
          c.beginPath(); c.ellipse(sx - 0.04 * k, catchAt.y + catchAt.h * 0.24, 0.052 * k, 0.075 * k, 0.3, 0, Math.PI * 2); c.fill();
          c.beginPath(); c.arc(sx + 0.05 * k, catchAt.y - catchAt.h * 0.2, 0.024 * k, 0, Math.PI * 2); c.fill();
        }
        c.restore();
      }
    }
  }
  const t1 = new THREE.CanvasTexture(colorC); t1.colorSpace = THREE.SRGBColorSpace; t1.anisotropy = 4;
  const t2 = new THREE.CanvasTexture(glowC); t2.colorSpace = THREE.SRGBColorSpace; t2.anisotropy = 4;
  return { map: t1, emissiveMap: t2 };
}

// a bold open book in deep teal on a pale disc: one shape that still reads at 44px
function badgeTexture(THREE) {
  const W = 256;
  const c = document.createElement("canvas"); c.width = c.height = W;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#F2FBFD"; ctx.fillRect(0, 0, W, W);
  ctx.translate(W / 2, W / 2 + 8);
  ctx.fillStyle = flag("glyph", "#0B6A85");
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx * 9, -44);
    ctx.quadraticCurveTo(sx * 48, -66, sx * 92, -50);
    ctx.lineTo(sx * 92, 44);
    ctx.quadraticCurveTo(sx * 48, 30, sx * 9, 56);
    ctx.closePath(); ctx.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function badgeMat(THREE) {
  const v = flag("bm", "basic");
  if (v === "basic") return new THREE.MeshBasicMaterial({ map: badgeTexture(THREE) });
  if (v === "std") return new THREE.MeshStandardMaterial({ map: badgeTexture(THREE), roughness: 0.6, envMapIntensity: 0.4 });
  return new THREE.MeshPhysicalMaterial({ map: badgeTexture(THREE), roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.4, envMapIntensity: 0.55 });
}

function pageTexture(THREE, flip) {
  const W = 256;
  const c = document.createElement("canvas"); c.width = W; c.height = Math.round(W * 1.25);
  const ctx = c.getContext("2d");
  ctx.fillStyle = flag("pageT", "#FFF0D2"); ctx.fillRect(0, 0, W, c.height);
  // a soft gutter shadow by the spine
  const g = ctx.createLinearGradient(flip ? W : 0, 0, flip ? W - 80 : 80, 0);
  g.addColorStop(0, "rgba(14,90,112,0.34)"); g.addColorStop(1, "rgba(14,90,112,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, c.height);
  // text lines in deep teal-navy: bold enough to hold at 64px
  ctx.fillStyle = flag("lineC", "#0D4A5E");
  for (let i = 0; i < 6; i++) {
    const y = 50 + i * 38;
    const w = i === 5 ? 92 : 162 - (i % 3) * 20;
    roundRect(ctx, flip ? W - 46 - w : 46, y, w, 17, 8.5); ctx.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// a soft dark blob for contact shadows
let BLOB = null;
function blobTexture(THREE) {
  if (BLOB) return BLOB;
  const W = 128;
  const c = document.createElement("canvas"); c.width = c.height = W;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
  g.addColorStop(0, "rgba(8,44,58,0.42)"); g.addColorStop(0.45, "rgba(8,44,58,0.22)"); g.addColorStop(1, "rgba(8,44,58,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, W);
  BLOB = new THREE.CanvasTexture(c); BLOB.colorSpace = THREE.SRGBColorSpace;
  return BLOB;
}

function lathe(THREE, pts, seg = 64, phiStart = 0, phiLength = Math.PI * 2) {
  const curve = new THREE.SplineCurve(pts.map(([r, y]) => new THREE.Vector2(r, y)));
  const p = curve.getPoints(60).map((v) => new THREE.Vector2(Math.max(0, v.x), v.y));
  p[0].x = 0; p[p.length - 1].x = 0;
  return new THREE.LatheGeometry(p, seg, phiStart, phiLength);
}

function starShape(THREE, ro, ri) {
  // a crisp five-point star: straight edges, each outer point and inner corner rounded by a small arc
  const s = new THREE.Shape();
  const pts = [];
  for (let i = 0; i < 10; i++) { const r = i % 2 ? ri : ro; const t = Math.PI / 2 + (i * Math.PI) / 5; pts.push([Math.cos(t) * r, Math.sin(t) * r]); }
  const lerp = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  const TIP = 0.2, IN = 0.12; // how far along each edge the rounding starts, outer tips and inner corners
  for (let i = 0; i < 10; i++) {
    const p = pts[i], prev = pts[(i + 9) % 10], next = pts[(i + 1) % 10];
    const f = i % 2 ? IN : TIP;
    const a = lerp(p, prev, f), b = lerp(p, next, f);
    if (i === 0) s.moveTo(a[0], a[1]); else s.lineTo(a[0], a[1]);
    s.quadraticCurveTo(p[0], p[1], b[0], b[1]);
  }
  s.closePath();
  return s;
}

function heartShape(THREE, size) {
  // a soft heart (Pluto's Tombaugh Regio), tip down, centred
  const s = new THREE.Shape();
  const k = size;
  s.moveTo(0, -0.62 * k);
  s.bezierCurveTo(0.2 * k, -0.42 * k, 0.62 * k, -0.18 * k, 0.6 * k, 0.16 * k);
  s.bezierCurveTo(0.58 * k, 0.48 * k, 0.16 * k, 0.56 * k, 0, 0.26 * k);
  s.bezierCurveTo(-0.16 * k, 0.56 * k, -0.58 * k, 0.48 * k, -0.6 * k, 0.16 * k);
  s.bezierCurveTo(-0.62 * k, -0.18 * k, -0.2 * k, -0.42 * k, 0, -0.62 * k);
  return s;
}

// place a thin decal-ish solid on the helmet surface at head-local (x, y)
function onShell(THREE, obj, x, y, lift = 0) {
  const n = headNormal(THREE, x, y);
  obj.position.set(x, y, headZ(x, y)).addScaledVector(n, lift);
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
}

// ---------- parts ----------
function buildHead(THREE, BGU, M, face, renderer) {
  const head = new THREE.Group();
  const shell = mesh(THREE, superEllipsoid(THREE, BGU, HEAD.rx, HEAD.ry, HEAD.rz, HEAD.p, 96, 64, HEAD.taper), M.shell);
  shell.userData.occluder = true; // in an arm layer it still hides what is behind it (the shoulder ball under the rim)
  head.add(shell);
  const tex = faceTextures(THREE, face);
  const visorMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, map: tex.map, emissive: 0xffffff, emissiveMap: tex.emissiveMap, emissiveIntensity: 1.0,
    roughness: num("vr", 0.3), metalness: 0, clearcoat: num("vcc", 0.3), clearcoatRoughness: num("vcr", 0.4), specularIntensity: num("vsi", 0.35),
    envMap: visorEnv(THREE, renderer), envMapIntensity: 1,
  });
  const visor = mesh(THREE, visorGeometry(THREE), visorMat);
  visor.castShadow = false;
  head.add(visor);
  const rim = mesh(THREE, visorRim(THREE), M[flag("beadMat", "bead")]);
  rim.castShadow = false;
  if (flag("bead", "1") !== "0") head.add(rim);
  // ear pods: chunky opaque satin-cyan pads that stand proud of the shell (ref 1's soft side pods), one soft inset
  // in each face; splayed slightly back so the far one foreshortens as the head turns
  // chunky, softly domed pods (ref 1): one smooth satin dome, no inset ring; pulled in toward the shell so the head
  // plus pods sit well inside the avatar crop
  const CR = num("cupR", 0.47), CO = num("cupOut", -0.0), CH = num("cupH", 0.17);
  for (const sx of [-1, 1]) {
    const cup = new THREE.Group();
    cup.add(mesh(THREE, lathe(THREE, [[0, CH], [CR * 0.3, CH * 0.975], [CR * 0.55, CH * 0.88], [CR * 0.76, CH * 0.68], [CR * 0.92, CH * 0.38], [CR, 0.0], [CR * 0.97, -0.09], [CR * 0.8, -0.16], [CR * 0.4, -0.2], [0, -0.2]], 64), M.cup));
    cup.rotation.z = -sx * Math.PI / 2;
    // splayed a little toward the back, so each pod's face turns away with the head (the far one foreshortens)
    cup.rotation.y = sx * num("cupSplay", 0.1);
    cup.position.set(sx * (HEAD.rx - 0.05 + CO), -0.04, num("cupZ", -0.06));
    head.add(cup);
  }
  // one short antenna with a glowing star (the space nod): a thick deep-cyan stem that still reads at 34px,
  // rising from a shell-coloured collar sunk into the helmet
  // one short antenna on the crown with a crisp five-point star: a deep-cyan stem rising from a shell-coloured
  // collar, a small ball at its tip, the star standing on the ball
  if (flag("ant", "1") !== "0") {
    const bx = num("antX", 0);
    const by = HEAD.ry * Math.pow(1 - Math.pow(Math.abs(bx) / HEAD.rx, HEAD.p), 1 / HEAD.p);
    // a short socket on the crown: a shell collar, a small deep-cyan ball and the star seated right on it, low enough
    // that the star's top stays well inside the avatar crop (and inside it through the app's bob)
    const base = new THREE.Vector3(bx, by - 0.04, num("antZ", -0.02));
    const collar = mesh(THREE, lathe(THREE, [[0, 0.06], [0.08, 0.056], [0.125, 0.02], [0.145, -0.04], [0.15, -0.12], [0, -0.14]], 40), M.shell);
    collar.position.copy(base).add(new THREE.Vector3(0, -0.035, 0));
    collar.userData.occluder = true;
    head.add(collar);
    const BR = num("antBall", 0.064);
    const tip = base.clone().add(new THREE.Vector3(0, num("antL", 0.02), 0));
    const ball = mesh(THREE, new THREE.SphereGeometry(BR, 32, 20), M.deep);
    ball.position.copy(tip);
    head.add(ball);
    const R5 = num("starR", 0.15);
    const sg = new THREE.ExtrudeGeometry(starShape(THREE, R5, R5 * num("starIn", 0.5)), { depth: 0.05, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.022, bevelSegments: 5, curveSegments: 8 });
    sg.computeBoundingBox();
    const bb = sg.boundingBox;
    sg.translate(0, 0, -(bb.min.z + bb.max.z) / 2); // centred in depth; x,y stay on the star's own centre
    const star = mesh(THREE, sg, M.glow);
    // the star's lower two points straddle the ball and rest on the collar
    star.position.copy(tip).add(new THREE.Vector3(0, num("starUp", 0.065), 0));
    star.rotation.x = num("starTilt", -0.45); // leaning back a little, so it shows its depth and stands lower
    star.castShadow = false;
    head.add(star);
  }
  // (an older heart decal, off: it blurred into a cyan smudge at 64px and below and competed with the star)
  if (flag("heart", "0") !== "0") {
    const hg = new THREE.ExtrudeGeometry(heartShape(THREE, num("heartS", 0.3)), { depth: 0.01, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 16 });
    const heart = mesh(THREE, hg, M.cup);
    heart.castShadow = false;
    const g = new THREE.Group(); g.add(heart);
    onShell(THREE, g, num("heartX", -0.9), num("heartY", 0.66), -0.012);
    heart.rotation.z = num("heartRot", 0.25);
    head.add(g);
  }
  if (flag("headShadow", "0") === "0") head.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  return head;
}

function buildBoot(THREE, BGU, M) {
  const TOE = num("toe", 0.12), LEN = num("bootL", 0.44), WID = num("bootW", 0.335), HT = num("bootH", 0.165);
  const up = superEllipsoid(THREE, BGU, WID, HT, LEN, 2.5, 64, 40);
  const p = up.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const f = Math.max(0, z / LEN); // 0 at the middle, 1 at the toe
    if (y > 0) y *= 1 - 0.42 * f * f; // the toe is lower than the ankle
    x *= 1 - 0.1 * f * f; // and a little narrower: a rounded toe, not a box
    if (y < -HT * 0.55) y = -HT * 0.55 - (y + HT * 0.55) * 0.35; // a flatter tread
    const fc = Math.max(0, (z / LEN - 0.35) / 0.65);
    if (y < 0) y += 0.075 * fc * fc * Math.min(1, -y / (HT * 0.55)); // the toe's underside curls up with the sole
    p.setXYZ(i, x, y, z);
  }
  up.computeVertexNormals();
  const upper = mesh(THREE, up, M.glove);
  upper.position.set(0, 1.85 - 2.6 + HT * 0.55 + 0.035, TOE);
  const sg = superEllipsoid(THREE, BGU, WID * 0.99, 0.042, LEN * 0.99, 3, 64, 24);
  const q = sg.attributes.position;
  for (let i = 0; i < q.count; i++) {
    const z = q.getZ(i), f = Math.max(0, (z / LEN - 0.35) / 0.65);
    q.setY(i, q.getY(i) + 0.075 * f * f); // the sole curls up at the toe
  }
  sg.computeVertexNormals();
  const sole = mesh(THREE, sg, M[flag("soleM", "sole")]);
  sole.position.set(0, 1.85 - 2.6 + 0.04, TOE);
  return [upper, sole];
}

function buildBody(THREE, M, pose, BGU) {
  const g = new THREE.Group();
  // the two-tone suit: the torso is two half-lathes that meet at a crisp seam down the middle
  const prof = [[0, -2.02], [0.5, -2.0], [0.77, -1.9], [0.87, -1.7], [0.88, -1.45], [0.83, -1.12], [0.7, -0.78], [0.5, -0.52], [0.24, -0.4], [0, -0.38]];
  for (const [side, phi0] of [["r", 0], ["l", Math.PI]]) {
    const half = mesh(THREE, lathe(THREE, prof, 48, phi0, Math.PI), toneAO(M, SIDE_TONE[side]));
    half.scale.z = 0.8;
    g.add(half);
  }
  // collar ring under the helmet
  const collar = mesh(THREE, new THREE.TorusGeometry(0.42, 0.09, 20, 64), M.shell);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = -0.5;
  collar.scale.set(1, 0.8, 1);
  g.add(collar);
  // legs (follow the body's tone) and boots, each rotating about its hip
  for (const [side, sx] of [["l", -1], ["r", 1]]) {
    const hip = new THREE.Group();
    hip.position.set(sx * 0.39, -1.85, 0);
    const lr = pose.legs?.[side];
    if (lr) hip.rotation.set(lr.x ?? 0, 0, lr.z ?? 0);
    // the leg runs down into the boot (no gap between the cyan leg and the white boot)
    const leg = mesh(THREE, lathe(THREE, [[0, -2.4], [0.24, -2.38], [0.28, -2.26], [0.29, -2.02], [0.27, -1.8], [0, -1.7]], 40), tone(M, SIDE_TONE[side]));
    leg.position.y = 1.85;
    hip.add(leg);
    // a soft toy shoe: a rounded upper that runs forward into a low round toe, on a thin sole that curves up at
    // the toe (so the feet read as feet from the front, and a lifted foot is a shoe, not a white disc)
    hip.add(...buildBoot(THREE, BGU, M));
    const cuff = mesh(THREE, new THREE.TorusGeometry(0.255, 0.07, 16, 48), M.glove);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.set(0, 1.85 - 2.29, 0.0);
    hip.add(cuff);
    g.add(hip);
  }
  // chest badge on the bright half
  const badge = new THREE.Group();
  const BR = num("badgeR", 0.29);
  const disc = mesh(THREE, new THREE.CylinderGeometry(BR, BR, 0.05, 64, 1), M.ink);
  disc.rotation.x = Math.PI / 2;
  badge.add(disc);
  const face = mesh(THREE, new THREE.CircleGeometry(BR - 0.02, 64), badgeMat(THREE));
  face.position.z = 0.027;
  badge.add(face);
  const bezel = mesh(THREE, new THREE.TorusGeometry(BR, 0.04, 16, 64), M.ink);
  badge.add(bezel);
  const bx = num("badgeX", 0.3);
  // sit it on the torso surface (lathe radius at chest height, z squashed by 0.8)
  const by = -1.2, rr = 0.86;
  const ang = Math.asin(Math.min(0.95, bx / rr));
  badge.position.set(bx, by, Math.cos(ang) * rr * 0.8 - 0.005);
  badge.rotation.set(-0.16, ang * 0.75, 0, "YXZ");
  g.add(badge);
  return g;
}

// the arm's centre line: through shoulder, elbow and wrist, with the elbow rounded off (a soft bend, no fold)
function armCurve(THREE, S, E, Wr) {
  const k = num("elbowK", 0.42);
  const a = E.clone().lerp(S, Math.min(0.45, (k * 0.5) / S.distanceTo(E) + 0.12));
  const b = E.clone().lerp(Wr, Math.min(0.45, (k * 0.5) / E.distanceTo(Wr) + 0.12));
  const path = new THREE.CurvePath();
  path.add(new THREE.LineCurve3(S.clone(), a));
  path.add(new THREE.QuadraticBezierCurve3(a, E.clone(), b));
  path.add(new THREE.LineCurve3(b, Wr.clone()));
  return path;
}

function buildArm(THREE, M, mat, a) {
  const g = new THREE.Group();
  const S = new THREE.Vector3(...a.s), E = new THREE.Vector3(...a.e), Wr = new THREE.Vector3(...a.w);
  const sx = Math.sign(S.x) || 1;
  // short chunky limbs (ref 2): nearly as thick as the legs
  const R0 = num("armR0", 0.27), R1 = num("armR1", 0.23);
  const path = armCurve(THREE, S, E, Wr);
  const LEN = path.getLength();
  // an arm layer starts in a round shoulder ball that flows into the arm with no crease: the radius eases from the
  // ball's down to the arm's over the first stretch (the tube's start cap is the ball's back half)
  const RB = num("ballR", 0.3), FIL = num("ballFil", 0.36);
  const rad = a.layer
    ? (t) => { const d = t * LEN, base = R0 + (R1 - R0) * t; const f = Math.min(1, d / FIL); const s = f * f * (3 - 2 * f); return base + (RB - base) * (1 - s); }
    : (t) => R0 + (R1 - R0) * t;
  const { geo, curve } = sausage(THREE, null, rad, { seg: 48, radial: 32, cap: 10, curve: path });
  g.add(mesh(THREE, geo, mat));
  const dir = curve.getTangentAt(1).normalize();
  if (a.hand === "none") return g; // the hand belongs to a prop (the book grip)
  // the mitten's cuff: a fat soft roll that the mitten grows out of (one vinyl piece, not a bracelet); folded hands
  // (sleepy) have none: their mittens are tucked half into the cyan sleeves
  if (a.hand !== "clasp") {
    const cuff = mesh(THREE, new THREE.TorusGeometry(R1 - 0.01, 0.078, 16, 40), M.glove);
    cuff.position.copy(Wr).addScaledVector(dir, 0.0);
    cuff.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    g.add(cuff);
  }
  // hand
  const up = new THREE.Vector3(0, 1, 0);
  const hg = new THREE.Group();
  if (a.hand === "open") {
    // an open mitten held up palm-out: a soft rounded palm, three stubby finger bumps along its top, a thumb
    // standing off toward the head; splayed a little away from the head
    hg.position.copy(Wr).addScaledVector(dir, 0.2);
    hg.quaternion.setFromUnitVectors(up, dir);
    const tw = new THREE.Group();
    tw.rotation.z = (a.splay ?? 0) * sx;
    hg.add(tw);
    const palm = mesh(THREE, unitSphere(THREE), M.glove);
    palm.scale.set(0.25, 0.25, 0.18);
    palm.position.set(0, 0.08, 0);
    tw.add(palm);
    for (let i = -1; i <= 1; i++) {
      const f = mesh(THREE, new THREE.CapsuleGeometry(0.086, 0.1, 8, 20), M.glove);
      f.scale.set(1, 1, 0.82);
      const ang = -i * 0.3;
      f.position.set(i * 0.125 + Math.sin(-ang) * 0.06, 0.22 + Math.cos(ang) * 0.06 - Math.abs(i) * 0.035, 0.01);
      f.rotation.z = ang;
      tw.add(f);
    }
    const th = mesh(THREE, new THREE.CapsuleGeometry(0.088, 0.13, 8, 20), M.glove);
    th.position.set(-sx * 0.25, 0.0, 0.05);
    th.rotation.z = sx * 0.95;
    tw.add(th);
  } else if (a.hand === "clasp") {
    // a relaxed mitten resting on the tummy, half drawn into the cuff
    hg.position.copy(Wr).addScaledVector(dir, num("clOff", 0.08));
    hg.quaternion.setFromUnitVectors(up, dir);
    const mitt = mesh(THREE, unitSphere(THREE), M.glove);
    mitt.scale.set(num("clS", 0.23), num("clS", 0.23) * 0.95, num("clS", 0.23) * 0.83);
    hg.add(mitt);
  } else if (a.hand === "thumb") {
    // a big fist, knuckles to the viewer, a short fat thumb straight up
    hg.position.copy(Wr).addScaledVector(dir, 0.2);
    const fist = mesh(THREE, unitSphere(THREE), M.glove);
    fist.scale.set(0.3, 0.27, 0.27);
    hg.add(fist);
    // finger creases: three soft ridges facing the viewer
    for (let i = 0; i < 3; i++) {
      const f = mesh(THREE, new THREE.CapsuleGeometry(0.08, 0.17, 8, 16), M.glove);
      f.rotation.z = Math.PI / 2;
      f.position.set(0.03, 0.105 - i * 0.105, 0.18);
      hg.add(f);
    }
    const th = mesh(THREE, new THREE.CapsuleGeometry(num("thR", 0.125), num("thL", 0.12), 8, 20), M.glove);
    th.position.set(-0.07, 0.3, 0.07);
    th.rotation.z = 0.12;
    hg.add(th);
    hg.rotation.y = -0.35;
  } else if (a.hand === "fist") {
    hg.position.copy(Wr).addScaledVector(dir, 0.21);
    const fist = mesh(THREE, unitSphere(THREE), M.glove);
    fist.scale.set(0.285, 0.3, 0.27);
    hg.quaternion.setFromUnitVectors(up, dir);
    hg.add(fist);
  } else {
    // relaxed mitten
    hg.position.copy(Wr).addScaledVector(dir, 0.2);
    hg.quaternion.setFromUnitVectors(up, dir);
    const mitt = mesh(THREE, unitSphere(THREE), M.glove);
    mitt.scale.set(0.27, 0.29, 0.24);
    hg.add(mitt);
  }
  g.add(hg);
  return g;
}

// A chunky toy book: soft rounded cover boards, a thick cream page block whose pages fan up out of the gutter,
// and (for the reading pose) Pluto's mittens gripping the outer edges of the covers, thumbs over the pages.
function buildBook(THREE, M, RBG) {
  const book = new THREE.Group();
  const CW = num("cw", 0.97), CH = num("ch", 1.22), CT = num("ct", 0.14), CRAD = 0.045;
  const PW = 0.84, PH = 1.06, PB = 0.03; // page block width (spine to fore-edge), height, extrude bevel
  const PT = num("pt", 0.2), GUT = 0.035, FORE = num("fore", 0.12);
  // height of the top page above the cover, f = 0 at the gutter, 1 at the fore-edge: it rises steeply out
  // of the gutter, crowns, then rolls gently down to the fore-edge
  const top = (f) => {
    const rise = Math.sin(Math.min(1, f / 0.32) * Math.PI / 2);
    const fall = Math.pow(Math.max(0, (f - 0.32) / 0.68), 1.6);
    return GUT + (PT - GUT) * rise - (PT - FORE) * fall;
  };
  const halves = {};
  for (const sx of [-1, 1]) {
    const half = new THREE.Group();
    const cover = mesh(THREE, new RBG(CW, CH, CT, 4, CRAD), M.cover);
    cover.position.set(sx * CW / 2, 0, 0);
    half.add(cover);
    // the page block: its cross-section (x across the page, y = height above the cover) extruded along the book's height
    const shape = new THREE.Shape();
    const r = 0.05, N = 28;
    const X = (x) => sx * x;
    shape.moveTo(X(0), 0);
    shape.lineTo(X(PW - r), 0);
    shape.quadraticCurveTo(X(PW), 0, X(PW), r);
    shape.lineTo(X(PW), top(1) - r);
    shape.quadraticCurveTo(X(PW), top(1), X(PW - r * 1.2), top(1 - (r * 1.2) / PW));
    for (let i = N; i >= 0; i--) { const f = (i / N) * (1 - (r * 1.2) / PW); shape.lineTo(X(f * PW), top(f)); }
    shape.lineTo(X(0), 0);
    const depth = PH - 2 * PB;
    const bg = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: PB, bevelSize: PB * 0.8, bevelSegments: 3, curveSegments: 8, steps: 1 });
    bg.translate(0, 0, -depth / 2);
    bg.rotateX(Math.PI / 2);
    bg.computeVertexNormals();
    const block = mesh(THREE, bg, M.page);
    block.position.set(sx * 0.015, 0, CT / 2 - 0.01);
    half.add(block);
    // the top page with its lines, laid on the block's curved top
    const pg = new THREE.PlaneGeometry(1, PH - 0.1, 36, 1);
    const pp = pg.attributes.position;
    const f0 = 0.035, f1 = 0.93;
    for (let i = 0; i < pp.count; i++) {
      const u = pp.getX(i) + 0.5; // 0..1 left to right
      const f = f0 + (f1 - f0) * (sx > 0 ? u : 1 - u);
      pp.setX(i, sx * f * PW);
      pp.setZ(i, top(f) + PB * 0.8 + 0.006);
    }
    pg.computeVertexNormals();
    const page = mesh(THREE, pg, new THREE.MeshPhysicalMaterial({ map: pageTexture(THREE, sx < 0), roughness: 0.72, sheen: 0.2 }));
    page.position.set(sx * 0.015, 0, CT / 2 - 0.01);
    half.add(page);
    half.rotation.y = -sx * num("open", 0.28);
    book.add(half);
    halves[sx] = half;
  }
  const spine = mesh(THREE, new THREE.CapsuleGeometry(0.075, CH - 0.16, 8, 24), M.cover);
  spine.position.z = -0.03;
  book.add(spine);

  // the grips: a mitten wrapped round each cover's outer edge at mid-height, its thumb lying over the page edge
  const grips = {};
  for (const sx of [-1, 1]) {
    const h = new THREE.Group();
    const mitt = mesh(THREE, unitSphere(THREE), M.gloveCool);
    mitt.scale.set(0.24, 0.3, 0.25);
    mitt.position.set(sx * (CW + 0.07), 0, -0.01);
    h.add(mitt);
    const thumb = mesh(THREE, new THREE.CapsuleGeometry(0.085, 0.13, 8, 20), M.gloveCool);
    thumb.rotation.z = Math.PI / 2 + sx * 0.35;
    thumb.position.set(sx * (CW - num("thx", 0.06)), num("thy", -0.04), CT / 2 + num("thz", 0.22));
    h.add(thumb);
    // a soft contact shadow where the mitten and thumb press on the page (the key light alone barely shows one)
    if (flag("cshadow", "1") !== "0") {
      const f = 0.86, z = CT / 2 - 0.01 + top(f) + PB * 0.8 + 0.016;
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.32), new THREE.MeshBasicMaterial({ map: blobTexture(THREE), transparent: true, depthWrite: false, opacity: num("csA", 0.8) }));
      sh.position.set(sx * (0.015 + f * PW), -0.11, z);
      sh.rotation.y = sx * 0.18;
      sh.renderOrder = 2;
      h.add(sh);
    }
    halves[sx].add(h);
    // where the arm should arrive (behind and outside the mitten), in book-half coordinates
    grips[sx] = { half: halves[sx], wrist: new THREE.Vector3(sx * (CW + 0.16), -0.12, -0.12) };
  }
  return { book, grips };
}

// ---------- assembly ----------
function frame(THREE, pose) {
  const view = new THREE.Group();
  view.rotation.x = 0.06; // a hair above eye level
  const root = new THREE.Group();
  root.position.set(pose.shift ?? 0, -2.6 + (pose.lift ?? 0), 0);
  root.rotation.set(pose.root.x, pose.root.y, pose.root.z, "YXZ");
  if (pose.squash) root.scale.set(pose.squash[0], pose.squash[1], pose.squash[0]);
  view.add(root);
  const fig = new THREE.Group();
  fig.position.y = 2.6;
  root.add(fig);
  return { view, root, fig };
}

function armSpec(pose, side) {
  const a = pose.arms[side];
  return { ...a, s: a.s ?? (side === "l" ? S_L : S_R) };
}

function assemble(THREE, helpers, name) {
  const M = mats(THREE);
  const BGU = helpers.BufferGeometryUtils;
  BGU_REF = BGU;
  const pose = poseFor(name);
  const { view, root, fig } = frame(THREE, pose);

  fig.add(buildBody(THREE, M, pose, BGU));
  const neck = new THREE.Group();
  neck.position.y = NECK_Y;
  neck.userData.isNeck = true;
  neck.rotation.set(pose.head.x, pose.head.y, pose.head.z, "YXZ");
  fig.add(neck);
  const head = buildHead(THREE, BGU, M, pose.face, helpers.renderer);
  head.position.y = HEAD_UP;
  head.scale.setScalar(HEAD_SCALE);
  neck.add(head);

  const layers = {};
  const armsForAO = [];
  if (pose.arms) {
    for (const side of ["l", "r"]) {
      const a = armSpec(pose, side);
      armsForAO.push(a);
      const g = buildArm(THREE, M, toneArm(M, SIDE_TONE[side], !!a.layer), a);
      fig.add(g);
      if (a.layer) layers[a.layer] = g;
    }
  }
  if (pose.book) {
    const { book, grips } = buildBook(THREE, M, helpers.RoundedBoxGeometry);
    // tipped well back (top edge away), so the pages face up to the visor: Pluto reads it, not shows it
    book.position.set(0, num("bookY", -1.38), num("bookZ", 1.1));
    book.rotation.set(num("bookTilt", -1.15), 0, 0);
    fig.add(book);
    book.updateMatrix();
    for (const [side, sx] of [["l", -1], ["r", 1]]) {
      const gp = grips[sx];
      gp.half.updateMatrix();
      const w = gp.wrist.clone().applyMatrix4(gp.half.matrix).applyMatrix4(book.matrix);
      const s = sx < 0 ? SI_L : SI_R;
      // elbows bent out and forward, forearms coming in to the cover edges
      const e = [sx * num("rex", 1.12), num("rey", -1.42), num("rez", 0.56)];
      const spec = { s, e, w: w.toArray(), hand: "none" };
      armsForAO.push(spec);
      fig.add(buildArm(THREE, M, toneArm(M, SIDE_TONE[side], false), spec));
    }
  }
  // the soft contact occlusion round the arms on the suit (see aoify): capsules in world space for this asset
  view.updateMatrixWorld(true);
  {
    const C = capsUniforms(THREE);
    const R0 = num("armR0", 0.27), R1 = num("armR1", 0.23);
    const w = (p) => fig.localToWorld(new THREE.Vector3(...p));
    const list = [];
    for (const a of armsForAO) {
      if (a.layer) { const c = w(a.s); list.push([c, num("ballR", 0.3) * num("haloK", 1.0), c, num("ballR", 0.3) * num("haloK", 1.0)]); continue; }
      const S = w(a.s), E = w(a.e), Wr = w(a.w);
      const rm = (R0 + R1) / 2;
      list.push([S, R0, E, rm], [E, rm, Wr, R1]);
    }
    C.uCapN.value = Math.min(CAP_MAX, list.length);
    list.slice(0, CAP_MAX).forEach(([a, ra, b, rb], i) => { C.uCapA.value[i].set(a.x, a.y, a.z, ra); C.uCapB.value[i].set(b.x, b.y, b.z, rb); });
  }
  // no shadow-map specks on the white vinyl (helmet, mittens, cuffs, boots): those parts take no cast shadows
  fig.traverse((o) => { if (o.isMesh && (o.material === M.glove || o.material === M.gloveCool || o.material === M.shell || o.material === M.bead)) o.receiveShadow = false; });
  return { view, root, fig, layers };
}

function ghost(obj, keepOccluders = false) {
  obj.traverse((o) => {
    if (o.isMesh) {
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      const occ = keepOccluders && o.userData.occluder;
      const g = ms.map((m) => { const c = m.clone(); c.colorWrite = false; c.depthWrite = occ; return c; });
      o.material = Array.isArray(o.material) ? g : g[0];
      o.receiveShadow = false;
    }
  });
}

export async function buildPluto(THREE, name, helpers) {
  const { view, fig, layers } = assemble(THREE, helpers, name);
  if (flag("only", "") === "head") { for (const child of fig.children) if (!child.userData.isNeck) ghost(child); return view; }
  const layerNames = Object.keys(layers);
  if (layerNames.includes(name)) {
    for (const child of fig.children) if (child !== layers[name]) ghost(child, true);
  } else {
    for (const n of layerNames) ghost(layers[n]);
  }
  return view;
}

export async function setupScene(THREE, scene) {
  scene.environmentIntensity = 0.62;
  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  key.position.set(-2.6, 9, 4.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const sc = key.shadow.camera;
  sc.left = -4; sc.right = 4; sc.top = 4; sc.bottom = -4; sc.near = 0.5; sc.far = 30;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = num("nb", 0.05);
  key.shadow.radius = 5;
  key.shadow.blurSamples = 16;
  key.shadow.intensity = 0.8;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xdffaff, 1.6);
  rim.position.set(5, 3, -6);
  scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0xffffff, 0.9);
  rim2.position.set(-6, 2, -4);
  scene.add(rim2);
  const fill = new THREE.DirectionalLight(0xffffff, 0.6);
  // high and to the right, so its glint on the visor sits up in the glass, clear of the eyes
  fill.position.set(num("fx", 4.6), num("fy", 3.2), num("fz", 7.5));
  scene.add(fill);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7fd6e6, 0.25));
  // a cool cyan bounce from the lower right, so the shell's shadow side stays a clean pale cyan, not grey-teal
  const bounce = new THREE.DirectionalLight(new THREE.Color(flag("bnC", "#9DEFFC")), num("bnI", 1.0));
  bounce.position.set(num("bnX", 7), num("bnY", -2.2), num("bnZ", 1.6));
  scene.add(bounce);
}

// figure-space points of a pose -> the app's 240 box (for placing hands)
export function projectPts(THREE, base, pts) {
  const pose = POSES[base];
  const { view, fig } = frame(THREE, pose);
  const os = pts.map((q) => { const o = new THREE.Object3D(); o.position.set(...q); fig.add(o); return o; });
  view.updateMatrixWorld(true);
  return os.map((o) => { const w = new THREE.Vector3(); o.getWorldPosition(w); return [Math.round((w.x + 3) * 400) / 10, Math.round((3 - w.y) * 400) / 10]; });
}

// ---------- pivots (for pivots.json): shoulder ball centres in the 240 box ----------
export function computePivots(THREE) {
  const out = {};
  for (const [layer, base, side] of [["hello-arm", "hello", "r"], ["cheer-arm-l", "cheer", "l"], ["cheer-arm-r", "cheer", "r"]]) {
    const pose = POSES[base];
    const { view, fig } = frame(THREE, pose);
    const p = new THREE.Object3D(); p.position.set(...armSpec(pose, side).s);
    fig.add(p);
    view.updateMatrixWorld(true);
    const w = new THREE.Vector3(); p.getWorldPosition(w);
    out[layer] = [Math.round((w.x + 3) * 40 * 10) / 10, Math.round((3 - w.y) * 40 * 10) / 10];
  }
  return out;
}
