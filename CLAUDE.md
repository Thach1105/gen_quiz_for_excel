# AI Coding Workflow

## Token-saving rules

- Do not load or summarize the whole repository unless explicitly asked.
- Before reading many files, first inspect the project structure briefly and identify the smallest relevant area.
- Prefer targeted symbol-level lookup over full-file reading.
- Avoid repeated grep/read_file loops. If searching code relationships, use Serena first.
- Read only the minimal code needed to answer or modify the task.
- When editing, show concise reasoning and only explain changed files, not the entire codebase.

## Serena usage

- At the start of a coding session, activate the current project with Serena and read Serena's initial instructions.
- Use Serena for codebase navigation, symbol lookup, references, refactoring, and understanding relationships between classes/functions.
- Prefer Serena tools such as symbol overview, find symbol, and find references before opening large files.
- Use normal file reading only when the exact file and small section are already known.
- Do not paste large file contents into the conversation unless necessary.

## Context7 usage

- Use Context7 only when the task depends on external library/framework/API documentation, setup, or version-specific behavior.
- Do not use Context7 for project-local code that can be understood from this repository.
- When using Context7, query only the specific library and topic needed.
- If the library ID is known, use the exact Context7 library ID to avoid extra library-resolution calls.
- Prefer version-specific queries, for example: "Spring Boot 3.5", "Vue 3", "Playwright latest", "Gravitee APIM 4.9".
- Do not fetch broad documentation. Ask for the narrow API/configuration page needed for the task.

## Tool choice priority

1. For project code structure, references, and refactoring: use Serena.
2. For external framework/library documentation: use Context7.
3. For simple shell commands, tests, and builds: use Bash.
4. For small known files: read the file directly.
5. Avoid using multiple tools for the same information unless results conflict.

## Project workflow

- Before making code changes, state the likely files to inspect.
- After code changes, run the smallest relevant test or typecheck command.
- Prefer single targeted tests over the full test suite unless the change is broad.