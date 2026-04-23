\# Agent Directives for Lithic \& Antigravity IDE



\## 1. Antigravity \& WebDAV Context

This workspace uses the Antigravity extension to interface with a remote WebDAV server. 



\* \*\*Sync Awareness\*\*: Files are synced via WebDAV. Do not suggest scripts that perform bulk local file system operations without acknowledging that the Antigravity sync provider must handle the actual upload/download.

\* \*\*TiddlyWiki Format\*\*: Most files in this workspace are `\*.lith` files. (explained below) When editing, you MUST preserve the header block (e.g., title, tags, created, modified) at the top of the file.

\* \*\*Remote Latency\*\*: File I/O is slower than local disk. Prioritize methods that use the IDE's Search Index rather than external grep tools that trigger unnecessary WebDAV traffic.

\* \*\*Conflict Resolution\*\*: Always check if the Antigravity status bar shows 'Synced' before assuming the remote WebDAV state matches the local editor.



\## 2. Remote WebDAV Execution Protocol

\*\*Trigger:\*\* Active document URI matches `webdav://<user>:<password>@<domain.app>/<filename>?ssl=1\&base=<basepath>/`



\*\*Strict Limitations:\*\*

\* \*\*NO NATIVE FILE APIs:\*\* Never use built-in tools (e.g., `view\_file`) on WebDAV URIs. They will fail.

\* \*\*CURL ONLY:\*\* Translate the URI to `https://<domain.app>/<basepath>/<filename>` and use shell/PowerShell `curl.exe`.



\*\*Execution Steps:\*\*

1\. \*\*Read/Inspect (Preferred):\*\* For full file inspection, download to a local workspace path first to avoid terminal truncation:
   \* `curl.exe -s -u "<user>:<password>" "https://..." -o ./temp_inspect.lith`
   \* Then use `view\_file` on the local copy.

2\. \*\*Read (Partial/Quick):\*\* `curl.exe -s -u "<user>:<password>" "https://..." | Select-Object -First 20`

3\. \*\*Edit/Append:\*\*
&#x20;  \* \*Download:\* `curl.exe -s -u "<user>:<password>" "https://..." -o ./temp/<filename>`
&#x20;  \* \*Modify:\* Write changes to `./temp/temp.txt`, then append: `cmd.exe /c "type ./temp/temp.txt >> ./temp/<filename>"`
&#x20;  \* \*Upload:\* `curl.exe -s -u "<user>:<password>" -T ./temp/<filename> "https://..."` (Use `-T` to avoid OS-level character conversion).
&#x20;  \* \*Cleanup:\* Delete all temp files in `./temp/`.



\## 3. `.lith` File Anatomy \& Streams Formatting

A `.lith` file contains multiple tiddlers appended together. Each tiddler strictly follows this structure. 



\*\*A. Metadata Block (Headers)\*\*

\* Must be at the very top, consisting of lowercase `key: value` pairs (one per line, alphabetical order preferred).

\* \*\*Mandatory Fields:\*\* `title` (must be unique), `created`/`modified` (format: YYYYMMDDHHMMSS000), and `stream-type: default`.

\* \*\*Streams Relationships:\*\*

&#x20; \* `parent`: Exact title of the parent tiddler.

&#x20; \* `stream-list`: Space-separated children (e.g., `\[\[Child 1]] \[\[Child 2]]`).



\*\*B. The Delimiter\*\*

\* Exactly \*\*one blank line\*\* (two consecutive newlines) immediately following the final metadata field.



\*\*C. The Body \& Separator\*\*

\* The raw payload follows the delimiter.

\* Each distinct tiddler must be separated by exactly `⁂⁂⁂` (triple-asterism) on its own line. Ensure UTF-8 encoding and no trailing whitespace.

\* \*\*Spacing Patterns:\*\*

&#x20; \* \*Tiddlers WITH Body Content:\* The `⁂⁂⁂` separator follows the body immediately without an extra blank line.

&#x20; \* \*Empty Body (Parent/Journal):\* The body must contain a single newline, resulting in a triple-newline gap before the `⁂⁂⁂` separator.

