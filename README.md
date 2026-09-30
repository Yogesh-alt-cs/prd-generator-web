# PRD Forge

Build "VibePRD", a local-first, browser-only web app that turns a guided 6-step brief into a developer-ready PRD package (four Markdown files), viewable in-app and downloadable as PDF and Meta JSON. There is no account, no backend and no server storage. Everything is stored in the browser.

## Tech stack

- React + TypeScript + Vite, Tailwind CSS, shadcn/ui, React Router

- react-markdown + remark-gfm for rendering

- jsPDF (with autoTable or html2canvas) for PDF export

- localStorage for settings and drafts, IndexedDB (via idb) for generated PRDs

- No emojis anywhere in the UI or generated output

## Visual design

- Font: Inter for UI, Outfit for headings

- Background #f5f5fa, surface white, primary #4f46e5, accent #06b6d4

- Rounded cards (radius 24px), pill buttons, soft borders, subtle shadows

- Dark mode support (system / light / dark), driven by a Seed color and Shape setting (rounded / sharp)

- Small uppercase tracking-wide indigo eyebrow labels above titles

- Max content width about 1100px, centered, generous whitespace

## Global layout

Top header:

- Left: eyebrow "YOU B TECH", wordmark "VibePRD", small muted tag "LOCAL-FIRST"

- Center: pill nav with Dashboard, Builder, Viewer, Settings. The active item has an indigo-tinted pill background.

- Right: "Tools" with an arrow-up-right icon (external link, configurable URL)

Routes: /tool/prdtool (Dashboard), /tool/prdtool/builder, /tool/prdtool/viewer, /tool/prdtool/settings

## 1. Dashboard

- Hero card with a tinted indigo background:

  - Eyebrow "YOU B TECH · VIBEPRD"

  - H1 "Build-ready product specs, locally."

  - Subtext "No account. No server storage. Export clean Markdown when your plan is ready."

  - Primary button "New PRD" on the right

- If no PRDs exist, show a dashed-border empty card: title "Start with a focused brief", text "Your draft and generated PRD stay in this browser until you remove them.", and an "Open Builder" button.

- If PRDs exist, replace the empty card with a list of saved PRDs. Each shows name, category, platform, created date, and Open in Viewer, Duplicate and Delete actions.

- Footer row: lock icon "Browser-only data", key icon "Optional BYO key", and a link "Local settings →" to Settings.

## 2. Builder (6-step wizard)

Header: eyebrow "PRD BUILDER", H1 "Make the first release clear.", right-aligned "Step X of 6". Below it, a 6-segment progress bar (filled indigo up to the current step) with labels: Platform, Stack, Style, Theme, Type, Brief. Footer: "Back" text button on the left (disabled on step 1) and a dark pill "Continue" button on the right. Autosave the draft to localStorage on every change and restore it on return.

Option cards are large rounded selectable tiles. The selected one gets an indigo border and a light indigo fill. Any "Custom" option reveals a text input below the choices.

Step 1, Platform, "Target platform" (Choose where this product needs to work first.)

Options: Website / web app (default), Mobile application, Desktop application, Custom platform.

Step 2, Stack, "Tech stack preference" (Choose a known stack or select Custom to type exactly what you need.)

Three native-style selects side by side:

- Frontend: React (default), Next.js, Vue, Flutter, React Native, Electron, Custom

- Backend: Serverless API (default), Node.js, Python, Firebase, None, Custom

- Database / storage: Firebase (default), PostgreSQL, MongoDB, SQLite, Local only, Custom

Choosing Custom in any select reveals a text input for that field.

Step 3, Style, "Visual design style" (Choose a style or select Custom to type the exact visual direction.)

Options in a 2-column grid: Minimal, Modern gradient, Glassmorphism, Corporate, Playful, Dark-tech, Material design (default), Flat, Custom.

Step 4, Theme, "Colors & theme tokens" (Choose a theme or select Custom to type its behavior, then set the exact tokens.)

- Options: Light, Dark, System dual-theme (default), Custom

- If Custom is selected, show a text input labeled "Custom theme appearance" with the placeholder "e.g. high-contrast editorial light mode".

