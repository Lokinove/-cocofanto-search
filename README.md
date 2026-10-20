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


## v7 fixes
- Fixed the new-tab search field/buttons being covered by the empty iframe host.
- Restored the brighter Cocofanto liquid-prism background treatment from the earlier UI.
- Made the browser chrome, tabs and upper address/search bar translucent so they blend into the Cocofanto background.
- Added explicit Enter-key bindings for both search fields.
- Kept active website frames interactive while the empty frame host no longer intercepts clicks.


## v8 performance pass
This build keeps the v7 appearance and browser tabs. Performance changes are limited to ordinary loading/hosting optimization:
- Reuses a live browser iframe when navigating within the same tab instead of destroying and recreating it.
- Sets the real proxied URL before a new iframe is inserted, eliminating an unnecessary about:blank navigation.
- Deduplicates simultaneous frame-creation work for a tab.
- Reuses an existing service-worker registration when available.
- Preloads the remaining UV runtime files used by the first proxied navigation.
- Ships Brotli and gzip copies of the large local UV runtime and serves them when supported.
- Keeps inbound HTTP connections alive longer and prefers IPv4 first to avoid some hosting/DNS stalls.
- Does not add filter-evasion, traffic hiding, or DevTools concealment.

The biggest local file is uv.bundle.js; precompression substantially reduces its first-download transfer size when the hosting path does not already compress it. Remote-site speed still depends on the target site, hosting route, and Bare/UV processing.
