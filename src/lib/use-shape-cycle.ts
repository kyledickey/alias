import { useEffect, useState } from "react";
import type { ShapeName } from "./shapes";

/**
 * Steps through `shapes` on a timer so a <Shape> morphs between them.
 * First change after `delayMs`, then every `intervalMs`. Holds still for
 * reduced-motion users.
 */
export function useShapeCycle(
    shapes: readonly ShapeName[],
    intervalMs: number,
    delayMs = intervalMs,
): ShapeName {
    const [i, setI] = useState(0);
    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        let timer: number | undefined;
        const start = window.setTimeout(() => {
            setI((n) => n + 1);
            timer = window.setInterval(() => setI((n) => n + 1), intervalMs);
        }, delayMs);
        return () => {
            window.clearTimeout(start);
            window.clearInterval(timer);
        };
    }, [intervalMs, delayMs]);
    return shapes[i % shapes.length];
}
