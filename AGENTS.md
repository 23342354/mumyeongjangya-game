# Project workflow

## Mandatory user-facing update notices

For every user-requested website change that is implemented and shipped, update `UPDATE_NOTICES` in `game.js` in the same commit.

- Add a new entry at the start of the array, or revise the current unpublished entry while work is still in progress.
- Use a unique, stable ID, a Korea-local release date, a short Korean title, and plain Korean bullet points describing what changed and where to use it.
- Keep previous entries. Do not change an already published entry's ID unless it is a new release; a new ID activates the unread indicator.
- Include feature additions, behavior changes, balance changes, and meaningful bug fixes. Do not create notices for discussion-only requests or unrelated tasks.
- Describe only completed behavior. If a server migration or operator setup is still required, state that the feature becomes available after operator application. Never announce an unapplied SQL migration as live.
- Include the notice update in the same validation and publication workflow as the requested feature. Test that the header button remains available on mobile and desktop.
- Keep credentials, private requests, account tokens, and internal implementation detail out of notices.

The top-bar scroll icon opens `openUpdateNotices()`. The unread indicator is tracked per account in local browser storage, independently of gameplay saves and pair wallets.
