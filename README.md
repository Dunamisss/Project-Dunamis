# DUNAMIS

Modern, elegant website inspired by The Prompt Index: black background, large “DUNAMIS” title, quote beneath, clean typography and responsive layout.

---

## Bulk Upload & Attachments 📁

- You can upload a ZIP of text files or select a folder in the **Submit Prompt** page. Each text file (.txt, .md, .json) will be parsed and added as an individual prompt submission (pending moderation).
- Limits: max ~50 files per bulk upload; max 1MB per file. These safeguards keep the site within free-tier usage.

## Profile Avatars & Security Rules 🔐

- Avatars are uploaded to `avatars/{uid}/avatar.webp` and saved to your `users/{uid]` document and your Firebase Auth profile.
- Example rules are included in `firestore.rules` and `storage.rules`. Deploy them using the Firebase CLI: `firebase deploy --only firestore:rules,storage`.

---

