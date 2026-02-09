# Lithic PKMS

**A Portability-First Outliner Knowledgebase**

<p align="center">
  <img src="mstile-150x150.png" alt="Lithic Icon" width="150"/>
</p>

[**Try it here: lithic.uk**](https://lithic.uk)

Lithic is a bespoke Personal Knowledge Management System (PKMS) built on the powerful **TiddlyWiki** engine, re-engineered for a modern academic and engineering workflow. It bridges the gap between the database flexibility of TiddlyWiki and the rapid, outlining experience of **Logseq**.

### The Core Philosophy

* **Logseq-Inspired, Markdown Native:**
    Lithic abandons traditional wikitext in favor of standard **Markdown**. This ensures a frictionless writing experience familiar to Logseq users, keeping your data portable and compatible with industry-standard editors.

* **Academic Rigor:**
    Designed as a digital lab bench, Lithic excels at managing complex project notebooks, typed research, and handwritten notes. It provides a cohesive environment for tracking creative or engineering projects from ideation to documentation.

* **Sane, Print-Ready PDFs:**
    Web-based knowledge bases often fail when physical media is required. Lithic prioritizes "paper-first" CSS, ensuring that your digital notes convert into clean, professional, and sane PDFs for homework submissions, lab reports, and archiving.

* **True Portability:**
    A single-file application that works **100% offline**. It lives on your local machine or thumb drive—no cloud dependency required.

---
*An extension of [TiddlyStudy](https://github.com/postkevone/tiddlystudy) based on [TiddlyWiki](https://tiddlywiki.com/).*

# Roadmap
1. Version 1 Released: 
- Lithic is packaged as a plugin
- Standardized Manual Build steps

Version 1.5 release: 
- includes overtype editor with syntax highlighting.
- Better mobile formatting.

Version 1.95 released:
- MAJOR Perfomance upgrade (default Tiddlystudy Backlink Pills were poorly optimized by using Regex)
- 'Anchors' plugin for stream templates.
- Calendar view & todo integration
- Bulkops Sidebar w/ savable filters (and a few smart defaults).
- "Time Spent" indicator.
- A few other cross-plugin teaks and improvments. 

Version 1.98 released:

Version 1.99 plans:
 - Image Handling improvements:
   - Paste image from clipboard into overtype
   - Draggable image resizer (resizer plugin)
   - resizable sidebar via resizer plugin. 

2. Version 2 plans:

- "Full-screen" long-from editor when clicking on bullet points.
- Simple UI Mode toggle. (Hide a lot of Tiddlywiki-specific UI, on by default.)
- Expanded Slashcommands
- Expanded Syntax Highlighting for Overtype?
- Upgrade default editor CodeMiorror6? (once it supports streams plugin)
- Include codemirror 6 for non-streams "edit mode"


3. Version 3 plans
- automate build pipeline
- Rust Backend for Launcher apps
- Multiplatform Launcher apps
- Failover webgui launcher for non-mac devices (TiddlyStow v2)
- Payload URL sharing

4. Version 4 plans:
- Integrated 3rd party syncing
- native e2ec p2p syncing via Iroh Docs?

  
