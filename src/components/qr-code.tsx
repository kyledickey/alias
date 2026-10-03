import { useMemo } from "react";
import { encode } from "uqr";

const MARGIN = 2; // quiet zone, in modules

/**
 * QR code drawn in the M3 shape language: round dots and rounded finder
 * "eyes". Uses currentColor, so it takes on whatever container it sits in.
 * Keep it dark-on-light for reliable scanning.
 */
export function QrCode({ value, className }: { value: string; className?: string }) {
    const { size, dots } = useMemo(() => {
        const { size, data } = encode(value, { ecc: "M", border: 0 });
        const isFinder = (x: number, y: number) =>
            (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);
        const dots: [number, number][] = [];
        data.forEach((row, y) =>
            row.forEach((dark, x) => {
                if (dark && !isFinder(x, y)) dots.push([x, y]);
            }),
        );
        return { size, dots };
    }, [value]);

    const eyes: [number, number][] = [
        [0, 0],
        [size - 7, 0],
        [0, size - 7],
    ];

    return (
        <svg
            role="img"
            aria-label="QR code to join this game"
            viewBox={`${-MARGIN} ${-MARGIN} ${size + MARGIN * 2} ${size + MARGIN * 2}`}
            className={className}
            fill="currentColor"
        >
            {eyes.map(([x, y]) => (
                <g key={`${x}-${y}`}>
                    <rect
                        x={x + 0.5}
                        y={y + 0.5}
                        width={6}
                        height={6}
                        rx={2}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1}
                    />
                    <rect x={x + 2} y={y + 2} width={3} height={3} rx={1.1} />
                </g>
            ))}
            {dots.map(([x, y]) => (
                <circle key={`${x}-${y}`} cx={x + 0.5} cy={y + 0.5} r={0.5} />
            ))}
        </svg>
    );
}
