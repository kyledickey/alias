// Material 3 Expressive shape library, generated as polar curves.
// Every shape has the same number of points starting at the same angle,
// so CSS can morph between any two of them by transitioning clip-path.

const POINTS = 96;
const TAU = Math.PI * 2;

type Radial = (t: number) => number;

const circle: Radial = () => 1;

// Soft scalloped edge, like the M3 "cookie" shapes
const cookie =
    (lobes: number, depth: number): Radial =>
    (t) =>
        1 + depth * Math.cos(lobes * t);

// Narrow peaks and wide valleys: "sunny" and "burst"
const burst =
    (points: number, depth: number, sharpness: number): Radial =>
    (t) =>
        1 + depth * (2 * Math.abs(Math.cos((points / 2) * t)) ** sharpness - 1);

// Wide petals and narrow notches: "flower" and "clover"
const petals =
    (count: number, depth: number, softness: number): Radial =>
    (t) =>
        1 + depth * Math.abs(Math.cos((count / 2) * t)) ** softness;

// Regular polygon with rounded corners
const polygon =
    (sides: number, rounding: number): Radial =>
    (t) => {
        const seg = TAU / sides;
        const local = (((t % seg) + seg) % seg) - seg / 2;
        const r = Math.cos(Math.PI / sides) / Math.cos(local);
        return r ** (1 - rounding);
    };

function toClipPath(radial: Radial, rotation = 0) {
    const pts: [number, number][] = [];
    for (let i = 0; i < POINTS; i++) {
        const t = (i / POINTS) * TAU;
        const r = radial(t);
        const a = t + rotation - Math.PI / 2;
        pts.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    // Scale to fill the box on its widest axis
    const extent = Math.max(...pts.map(([x, y]) => Math.max(Math.abs(x), Math.abs(y))));
    const s = 50 / extent;
    return `polygon(${pts
        .map(([x, y]) => `${(50 + x * s).toFixed(2)}% ${(50 + y * s).toFixed(2)}%`)
        .join(",")})`;
}

export const SHAPES = {
    circle: toClipPath(circle),
    cookie4: toClipPath(cookie(4, 0.1), Math.PI / 4),
    cookie6: toClipPath(cookie(6, 0.08)),
    cookie9: toClipPath(cookie(9, 0.06)),
    cookie12: toClipPath(cookie(12, 0.045)),
    clover4: toClipPath(petals(4, 0.42, 0.7), Math.PI / 4),
    clover8: toClipPath(petals(8, 0.26, 0.6)),
    flower: toClipPath(petals(6, 0.3, 0.8)),
    sunny: toClipPath(burst(8, 0.09, 1.4)),
    burst: toClipPath(burst(12, 0.15, 2.4)),
    softBurst: toClipPath(burst(10, 0.1, 1.2)),
    triangle: toClipPath(polygon(3, 0.55)),
    pentagon: toClipPath(polygon(5, 0.5)),
    gem: toClipPath(polygon(6, 0.45), Math.PI / 6),
    square: toClipPath(polygon(4, 0.6), Math.PI / 4),
};

export type ShapeName = keyof typeof SHAPES;

export const SHAPE_NAMES = Object.keys(SHAPES) as ShapeName[];

// Shapes that read well as a player's "face"
const PLAYER_SHAPES: ShapeName[] = [
    "cookie9",
    "clover4",
    "sunny",
    "flower",
    "gem",
    "cookie4",
    "burst",
    "pentagon",
    "clover8",
    "softBurst",
    "cookie6",
    "triangle",
];

export function playerShape(index: number) {
    return PLAYER_SHAPES[index % PLAYER_SHAPES.length];
}
