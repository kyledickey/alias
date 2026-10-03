import { cx } from "@/lib/cx";

// Material Symbols Rounded. Add new names to the icon_names list in index.html.
export type IconName =
    | "add"
    | "arrow_back"
    | "arrow_forward"
    | "celebration"
    | "check"
    | "check_circle"
    | "close"
    | "error"
    | "fullscreen"
    | "fullscreen_exit"
    | "home"
    | "play_arrow"
    | "replay"
    | "timer"
    | "undo";

export function Icon({
    name,
    filled = false,
    size,
    className,
}: {
    name: IconName;
    filled?: boolean;
    size?: number;
    className?: string;
}) {
    return (
        <span
            aria-hidden
            className={cx("icon", filled && "icon-filled", className)}
            style={size ? { fontSize: size } : undefined}
        >
            {name}
        </span>
    );
}
