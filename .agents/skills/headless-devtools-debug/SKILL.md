# Headless DevTools Debug

Use this skill when a Vite or browser UI appears briefly and then turns blank,
when the DOM is empty after initial render, or when a visual issue only appears
after browser-side JavaScript runs. Do not rely on `curl` alone for these cases:
HTTP 200 only proves the HTML shell was served.

## Workflow

1. Start or reuse the relevant dev server.
   - Console app: `pnpm -F @lincyaw/console dev`
   - The console dev server usually listens on `https://localhost:3323/`.
2. Run the probe script against the exact route that fails:

   ```bash
   node .agents/skills/headless-devtools-debug/scripts/probe-devtools.mjs \
     https://localhost:3323/trajectories
   ```

   To also save a screenshot:

   ```bash
   node .agents/skills/headless-devtools-debug/scripts/probe-devtools.mjs \
     https://localhost:3323/trajectories \
     --viewport 1440x1000 \
     --screenshot /tmp/aegis-trajectories.png
   ```

3. Read the JSON output in this order:
   - `state.rootChildren` and `state.rootHtmlLength`: if both are `0`, React
     likely unmounted after a runtime exception.
   - `exceptions`: uncaught runtime errors with source URL, line, column, and
     stack.
   - `consoleErrors`: browser console errors, including React component stack
     messages.
   - `networkErrors`: failed browser network requests. Treat app-critical API
     failures differently from harmless browser probes.
4. Patch the smallest failing source location, then rerun the probe from a clean
   Chrome profile. Stale exceptions from an already-open tab can be misleading.

## Notes

- The script launches its own headless Chrome profile and kills it after the
  probe, so it does not depend on or mutate the user's normal browser profile.
- It passes `--ignore-certificate-errors` because the Vite dev server uses local
  HTTPS in this repo.
- It passes `--disable-extensions` and selects a real `page` target so enterprise
  or browser extension background pages do not pollute the capture.
- Use `--viewport 390x844` for mobile and `--viewport 1440x1000` for desktop.
- If Chrome is not installed at `/Applications/Google Chrome.app`, pass
  `--chrome /path/to/chrome`.
- Prefer this workflow before visual guessing whenever the symptom is "renders,
  then blank".
