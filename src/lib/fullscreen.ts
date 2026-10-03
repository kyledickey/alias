export function enterFullscreen() {
    document.documentElement.requestFullscreen?.().catch(() => {});
}

export function exitFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}
