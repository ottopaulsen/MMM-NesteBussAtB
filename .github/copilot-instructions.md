# Copilot Instructions for MMM-NesteBussAtB

## Project Overview

This is a [MagicMirror²](https://github.com/MagicMirrorOrg/MagicMirror/) module that displays upcoming bus departures from **AtB** (Trondheim, Norway public transit) for selected stops.

- MagicMirror documentation: https://docs.magicmirror.builders/ — see especially **Module Development**
- Other modules by the same author for code style reference: [MMM-Tibber](https://github.com/ottopaulsen/MMM-Tibber), [MMM-MQTT](https://github.com/ottopaulsen/MMM-MQTT), [MMM-MessageToMirror](https://github.com/ottopaulsen/MMM-MessageToMirror)

## Architecture

The module follows the standard MagicMirror² two-process pattern:

- **`MMM-NesteBussAtB.js`** — Frontend module running in the browser (Electron). Handles DOM rendering, config defaults, and socket communication with the helper.
- **`node_helper.js`** — Backend Node.js helper. Fetches data from the transit API and sends it to the frontend via socket notifications.
- **`NesteBussAtB.css`** — Module styles, loaded via `getStyles()`.

The `t.js`, `t1.js`, `ta.js`, `tb.js` files are local scratch/experimentation scripts, not part of the module.

## Tech Stack

- Always use the latest stable version of MagicMirror².
- Use the latest version of Node.js that is approved/supported by MagicMirror².
- npm dependencies may be updated to latest compatible versions, but **do not use packages with known serious security vulnerabilities**.

## Permissions & Git

- **Do not install npm modules** without explicit permission for each install.
- **Do not run any git write commands**: no `git add`, `git commit`, `git push`, branch creation, or pull requests. Read-only git commands (`git diff`, `git log`, `git status`) are fine.

## Code & Documentation Style

- Structure modules and write code the same way as the author's other modules (MMM-Tibber, MMM-MQTT).
- Write `README.md` documentation in the same style as existing module READMEs.

## Config

All user-facing settings must be exposed in the module's `config` block and documented in `README.md` in the same format as existing modules. Example structure:

```js
{
    module: 'MMM-NesteBussAtB',
    position: 'upper_third',
    config: {
        stopIds: [16011496, 16010496], // See https://www.atb.no/holdeplassoversikt/
        maxCount: 2,
        maxMinutes: 45,
        stacked: true
        // ... other options
    }
}
```

## CSS Overrides

Users must be able to override CSS for anything displayed on screen. Document the available CSS class names and how to override them in `README.md`. CSS class names in this module follow the `atb-*` pattern (e.g., `atb-number`, `atb-from`, `atb-to`).
