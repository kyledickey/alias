import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { type CSSProperties, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AuthButtons } from "@/components/auth-buttons";
import Footer from "@/components/footer";
import CreateGameButton from "@/components/game/create-game-button";
import { Icon } from "@/components/icon";
import { Shape } from "@/components/shape";
import { Wordmark } from "@/components/wordmark";
import { FAQ, HOW_TO_PLAY_STEPS, TAGLINE, TITLE } from "@/content";
import type { ShapeName } from "@/lib/shapes";
import { HOME_HUE, useThemeHue } from "@/lib/theme";
import { useShapeCycle } from "@/lib/use-shape-cycle";
import styles from "./home.module.css";

const STEP_SHAPES: ShapeName[] = [
    "cookie9",
    "clover4",
    "sunny",
    "gem",
    "flower",
    "cookie4",
    "burst",
    "pentagon",
];

const ROLES = ["primary", "tertiary", "secondary"] as const;

// Graphic shapes bleeding off the hero's edges, each morphing on a loop
const HERO_SHAPES: { shapes: ShapeName[]; color: string; spin: number }[] = [
    { shapes: ["cookie12", "flower", "cookie9"], color: "var(--tertiary-fixed-dim)", spin: 60 },
    { shapes: ["clover4", "cookie4", "clover8"], color: "var(--primary-fixed-dim)", spin: -48 },
    { shapes: ["sunny", "softBurst", "gem"], color: "var(--tertiary-fixed)", spin: 36 },
    {
        shapes: ["burst", "pentagon", "sunny"],
        color: "var(--on-tertiary-fixed-variant)",
        spin: -24,
    },
];

function HeroShape({ item, index }: { item: (typeof HERO_SHAPES)[number]; index: number }) {
    const shape = useShapeCycle(item.shapes, 3600, 1400 + index * 900);
    return (
        <Shape
            shape={shape}
            spin={item.spin}
            color={item.color}
            className={styles.heroShape}
            style={{ "--i": index } as CSSProperties}
        />
    );
}

export default function Home() {
    useThemeHue(HOME_HUE);
    useEffect(() => {
        document.title = TITLE;
    }, []);
    const [gameCode, setGameCode] = useState("");
    const [, navigate] = useLocation();

    const handleJoinGame = (e: React.FormEvent) => {
        e.preventDefault();
        if (gameCode.trim()) {
            navigate(`/game/${gameCode.trim()}`);
        }
    };

    return (
        <div className={styles.page}>
            <section className={styles.hero}>
                <div aria-hidden className={styles.shapes}>
                    {HERO_SHAPES.map((item, i) => (
                        <HeroShape key={item.color} item={item} index={i} />
                    ))}
                </div>

                <div className={styles.heroText}>
                    <h1>
                        <Wordmark size="hero" />
                        <span className="sr-only"> · The fake name party game</span>
                    </h1>
                    <p className={`headline ${styles.tagline} enter`}>{TAGLINE}</p>
                </div>

                <div className={`${styles.actions} enter`} style={{ animationDelay: "250ms" }}>
                    <form onSubmit={handleJoinGame} className={styles.join}>
                        <label className="field">
                            <input
                                className="code"
                                placeholder="Game code"
                                aria-label="Game code"
                                autoComplete="off"
                                autoCapitalize="characters"
                                spellCheck={false}
                                value={gameCode}
                                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                            />
                            <button
                                type="submit"
                                aria-label="Join game"
                                className="btn btn-filled btn-icon"
                                disabled={!gameCode.trim()}
                            >
                                <Icon name="arrow_forward" />
                            </button>
                        </label>
                    </form>

                    <span className={styles.or}>or</span>

                    {/* Fixed height so nothing jumps while the session loads */}
                    <div className={styles.host}>
                        <AuthLoading>
                            <div aria-hidden className={`skeleton ${styles.hostSkeleton}`} />
                        </AuthLoading>
                        <Authenticated>
                            <CreateGameButton />
                        </Authenticated>
                        <Unauthenticated>
                            <AuthButtons />
                        </Unauthenticated>
                    </div>
                </div>
            </section>

            <main className={styles.main}>
                <section className={styles.how}>
                    <h2 className={`headline ${styles.howTitle}`}>How to play</h2>
                    <ol className={styles.steps}>
                        {HOW_TO_PLAY_STEPS.map((text, i) => {
                            const role = ROLES[i % ROLES.length];
                            return (
                                <li key={text} className={styles.step}>
                                    <Shape
                                        shape={STEP_SHAPES[i]}
                                        color={`var(--${role}-container)`}
                                        className={styles.stepShape}
                                        style={{ color: `var(--on-${role}-container)` }}
                                    >
                                        <span className={styles.stepNum}>{i + 1}</span>
                                    </Shape>
                                    <p>{text}</p>
                                </li>
                            );
                        })}
                    </ol>
                </section>

                <section className={styles.faq}>
                    <h2 className={`headline ${styles.howTitle}`}>Questions</h2>
                    <div className={styles.faqList}>
                        {FAQ.map(({ q, a }) => (
                            <details key={q} className={styles.qa}>
                                <summary>
                                    <h3>{q}</h3>
                                    <Icon name="add" className={styles.qaIcon} />
                                </summary>
                                <p>{a}</p>
                            </details>
                        ))}
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
