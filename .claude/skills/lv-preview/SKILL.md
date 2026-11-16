---
name: lv-preview
description: Use when the user runs /lv-preview or wants to see the current work running. Starts the Vite dev server from .claude/launch.json and checks it in the browser pane.
---

# /lv-preview

1. Start the server with `preview_start` `{name: "vite-dev"}` (port 5173). `hub-seed` (port 5174) is the alternative for hub work. Never start dev servers through Bash.
2. Read console messages and server logs for errors.
3. Navigate to the page that was changed (route from `src/pages/` or `App.jsx`) and check it with `read_page`; click through the changed interaction.
4. Take a screenshot as proof. If something is wrong, say what, and offer `/lv-edit`.
5. Leave the server running unless asked to stop it.

Skip the server if the change is not observable in the browser (scripts, rules, tests).
