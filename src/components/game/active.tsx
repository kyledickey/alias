import { useMutation, useQuery } from "convex/react";
import type { Infer } from "convex/values";
import { type CSSProperties, type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { api } from "@convex/_generated/api";
import type { aliasSchema } from "@convex/schema";
import { GameHeader } from "@/components/game-header";
import { Icon } from "@/components/icon";
import { Shape } from "@/components/shape";
import { authClient } from "@/lib/auth-client";
import { cx } from "@/lib/cx";
import { playerShape, type ShapeName } from "@/lib/shapes";
import { hueForCode, playerColors, playerHue, useDarkMode } from "@/lib/theme";
import styles from "./active.module.css";
import { RoundTimer } from "./round-timer";

const GAP = 16;
const CARD_RATIO = 1.45; // preferred width / height

/**
 * Picks the column count that gives every card the most room, so the whole
 * board fits on one screen (it's usually on a TV).
 */
function useFitGrid(count: number) {
    const ref = useRef<HTMLDivElement>(null);
    const [cols, setCols] = useState(1);

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const fit = () => {
            const { width: W, height: H } = el.getBoundingClientRect();
            let best = 1;
            let bestSize = 0;
            for (let c = 1; c <= Math.max(1, count); c++) {
                const r = Math.ceil(count / c);
                const w = (W - GAP * (c - 1)) / c;
                const h = (H - GAP * (r - 1)) / r;
                const size = Math.min(w / CARD_RATIO, h);
                if (size > bestSize) {
                    bestSize = size;
                    best = c;
                }
            }
            setCols(best);
        };
        fit();
        const ro = new ResizeObserver(fit);
        ro.observe(el);
        return () => ro.disconnect();
    }, [count]);

    return [ref, cols] as const;
}

export default function Active({ id }: { id: string }) {
    const game = useQuery(api.games.getGame, { code: id });
    const user = authClient.useSession();
    const eliminateAlias = useMutation(api.games.toggleAliasEliminated);
    const dark = useDarkMode();
    const total = game?.aliases.length ?? 0;
    const [boardRef, cols] = useFitGrid(total);
    if (!game) return null;

    const isHost = user.data?.user?.id === game.hostId;
    const remaining = game.aliases.filter((a) => !a.eliminated).length;
    const baseHue = hueForCode(id);

    return (
        <div className={styles.page}>
            <GameHeader>
                <span className="chip code">{id}</span>
            </GameHeader>

            <main className={styles.main}>
                <div className={styles.status}>
                    <p className={styles.remaining}>
                        <span className={styles.bigNum}>{remaining}</span>
                        <span className={styles.statusLabel}>of {total} left</span>
                    </p>
                    {isHost && <p className={styles.hint}>Tap an alias when it's guessed</p>}
                    {game.startedAt && (
                        <p className={styles.timer}>
                            <Icon name="timer" size={32} />
                            <RoundTimer startedAt={game.startedAt} className="code" />
                        </p>
                    )}
                </div>

                <div
                    ref={boardRef}
                    className={styles.board}
                    style={
                        { "--cols": cols, "--rows": Math.ceil(total / cols) || 1 } as CSSProperties
                    }
                >
                    {game.aliases.map((alias, i) => (
                        <AliasCard
                            key={alias.id}
                            alias={alias}
                            index={i}
                            colors={playerColors(playerHue(baseHue, i), dark)}
                            canEliminate={isHost}
                            onEliminate={() =>
                                eliminateAlias({
                                    code: id,
                                    aliasId: alias.id,
                                })
                            }
                        />
                    ))}
                </div>
            </main>
        </div>
    );
}

type Avatar = {
    shape: ShapeName;
    fill: string;
    ink: string;
    spin?: number;
    content: ReactNode;
};

function AliasCard({
    alias,
    index,
    colors,
    canEliminate,
    onEliminate,
}: {
    alias: Infer<typeof aliasSchema>;
    index: number;
    colors: ReturnType<typeof playerColors>;
    canEliminate: boolean;
    onEliminate: () => void;
}) {
    const [hover, setHover] = useState(false);
    const previewing = canEliminate && hover;
    const out = alias.eliminated;

    // The avatar previews what a tap will do: ✕ to eliminate, undo to bring back
    let avatar: Avatar;
    if (previewing) {
        avatar = {
            shape: "circle",
            fill: "var(--on-container)",
            ink: "var(--container)",
            content: <Icon name={out ? "undo" : "close"} className={styles.avatarIcon} />,
        };
    } else if (out) {
        avatar = {
            shape: "circle",
            fill: "var(--surface-container-highest)",
            ink: "var(--on-surface-variant)",
            content: <Icon name="close" className={styles.avatarIcon} />,
        };
    } else {
        avatar = {
            shape: playerShape(index),
            fill: colors.accent,
            ink: colors.onAccent,
            spin: 24 + (index % 3) * 8,
            content: <span className={styles.initial}>{alias.name.trim().charAt(0)}</span>,
        };
    }

    return (
        <button
            type="button"
            onClick={canEliminate ? onEliminate : undefined}
            onPointerEnter={() => setHover(true)}
            onPointerLeave={() => setHover(false)}
            onFocus={() => setHover(true)}
            onBlur={() => setHover(false)}
            aria-pressed={canEliminate ? out : undefined}
            aria-label={
                canEliminate ? `${alias.name}: ${out ? "bring back" : "eliminate"}` : undefined
            }
            className={cx(
                styles.card,
                "pop",
                canEliminate && styles.interactive,
                out && styles.out,
            )}
            style={
                {
                    "--player-container": colors.container,
                    "--player-on-container": colors.onContainer,
                    animationDelay: `${index * 50}ms`,
                } as CSSProperties
            }
        >
            <span className={styles.inner}>
                <Shape
                    shape={avatar.shape}
                    color={avatar.fill}
                    spin={avatar.spin}
                    className={styles.avatar}
                    style={{ color: avatar.ink }}
                >
                    {avatar.content}
                </Shape>
                <span className={styles.name}>{alias.name}</span>
            </span>
        </button>
    );
}
