# Content site — operations

For the owner. Background: ADR-0022 (`docs/adr/0022-content-site-and-studio.md`).

## 1. Deploy (order matters: rules → functions → hosting)

```bash
firebase deploy --only firestore:rules,storage
firebase deploy --only functions:grantCreatorRole,functions:publishArticle,functions:unpublishArticle
```

Then merge to `main` (Vercel builds and deploys the hosting). In the Vercel project set:

| Variable | Needed | Value |
|---|---|---|
| `FIREBASE_PROJECT_ID` | no | defaults to `rollercoasterdottodream`; set it only to point at another project |
| `FIREBASE_API_KEY` | only if public REST reads need a key | the web API key |

## 2. Before launch

1. **Grant the first creator.** The writer signs up in the app (`app.ilovetcas.com`)
   with their email. Then Admin → **Hub** → "สิทธิ์ผู้เขียนบทความ" → enter the email →
   **ให้สิทธิ์**. The writer opens `/studio` and, if the page says they have no access
   yet, presses **ลองรีเฟรชสิทธิ์** (or signs in again).
2. **Set the OpenChat.** Admin → Hub → "ตั้งค่าเว็บไซต์คอนเทนต์": paste the
   `https://line.me/ti/g2/…` link, the room rules and the moderators' names. Leave the
   link empty to hide the band.
3. **Migrate the old news** (once). Dry run first, then apply; both are safe to repeat:

   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/migrateWelcomeNews.mjs
   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/migrateWelcomeNews.mjs --apply
   ```

   Old news ids become article slugs under the "news" category; `/news/:id` redirects to
   `/blog/:id`. Posts that cannot migrate (bad slug, body too large, slug taken) are
   listed with the reason.
4. **Pick the featured article** (optional): Admin → Hub → "บทความเด่น (slug)".

## 3. Launch checklist

- [ ] OpenChat has at least two moderators and written rules; the room's age policy was
      checked against LINE's terms for under-18 members.
- [ ] Every image used in articles is licensed for reuse (university logos and press
      photos need permission); cover alt text is filled in.
- [ ] Figures taken from MyTCAS say "ข้อมูลจาก MyTCAS ณ <date>" in the text.
- [ ] `https://ilovetcas.com/sitemap.xml` lists the published articles.
- [ ] A shared link previews correctly in LINE (title, description, cover).
- [ ] The Vercel redirect `www.ilovetcas.com` → `ilovetcas.com` is set (see
      `docs/OWNER-TODO.md`).

## 4. Everyday

- **Writing:** `app.ilovetcas.com/studio` → เขียนบทความใหม่. Edits save by themselves
  (about 2 seconds after typing stops). **ดูตัวอย่าง** shows the saved draft.
- **Publishing:** **เผยแพร่** checks the draft and tells the writer what is missing.
  After publishing, **อัปเดตบทความ** pushes later edits live; until then readers see the
  last published version.
- **Taking an article down:** **ถอนบทความ**. The draft stays; publishing again restores
  the same address.
- **Revoking a writer:** Admin → Hub → email → **เพิกถอน**. Their live articles stay up;
  they can no longer edit or publish.
- **Stale page:** pages are cached for up to a minute (then refreshed in the
  background); a just-published article can take up to a minute to appear.

## 5. Checks

```bash
npm test                 # unit tests
npm run test:rules:emu   # rules + real functions against the emulators (needs Java)
npm run build
```
