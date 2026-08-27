# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page Halloween party invitation with an RSVP register. Three files, no build step, no dependencies, no tests:

- [index.html](index.html) — the whole front end: inline `<style>`, inline SVG decor, markup, and one inline `<script>`. Deployed to GitHub Pages as-is.
- [code.gs](code.gs) — Google Apps Script bound to a Google Sheet, deployed as a web app. The entire backend.
- [INSTRUCTIONS.md](INSTRUCTIONS.md) — end-user setup guide (create sheet → deploy Apps Script → set `apiUrl`). Written for a non-technical host; keep its tone plain and step-by-step if you edit it.

## Working on it

There is nothing to build or install. Open [index.html](index.html) directly in a browser, or `python3 -m http.server` in the repo root and visit it — either works, since it is plain ES5-with-`async` JavaScript with no modules.

With `CONFIG.apiUrl` empty the page runs in **preview mode**: RSVPs are held in an in-memory `localEntries` array, the count is computed locally, and a red banner explains the state. This is the normal way to work on the UI without a backend. Set `apiUrl` to exercise the real path.

Deployment is `git push` for the page (GitHub Pages serves `main` at root). Apps Script changes require **Deploy → Manage deployments → Edit → Version: New** in the Apps Script editor — saving alone leaves the old version live, which is the most common "my change did nothing" cause.

## Architecture

**Frontend state lives in module-scope vars** inside the single IIFE in [index.html:342](index.html#L342): `count`, `picked` (diet chips), `myEntry`, `entries` (host view only), `isHost`, `adminKey`, `preview`. Rendering is a set of hand-written `render*()` functions that write `innerHTML`; there is no framework and no reactivity — after mutating state, call the matching `render*()` yourself (`renderCount()`, `renderMine()`, `adminPanel()`).

**All interpolated values must go through `esc()`** ([index.html:355](index.html#L355)). Guest names, notes and diet text are user input rendered via `innerHTML` throughout, including in the host panel.

**Two API shapes**, both against the same Apps Script URL:
- `apiGet("action=count")` — public, returns `{ok, count}`; polled every 60s ([index.html:745](index.html#L745)).
- `apiGet("action=list&key=…")` — host only; the pass phrase is checked server-side, so it never ships in the page source.
- `apiPost({action:"rsvp"|"delete", …})` — writes. Sent as `Content-Type: text/plain` deliberately: Apps Script cannot answer a CORS preflight, so any change to a JSON content type will break posting. Both fetches use `redirect:"follow"` because Apps Script 302s to `script.googleusercontent.com`.

**Guest identity** is a random id in `localStorage` (`guest-id`), echoed back on every POST. `write()` in [code.gs:107](code.gs#L107) upserts on that id, so a guest editing their reply updates their row instead of appending. `guest-reply` caches the last submission so returning guests see their entry without a fetch. Clearing site data makes a guest anonymous again — that is accepted behaviour, not a bug.

**Field names differ between the sheet and the wire format**, and `rows()` in [code.gs:25](code.gs#L25) is the translation layer:

| Sheet column | JSON field | Notes |
|---|---|---|
| `reply` | `status` | `"Attending"`/`"Declined"` ↔ `"yes"`/`"no"` |
| `allergies` | `diets` | comma-joined string ↔ array of chip labels |
| `notes` | `diet` | free-text allergy field |
| `message` | `note` | message to the host |

Changing `COLUMNS` means changing the sheet header row, `rows()`, and `write()` together — existing spreadsheets already have the old header.

## Conventions

`CONFIG` at [index.html:325](index.html#L325) is the host-facing edit surface — party title, date, dress code, `apiUrl`. It is deliberately at the very top of the script with a loud comment block; keep it there and keep it flat and commented, since non-technical users edit it through the GitHub web editor.

`PASS_PHRASE` and `SHEET_NAME` at [code.gs:7](code.gs#L7) serve the same role in the backend. `ChangeMe2026` is placeholder, not a secret.

The UI copy is deliberate: understated, gothic, British-inflected English ("Sign the register", "you will be missed"). Errors are written as full sentences to the guest, never as codes. Match that voice in any new strings, and keep the privacy promise the copy makes — guests see only the count, never each other's names or allergies.

Motion respects `prefers-reduced-motion` via the `reduced` flag ([index.html:351](index.html#L351)), which gates the count roll-up, scroll reveals, and smooth scrolling. New animation should check it too.
