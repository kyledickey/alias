import type { CSSProperties, ReactNode } from "react";
import { cx } from "@/lib/cx";
import { SHAPES, type ShapeName } from "@/lib/shapes";
import styles from "./shape.module.css";

export function Shape({
    shape,
    color,
    spin,
    className,
    style,
    children,
}: {
    shape: ShapeName;
    color?: string;
    /** Seconds per full rotation (negative spins the other way); content stays upright. */
    spin?: number;
    className?: string;
    style?: CSSProperties;
    children?: ReactNode;
}) {
    return (
        <div className={cx(styles.shape, className)} style={style}>
            <div
                aria-hidden
                className={cx(styles.fill, spin !== undefined && styles.spin)}
                style={
                    {
                        clipPath: SHAPES[shape],
                        background: color,
                        "--spin": spin ? `${Math.abs(spin)}s` : undefined,
                        "--spin-dir": spin && spin < 0 ? "reverse" : "normal",
                    } as CSSProperties
                }
            />
            {children !== undefined && <div className={styles.content}>{children}</div>}
        </div>
    );
}
