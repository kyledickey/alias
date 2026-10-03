import { cx } from "@/lib/cx";
import { Shape } from "./shape";
import styles from "./wordmark.module.css";

// "ı" is a dotless i; the tittle is a spinning M3 shape instead.
const LETTERS = ["a", "l", "ı", "a", "s"];

export function Wordmark({ size = "sm" }: { size?: "sm" | "hero" }) {
    return (
        <span className={cx(styles.wordmark, styles[size])} aria-label="alias" role="img">
            {LETTERS.map((letter, i) => (
                <span
                    key={`${letter}${i}`}
                    aria-hidden
                    className={styles.letter}
                    style={{ animationDelay: `${i * 70}ms` }}
                >
                    {letter}
                    {letter === "ı" && <Shape shape="sunny" spin={8} className={styles.tittle} />}
                </span>
            ))}
        </span>
    );
}
