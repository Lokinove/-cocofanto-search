# Cocofanto Clean Replacement

Complete replacement package.

Included: current Cocofanto UI, Aiden Tutoring outer title/favicon, existing UV/Bare routing, GoDaddy runtime fix, and a dedicated Geometry Dash Games tab restored from the original Utopia ZIP.

Removed: old Utopia icons/logos, old Schoology/Classroom/Clever/Khan/Drive/Gmail assets, legacy Utopia pages/CSS/JS, unrelated deployment configs, and all old games except Geometry Dash.

Replace the repository contents with this ZIP's contents (do not nest the folder), commit, push, Update Preview in GoDaddy, confirm Healthy, then Publish to Live.


## Geometry Dash upgrade
The old Utopia Geometry Dash files were replaced with a new self-contained HTML5 Canvas version:
- 20 deterministic levels
- cube + flight gameplay
- orbs and portals
- responsive controls
- stars, unlocks and best times stored locally
- no external assets, so it loads directly from the Cocofanto deployment


## Geometry Dash browser embed
The local Geometry Dash clone was removed.
The Games tab now loads Miniplay's published Geometry Dash embed:
`https://www.miniplay.com/embed/geometry-dash`

Miniplay explicitly publishes iframe embed code for this game.
Because this is an external embed, it requires internet access and will follow the user's normal network/filter policy.

## Fix
The previous iframe package accidentally still referenced the removed local Geometry Dash path.
This build correctly uses Miniplay's published Geometry Dash Online iframe:
https://www.miniplay.com/embed/geometry-dash-online


## Geometry Dash Lite iframe
The Games tab now loads:
https://geometrydash-lite.io/

This is a normal external iframe. If that site sends browser headers that disallow embedding
(e.g. X-Frame-Options or CSP frame-ancestors), the browser will refuse to display it.
