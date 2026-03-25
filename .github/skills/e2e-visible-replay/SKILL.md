## E2E Visible Replay Skill

## Purpose
Use this skill to run UI end-to-end tests in a way that is easy for users to monitor in real time and review after execution.

## When To Use
- User wants to watch the robot during the test.
- User wants reproducible step-by-step evidence after the run.
- Flow includes file uploads and needs realistic sample assets.
- A submit action has latency and needs explicit loading feedback.

## Workflow
1. Run browser in headed mode (visible), with slow actions.
2. Take screenshots at each key step.
3. Generate an HTML replay with Next/Previous controls.
4. If file upload exists, use real sample files from a user-provided folder.
5. Measure backend request timing (submit + follow-up fetch).
6. Distinguish UI bugs from backend latency.
7. Keep a final pause so the user can inspect end state.

## UI Rule For Submit Transitions
If submit triggers asynchronous backend actions:
- Show a blocking loader overlay from submit click until final state is ready.
- Update loader message with progress (sending data, preparing payment portal, etc).
- Hide loader only when success/error state is rendered.

## Minimum Evidence Artifacts
- Full screenshot set by numbered order.
- Replay page (HTML) that lets user move step by step.
- Final diagnostics: submit duration, portal duration, JS errors, final UI state.

## Default Runtime Parameters
- HEADLESS=0
- SLOWMO between 400 and 650 ms
- WAIT_FOR_SUBMIT_MS between 45000 and 60000
- FINAL_PAUSE_MS between 8000 and 15000

## Reuse In Any Project
Copy this folder into `.github/skills/e2e-visible-replay/` in the target repository.
Adjust selectors and URLs to the project under test.
