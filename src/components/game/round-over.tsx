import { Authenticated, useMutation, useQuery } from "convex/react";
import type { CSSProperties } from "react";
import { Link } from "wouter";
import { api } from "@convex/_generated/api";
import { GameHeader } from "@/components/game-header";
import { Icon } from "@/components/icon";
import { Shape } from "@/components/shape";
import { authClient } from "@/lib/auth-client";
import { formatDuration } from "@/lib/format";
import { SHAPE_NAMES, type ShapeName } from "@/lib/shapes";
import { useShapeCycle } from "@/lib/use-shape-cycle";
import styles from "./round-over.module.css";

// Roles that stay vivid against primary-container in light and dark
const CONFETTI_ROLES = ["primary", "tertiary", "tertiary-container"];

const CONFETTI = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    shape: SHAPE_NAMES[(i * 7) % SHAPE_NAMES.length],
    style: {
        "--left": `${(i * 2.83 + 1.5) % 100}%`,
        "--delay": `${((i * 0.17) % 3).toFixed(2)}s`,
        "--duration": `${(3.2 + (i % 5) * 0.45).toFixed(2)}s`,
        "--size": `${14 + (i % 4) * 7}px`,
        color: `var(--${CONFETTI_ROLES[i % CONFETTI_ROLES.length]})`,
    } as CSSProperties,
}));

const WINNER_SHAPES: ShapeName[] = ["burst", "cookie12", "flower", "sunny", "clover8", "softBurst"];

export default function RoundOver({ id }: { id: string }) {
    const game = useQuery(api.games.getGame, { code: id });
    const user = authClient.useSession();
    const newRound = useMutation(api.games.newRound);
    const updateGameState = useMutation(api.games.updateGameState);
    const shape = useShapeCycle(WINNER_SHAPES, 1800);

    if (!game) return null;

    const winner = game.aliases.find((alias) => !alias.eliminated);
    const isHost = user.data?.user?.id === game.hostId;

    return (
        <div className={styles.page}>
            <div aria-hidden className={styles.confetti}>
                {CONFETTI.map((p) => (
                    <div key={p.id} className={styles.piece} style={p.style}>
                        <Shape shape={p.shape} />
                    </div>
                ))}
            </div>

            <GameHeader>
                <span className="chip code">{id}</span>
            </GameHeader>

            <main className={styles.main}>
                <p className={`headline ${styles.kicker} enter`}>Last alias standing</p>

                {winner && (
                    <Shape shape={shape} spin={36} color="var(--primary)" className={styles.winner}>
                        <h1 className={styles.name}>{winner.name}</h1>
                    </Shape>
                )}

                <p className={`headline ${styles.wins} enter`} style={{ animationDelay: "500ms" }}>
                    wins round {game.round}
                    {game.startedAt && game.endedAt && (
                        <> in {formatDuration(game.endedAt - game.startedAt)}</>
                    )}
                </p>

                <Authenticated>
                    {isHost && (
                        <div
                            className={`${styles.actions} enter`}
                            style={{ animationDelay: "700ms" }}
                        >
                            <Link
                                href="/"
                                className="btn btn-tonal"
                                onClick={() =>
                                    updateGameState({
                                        code: id,
                                        state: "inactive",
                                    })
                                }
                            >
                                <Icon name="home" />
                                Home
                            </Link>
                            <button
                                type="button"
                                className="btn btn-filled"
                                onClick={() => newRound({ code: id })}
                            >
                                <Icon name="replay" />
                                Play again
                            </button>
                        </div>
                    )}
                </Authenticated>
            </main>
        </div>
    );
}
