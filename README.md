# HOI4 Mod Studio

A visual mod creator/editor for **Hearts of Iron IV**. Build focus trees, people, events, decisions, special mechanics, technologies and divisions with clicks instead of code. It then exports a ready-to-play mod.

## Download (Windows)

Go to the repository's **Releases** page and download the newest build:

- `HOI4-Mod-Studio-portable.exe` — double-click to run, no install needed.
- `HOI4-Mod-Studio-Setup.exe` — normal installer.

The app isn't code-signed, so Windows SmartScreen may warn you. Click **More info → Run anyway**.

Every push to GitHub builds a fresh `.exe` automatically (see `.github/workflows/build.yml`).

## What it can do

| Section | What you can make |
|---|---|
| **Countries** | Create **brand-new countries**: tag, name/adjective, flag (auto-converted to the game's .tga sizes), map colour, unit/portrait style, starting states and capital (or just cores, to release later), ruling party, popularity, stability and more — plus different names and flags per ideology. |
| **Focus Trees** | Drag-and-drop focus tree editor: add, move and link focuses ("requires", "requires one of", mutually exclusive). Set rewards and conditions by picking from a list. **Import a vanilla tree** (`common/national_focus/*.txt` + its localisation) to edit or completely overhaul it. |
| **People** | Country leaders, advisors / high command, generals, field marshals and admirals. Upload any picture as a portrait (auto-resized and converted to `.dds`). Give them vanilla or custom traits. |
| **Traits** | Leader/advisor traits and general/admiral traits with exact bonuses. Import a vanilla traits file to change vanilla numbers. |
| **National Spirits** | Ideas with bonuses and custom pictures. |
| **Events** | Country and news events with a live preview. They can fire from a focus or decision, on a date, or when conditions are met. |
| **Decisions** | Decision tabs with decisions and missions (timers), costs, cooldowns and banner pictures. |
| **Special Mechanics** | **Balance of Power** sliders (like the Soviet/Spanish ones). **Custom meters** like Stalin's paranoia or US congress support, with stages that give bonuses, monthly drift, events at max/min, and their own decision tab. |
| **Technology** | Visual tech tree editor. Add techs to any research tab, limit them to certain countries, unlock equipment/units, and set **starting techs per country or for all countries**. You can also add new tech tabs (experimental). |
| **Units & Equipment** | Custom equipment (stats, cost, resources). Battalions and **support companies** (including HQ-style companies) that use your equipment. Import **3D models** (`.mesh`) and use them on battalions. |
| **Division Designer** | 5×5 template grid plus support column, with live stats. Place divisions on the map at game start, with an equipment stockpile to fill them. |

Wherever you see **+ Add effect** or **+ Add condition**, you pick from a list (e.g. "Build civilian factory", "Fire country event", "Shift balance of power") and fill in the blanks. You can still type HOI4 script by hand.

## Using it

1. **Overview**: name your mod. **Countries**: add the countries you're changing or create new ones.
2. Build your content in the other sections. Work autosaves, and **Save** writes a project file you can reopen later.
3. **Export mod**: choose `Documents/Paradox Interactive/Hearts of Iron IV/mod`.
4. Open the HOI4 launcher, add the mod to a playset, and play.

Testing tips: start HOI4 with `-debug` and check `Documents/Paradox Interactive/Hearts of Iron IV/logs/error.log`. In the console, `event mymod.1` fires an event and `focus.autocomplete` finishes focuses quickly.

## Developing

```bash
npm install
npm start          # run the desktop app
npm test           # parser + exporter checks
npm run dist:win   # build the Windows .exe (on Windows)
```

The UI is plain HTML/JS in `app/`. You can also open it in a browser (`npx serve app`), where exports download as a `.zip`. `electron/` holds the desktop wrapper that writes straight into your mod folder.

## Known limits

- New **tech tabs** need GUI work in HOI4. The exporter writes a basic one, but you may need to add the tab button to `interface/countrytechtreeview.gui`. Putting custom techs in vanilla tabs always works.
- Imported **3D models** are static (no animations generated).
- Division stats in the designer are approximate.
