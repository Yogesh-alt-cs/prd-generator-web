import type { ResolvedBrief } from "./brief";

const firstSentence = (text: string) => {
  const match = text.split(/(?<=[.!?])\s/)[0];
  return (match || text).trim();
};

const bullets = (text: string, fallback: string[]) => {
  const parts = text
    .split(/[\n.;]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 12);
  return parts.length ? parts : fallback;
};

export function localGenerate(b: ResolvedBrief): string[] {
  const name = b.name || "Untitled product";
  const workflow = bullets(b.description, [`Deliver the core ${b.category} workflow described in the brief.`]);
  const constraints = bullets(b.notes, []);

  const overview = `# ${name} — Product Overview

**Category:** ${b.category}
**Target platform:** ${b.platform}

## 1. Problem

${b.description || "No description supplied."}

The brief identifies this as a ${b.category.toLowerCase()} problem that must be solved on ${b.platform.toLowerCase()} first.

## 2. Solution

${name} addresses the stated problem directly: ${firstSentence(b.description) || "see the project brief"}. The first release stays scoped to the workflow described in the brief and does not add capability outside it.

## 3. Audience

The primary audience is the user described in the brief. Secondary stakeholders are limited to the people needed to operate the described workflow.

## 4. Value proposition

| Dimension | Commitment |
| --- | --- |
| Platform focus | ${b.platform} |
| Visual direction | ${b.style} |
| Theme behavior | ${b.themeMode} |
| Stack commitment | ${b.frontend} with ${b.backend} and ${b.database} |

## 5. Measurable goals

${workflow
  .slice(0, 5)
  .map((w, i) => `${i + 1}. Ship the capability: ${w}. Measure completion rate of this path weekly.`)
  .join("\n")}
${workflow.length < 3 ? "\n4. Keep first meaningful render under 2 seconds on the target platform.\n5. Reach a task completion rate of 90 percent for the primary workflow." : ""}

## 6. Constraints from the brief

${constraints.length ? constraints.map((c) => `- ${c}`).join("\n") : "- No additional constraints were supplied."}
`;

  const features = `# ${name} — Features & Requirements

Requirements are prioritized P0 (required for first release), P1 (next), P2 (later). Every item traces to the supplied brief.

## Module 1: Core workflow

| ID | Priority | Requirement |
| --- | --- | --- |
${workflow.map((w, i) => `| F-1.${i + 1} | P0 | ${w} |`).join("\n")}

## Module 2: Data & persistence

| ID | Priority | Requirement |
| --- | --- | --- |
| F-2.1 | P0 | Persist workflow data using ${b.database}. |
| F-2.2 | P0 | Handle load, empty and error states for every data surface. |
| F-2.3 | P1 | Support editing and deleting records created in the core workflow. |

## Module 3: Interface shell

| ID | Priority | Requirement |
| --- | --- | --- |
| F-3.1 | P0 | Provide navigation across the screens required by the core workflow on ${b.platform}. |
| F-3.2 | P0 | Apply the ${b.style} visual direction with ${b.themeMode} theme behavior. |
| F-3.3 | P1 | Provide a settings surface for user-controlled preferences named in the brief. |

## Module 4: Constraints & rollout

| ID | Priority | Requirement |
| --- | --- | --- |
${
  constraints.length
    ? constraints.map((c, i) => `| F-4.${i + 1} | P0 | ${c} |`).join("\n")
    : "| F-4.1 | P1 | No extra constraints supplied; keep scope to the brief. |"
}

## Out of scope

Anything not stated in the brief, including technologies, integrations and audiences not named by the user.
`;

  const ui = `# ${name} — UI/UX Requirements

### Brand Color Palette & Styling Tokens

| Token | Value | Usage |
| --- | --- | --- |
| Primary | ${b.colors.primary} | Primary actions, active navigation, focus rings |
| Secondary | ${b.colors.primary} | Supporting surfaces derived from primary |
| Accent | ${b.colors.accent} | Highlights, badges, secondary emphasis |
| Background | ${b.colors.background} | Application background |
| Surface | #ffffff | Cards, sheets, panels |
| Text | #1a1b21 | Primary body and heading text |
| Gradient | linear-gradient(135deg, ${b.colors.primary}, ${b.colors.accent}) | ${b.style.toLowerCase().includes("gradient") ? "Hero and feature surfaces" : "Optional emphasis only" } |
| Font family | ${b.font} | All headings and body text |

## Visual direction

The interface follows a ${b.style} direction. Theme behavior is ${b.themeMode}${b.customThemeNote ? ` (${b.customThemeNote})` : ""}. Only the colors and font above may be used; no substitutions.

## Screens

${workflow.map((w, i) => `### Screen ${i + 1}\n\nPurpose: ${w}\n\nContains: heading, primary content region, primary action using Primary color, and clear empty and error states.`).join("\n\n")}

## Layout & breakpoints

| Breakpoint | Width | Behavior |
| --- | --- | --- |
| Mobile | up to 640px | Single column, stacked actions, full-width controls |
| Tablet | 641px to 1024px | Two column where content allows |
| Desktop | 1025px and above | Centered content, max width about 1100px |

## Accessibility

- WCAG AA contrast for all text against ${b.colors.background} and surface white
- Visible focus rings using Primary
- Full keyboard operability for every interactive element
- Descriptive labels on inputs, steppers and icon-only controls
- Respect reduced motion preferences
`;

  const tech = `# ${name} — Technical Requirements

## Stack (exactly as chosen)

| Layer | Choice |
| --- | --- |
| Frontend | ${b.frontend} |
| Backend | ${b.backend} |
| Database / storage | ${b.database} |
| Target platform | ${b.platform} |

## Recommended libraries

${recommendLibraries(b)
  .map((l) => `- ${l}`)
  .join("\n")}

## Architecture

- Presentation layer built with ${b.frontend}, organized by feature folder with shared UI primitives.
- Application layer holds workflow logic in services, keeping components declarative.
- ${b.backend === "None" ? "No server layer: all logic runs in the client." : `Server layer implemented as ${b.backend}, exposing only the operations the workflow needs.`}
- Persistence through ${b.database}, accessed behind a single data-access module so storage can be tested in isolation.

## Data flow

1. User action in a ${b.frontend} view calls a service function.
2. The service validates input before any write.
3. ${b.backend === "None" ? "The service writes directly to " + b.database + "." : b.backend + " handles the request, authorizes it, then reads or writes " + b.database + "."}
4. State updates flow back to the view with explicit loading and error states.

## Endpoints / operations

| Operation | Input | Output |
| --- | --- | --- |
| createRecord | workflow payload | created record |
| listRecords | filter, pagination | record list |
| updateRecord | id, partial payload | updated record |
| deleteRecord | id | confirmation |

## Data schema (${b.database})

\`\`\`
record
  id           string, primary key
  ownerId      string, nullable when no accounts are required
  title        string, required
  payload      structured document matching the core workflow
  createdAt    timestamp
  updatedAt    timestamp
\`\`\`

## Non-functional requirements

- Validate all input at the boundary before persistence.
- Handle offline and failure paths for every write.
- Keep secrets out of the client unless the brief explicitly requires user-supplied keys.
${constraints.length ? constraints.map((c) => `- ${c}`).join("\n") : ""}
`;

  return [overview, features, ui, tech];
}

