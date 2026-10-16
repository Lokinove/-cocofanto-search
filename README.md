# Cocofanto Browser Tabs + Performance v6

This build keeps the existing Ultraviolet/Bare routing but replaces the Cocofanto browsing view with a browser-style shell inspired by the supplied reference image.

## Browser UI
- Cocofanto-styled tab strip
- Up to 8 tabs
- Address/search bar always visible
- Back, forward, reload and home controls
- Fullscreen button
- Games and Settings shortcuts
- Ctrl/Cmd+L, Ctrl/Cmd+T, Ctrl/Cmd+W, Ctrl/Cmd+R and Alt+Left/Right shortcuts
- Blank/new-tab page retains the Cocofanto mascot/search design
- Session tab metadata is restored after a refresh

## Performance changes
- `/` now serves `main.html` directly, removing the previous outer iframe layer
- UV service worker is pre-warmed immediately
- UV/image assets receive long browser cache headers
- HTML and the service worker remain revalidated so deployments update correctly
- Existing page frames stay alive while switching tabs up to the configured live-tab limit
- Older inactive frames hibernate when that limit is exceeded
- Default live limit: 4 on normal devices, 2 on low-power devices
- Geometry Dash remains lazy-loaded only when Games is opened
- Server keep-alive timeouts are tuned to reduce repeated connection setup

## Important
These changes reduce Cocofanto's own UI/setup overhead. Remote page speed still depends on the destination site, network latency, and the Bare/proxy route.

This build does not add DevTools hiding, URL cloaking, or filter-evasion behavior.
