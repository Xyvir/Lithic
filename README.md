Yet Another PKMS

# Lithic Project Roadmap

## Phase 0: The 'Qharbox' Component (The UI Innovation)

* **Goal:** Build a standalone, reusable Svelte/Prosemirror component for annotatable code.
* **Tech:** Prosemirror (likely via Milkdown) and an SVG overlay.
* **Core Features:**
    * A standard Prosemirror code block.
    * A precisely positioned SVG overlay that accepts pen/mouse/touch input.
    * The core logic to map coordinates on the SVG layer to character/line positions within the code block.
    * A data model for serializing these SVG annotations alongside the code.

## Phase 1: Lithic v1.0 (The Core MVP)

* **Goal:** A fast, functional, local-first editor built around your "Lith" file concept.
* **Features:**
    * **Integrates your 'Qharbox' component** as the primary way to display and edit code blocks.
    * **Tech Stack:** Svelte + Tanstack Virtual.
    * **Core Concept:** Pure client-side, local-first webapp.
    * **Backend:** Uses Quarkdown (or markdown) as Backend; with front matter.
    * **"Lith" Structure:**
        * Base units are "liths" (long monolith markdown files).
        * Each H1 creates its own separate Milkdown element (using Tanstack Virtual for performance).
        * Daily Journal as a 1-year lith.
    * **Editor Experience:**
        * In-place, infinite-scroll, folder-aware WSYWIG Editor.
        * Supports basic slash commands, page refs (within the same lith), and *read-only* page-embeds (transclusion).

## Phase 2: Lithic v2.0 (The Power-Ups)

* **Goal:** Add major, distinct features to the stable v1.0. These are "sub-projects" you can tackle one at a time.
* **Features (in no particular order):**
    * **Notebook-style runnable codeblocks:** This is the *runtime* part. You'd be adding a "run" button to your Qharbox component that executes the code (via Pyodide, a kernel, etc.) and displays the output.
    * **Git Integration:** For syncing and version control.
    * **Companion SSG:** The static site generator to export liths to a non-editable website.
    * **Forms Data Entry (PDFs):** The PDF generation/ingestion feature.

## Phase 3: Lithic v3.0+ (The "Ambition Traps")

* **Goal:** The extremely difficult, long-term ambitions that require deep computer science work.
* **Features:**
    * **"Magic 'flat-file' realtime collab"**: Requires implementing CRDTs or OT.
    * **"Embeds' are bi-directionally synced deep copies"**: This is block-level real-time collab, which is just as hard.
    * `*.state` yaml files for undo history/collab state (this is the *implementation* of the collab feature).