function recommendLibraries(b: ResolvedBrief): string[] {
  const libs: string[] = [];
  if (/react native/i.test(b.frontend)) libs.push("React Navigation for routing", "React Native Reanimated for motion");
  else if (/flutter/i.test(b.frontend)) libs.push("go_router for routing", "riverpod for state management");
  else if (/vue/i.test(b.frontend)) libs.push("Vue Router", "Pinia for state", "Tailwind CSS for styling");
  else if (/next/i.test(b.frontend)) libs.push("Next.js App Router", "TanStack Query for data", "Tailwind CSS");
  else if (/electron/i.test(b.frontend)) libs.push("electron-builder for packaging", "electron-store for local config");
  else libs.push("TanStack Query for data fetching", "React Hook Form with Zod for validation", "Tailwind CSS");

  if (/node/i.test(b.backend)) libs.push("Fastify or Express for HTTP", "Zod for request validation");
  else if (/python/i.test(b.backend)) libs.push("FastAPI with Pydantic");
  else if (/firebase/i.test(b.backend)) libs.push("Firebase SDK with security rules");
  else if (/serverless/i.test(b.backend)) libs.push("Edge-compatible serverless handlers with Zod validation");

  if (/postgres/i.test(b.database)) libs.push("Drizzle ORM or Prisma for PostgreSQL");
  else if (/mongo/i.test(b.database)) libs.push("Mongoose for MongoDB");
  else if (/sqlite/i.test(b.database)) libs.push("better-sqlite3 or Drizzle with SQLite");
  else if (/local/i.test(b.database)) libs.push("idb for IndexedDB access");
  else if (/firebase/i.test(b.database)) libs.push("Firestore with typed converters");
  return libs;
}
