import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/format";

/** Live elapsed time since the round started, synced from the server timestamp. */
export function RoundTimer({ startedAt, className }: { startedAt: number; className?: string }) {
    const [now, setNow] = useState(Date.now);
    useEffect(() => {
        const t = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(t);
    }, []);
    return (
        <time className={className} dateTime={`PT${Math.floor((now - startedAt) / 1000)}S`}>
            {formatDuration(now - startedAt)}
        </time>
    );
}
