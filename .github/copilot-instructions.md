# Copilot Instructions for Transcriptor Pro

Before starting any non-trivial task in this repository, first inspect the available workspace prompt workflows in .github/prompts and prefer the most specific matching workflow.

Rules:

1. Prefer workspace prompts over user prompts for repository-specific work.
2. For debugging tasks, prefer systematic-debugging.
3. For Playwright, browser automation, and visible E2E, prefer playwright-skill and visible-e2e-replay.
4. For test repair and validation, prefer test-fixing, lint-and-validate, and verification-before-completion when relevant.
5. If more than one workflow fits, combine up to three compatible workflows.
6. Do not ask the user to invoke prompt workflows manually when the match is obvious.
7. If no matching workflow exists, continue normally.
8. Briefly state which workflow guided the task when it materially affects the approach.
