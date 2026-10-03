import type { Infer } from "convex/values";
import type { CSSProperties } from "react";
import { Link } from "wouter";
import type { aliasSchema } from "@convex/schema";
import { Icon } from "@/components/icon";
import { Shape } from "@/components/shape";
import { cx } from "@/lib/cx";
import { playerShape } from "@/lib/shapes";
import { playerColors, playerHue, useDarkMode } from "@/lib/theme";
import styles from "./lobby-parts.module.css";

/** One spinning "?" shape per joined player. Names stay secret until the round starts. */
export function MysteryShapes({
    aliases,
    baseHue,
    className,
}: {
    aliases: Infer<typeof aliasSchema>[];
    baseHue: number;
    className?: string;
}) {
    const dark = useDarkMode();
    return (
        <div className={cx(styles.shapes, className)}>
            {aliases.map((a, i) => {
                const c = playerColors(playerHue(baseHue, i), dark);
                return (
                    <Shape
                        key={a.id}
                        shape={playerShape(i)}
                        color={c.accent}
                        spin={(i % 2 ? -1 : 1) * (14 + (i % 4) * 5)}
                        className={`${styles.player} pop`}
                        style={{ color: c.onAccent } as CSSProperties}
                    >
                        <span className={styles.mystery}>?</span>
                    </Shape>
                );
            })}
        </div>
    );
}

export function HostActions({
    canStart,
    onClose,
    onStart,
    className,
}: {
    canStart: boolean;
    onClose: () => void;
    onStart: () => void;
    className?: string;
}) {
    return (
        <div className={cx(styles.actions, className)}>
            <Link href="/" className="btn btn-lg btn-error-tonal" onClick={onClose}>
                <Icon name="close" />
                Close
            </Link>
            <button
                type="button"
                className="btn btn-filled btn-lg"
                disabled={!canStart}
                onClick={onStart}
            >
                <Icon name="play_arrow" filled />
                Start round
            </button>
        </div>
    );
}
