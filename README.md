# Lithic
Yet Another PKMS

Design Goals:
- Pure client-side, local-first webapp
- Modular Design. (passing user control and state change monads between modules)
- In-place Infinite-scroll, folder-aware WSYWIG Editor (toggle-able plaintextmode)
- Uses Quarkdown (or markdown) as Backend; with front matter.
- Built on Milkdown, Svelte, and Tanstack Virtual
- supports slashcommands and pagerefs, and page-embeds.
- 'embeds' are bi-directionally synced deep copies; allowing for "clean seperation" when needed. 
- Base units are "liths" long, long monolith markdown files delimited by # H1 (pages) and a corresponding 'data' folder (assets and an optional tbd database)
  - Liths are intended to correspand with 'concrete' items; a projects, a subtopic, a hobby, a class, etc.
  - Liths should natrually evolve into some kind of singular media; a book, a blog, a help knowledgebase, etc. 
- Each H1 creates it's own seperate Milkdown element
- Daily Jouranly is 1 year lith
- Uses plaintext *.state yaml files for undo history and magic 'flat-file' realtime collab.
- Supports notebook-style runnable codeblocks 
- companion SSG that creates 1to1 non-editble versions of the editable wsywig experience; export lith to SSG diect menu option.
- Git integration? for syncing and version control
- For Forms Dataentry? Supports generating form-fillable PDFs and ingesting them.
  