- Below that, three color fields, each with a swatch, native color picker and hex text input: Primary (#4f46e5), Accent (#06b6d4), Background (#f8fafc). Validate hex.

Step 5, Type, "Typography" (Choose a font or select Custom to type the exact family.)

Options: Outfit (default), Poppins, Inter, Roboto, SF Pro Display, Custom.

Step 6, Brief, "Project brief" (Describe the user, primary workflow, and important constraints.)

- Project name (required, placeholder "e.g. Fieldnote") and a Category select (default SaaS; options: SaaS, Marketplace, E-commerce, Social / Community, Productivity, Fintech, Education, Healthcare, Developer tool, Content / Media, Internal tool, Other)

- Detailed project description (required textarea, placeholder "Describe the core problem, target user, and the workflow this product should make easier.")

- Guiding notes & constraints (optional textarea, placeholder "Integrations, compliance needs, technical limits, or rollout notes.")

- Info strip at the bottom: "AI mode: {Local template generation | provider / model}" with a "Change" link to Settings

- The Continue button becomes "Generate PRD". While generating, show a loading state. On success, save the PRD and navigate to the Viewer.

## 3. Generation

Compile the wizard answers into a structured brief with PLATFORM, TECH STACK, DESIGN, and PROJECT sections and send it to the selected provider along with the system prompt.

- Local provider: generate the four files from deterministic templates that interpolate the brief. Follow the same file structure and rules as the system prompt below. It must work fully offline, and all content must trace to the brief.

- Remote providers: call the provider from the browser using the user's own API key. Parse the response by splitting on the exact markers below. If a marker is missing, show a clear error with a Retry button and a "Show raw output" toggle.

## 4. Viewer

- Empty state (no PRD): centered icon in a tinted square, title "No local PRD yet", text "Create a PRD to view its local Markdown package here.", and a dark "Open Builder" button.

- With a PRD: a PRD selector, then a four-tab bar (01 Product Overview, 02 Features & Requirements, 03 UI/UX Requirements, 04 Technical Requirements) showing rendered Markdown with GFM tables styled cleanly, a "Raw / Rendered" toggle, and a "Copy" button per file.

- Toolbar actions:

  - Download PDF: one combined PDF with a cover page (project name, category, date), a table of contents, the four sections, headers and footers, and page numbers

  - Download Markdown: each file separately, or all four as a .zip (use JSZip)

  - Download Meta JSON

  - Delete PRD (with confirm)

## 5. Meta JSON

Optional export with this shape:

{

  "schemaVersion": "1.0",

  "id": "uuid",

  "generatedAt": "ISO date",

  "generator": { "app": "VibePRD", "provider": "...", "model": "...", "mode": "local|remote" },

  "project": { "name": "", "category": "", "description": "", "notes": "" },

  "platform": "",

  "stack": { "frontend": "", "backend": "", "database": "" },

  "design": { "style": "", "themeMode": "", "customThemeNote": "", "colors": { "primary": "", "accent": "", "background": "" }, "font": "" },

  "files": [ { "name": "01_Product_Overview", "filename": "01_Product_Overview.md", "wordCount": 0, "content": "..." } ]

}

Exclude the API key and system prompt from this file.

## 6. Settings ("AI settings")

Subtitle: "Choose a provider, add your key, and select a model. These values are stored only in your current browser."

Card "Provider, API key & model":

- Provider select: local (default), openrouter, groq, together, mistral, nvidia, anthropic, gemini, custom

- Model select, populated per provider. Local shows "Local template". Custom shows a free-text model input plus a Base URL input.

- API key password input with show/hide, hidden when the provider is local. Show a note that the key is stored only in this browser.

- System prompt textarea (resizable, monospace), pre-filled with the default prompt below. Helper text: "The built-in professional four-file PRD prompt is active. Editing this text automatically switches to your custom prompt." Add a "Reset to default prompt" button that appears once the text is edited.

- "Test connection" primary button. It sends a tiny request and shows a success or error toast with the reason. It is disabled for local.

Card "Appearance": Seed color (swatch + hex), Mode (system / light / dark), Shape (rounded / sharp). Apply these live to the whole app via CSS variables.

Provider notes: use OpenAI-compatible /chat/completions for openrouter, groq, together, mistral, nvidia and custom. Use the Anthropic Messages API for anthropic (include the header anthropic-dangerous-direct-browser-access: true). Use the generateContent REST API for gemini. Surface CORS or auth errors in plain language.

## Default system prompt (store as a constant, editable in Settings)

You are a senior software product architect and technical writer. You create professional, developer-ready Product Requirement Documents (PRDs) that are good enough to hand directly to an AI coding assistant.

You will receive a structured project brief with PLATFORM, TECH STACK, DESIGN, and PROJECT details. Generate a complete PRD package split into exactly FOUR sections. Separate each section with these exact markers on their own lines:

===FILE:01_Product_Overview===

===FILE:02_Features_Requirements===

===FILE:03_UI_UX_Requirements===

===FILE:04_Technical_Requirements===

01_Product_Overview must cover the problem, solution, audience, value proposition, and 3-5 measurable goals. 02_Features_Requirements must provide prioritized functional requirements organized by module or screen. 03_UI_UX_Requirements must begin with a Markdown table titled "### Brand Color Palette & Styling Tokens" that lists Primary, Secondary, Accent, Background, Surface, Text, Gradient if applicable, and chosen font family; then define exact design guidance, screens, breakpoints, and accessibility. 04_Technical_Requirements must use exactly the chosen stack, recommend real maintained libraries relevant to it, and provide architecture, data flow or endpoints, and a data schema appropriate to the selected storage.

Never use emojis. Never invent or substitute technologies, colors, or fonts the user did not choose. Use clean professional Markdown with headers, tables, and lists. Keep the depth proportional to the stated scope. Every requirement must trace back to the supplied brief. Return only the four marked sections with no preamble or closing remarks.

## Quality and behavior requirements

- Fully responsive, keyboard accessible, visible focus rings, WCAG AA contrast, aria labels on the stepper

- Validate required fields inline and show toasts for save, copy, download and error events

- Persist everything locally, with a "Clear all local data" button at the bottom of Settings

- Use a clean, modular component structure: a Wizard step components folder, a generation service with one adapter per provider, and an export service for PDF, Markdown and JSON

- Never send data anywhere except the chosen provider, and only when the user clicks Generate

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8f3f235d-9892-4438-89b8-8d2714bddc31).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
