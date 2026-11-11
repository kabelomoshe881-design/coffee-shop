# Submission package — BIWA2110

**Project:** Ground & Grain Coffee Shop Management System
**Module:** BIWA2110 — Web Application Development
**Date:** 11 November 2026

This file is the index for the submission. Everything listed here is in this folder or in
the repository.

---

## 1. What to hand in

| # | Item | File / location |
|---|------|-----------------|
| 1 | Written report (Word) | `submission/BIWA2110-Ground-and-Grain-Report.docx` |
| 2 | Report preview (PDF, for reading only) | `submission/report-preview.pdf` |
| 3 | Screenshots used in the report | `submission/screenshots/01…13` |
| 4 | Test transcript, live API evidence, live database export, git history | `submission/evidence/` |
| 5 | Full source code | `submission/BIWA2110-Ground-and-Grain-Source.zip` |
| 6 | Everything above in one file | `submission/BIWA2110-Ground-and-Grain-Package.zip` |
| 7 | Repository | https://github.com/kabelomoshe881-design/coffee-shop |

Submit the **DOCX**, not the PDF. The PDF is there so you can read the report on a phone
without Word reflowing it.

---

## 2. Live system

| Component | URL |
|-----------|-----|
| Application | https://coffee-shop-omega-lovat.vercel.app |
| API health | https://ground-and-grain-api.onrender.com/api/health |
| Repository | https://github.com/kabelomoshe881-design/coffee-shop |

Staff login: username `staff`, password `GroundGrain2026`.

> That password has been used throughout development and is in this repository's history.
> Rotate it before you submit (section 3.4) and send the new one to your lecturer.

> The API is on Render's free tier and sleeps after about fifteen minutes. Open the health
> URL first and wait for `"ok":true` before a demo. If the first request times out, wait
> thirty seconds and refresh; that is the cold start, not a fault.

---

## 3. Before you submit — do these in order

These are the only things still outstanding. Nothing else is blocking.

### 3.1 Fill in the placeholders (required)

The report is laid out for **five members**. Each one appears as `[ full name ]` and
`[ student number ]` in brown text in three places:

1. the **cover page** table,
2. the **Declaration** signature table (five blank signature rows),
3. **Appendix D**, the ownership map.

Open the DOCX in Word, use Find (`Ctrl+F`) for `[ full name ]`, and replace each one. Then
do the same for `[ student number ]`. If your group has fewer than five members, delete the
spare rows from all three tables so the numbers agree; if you have more, add rows.

Also check the **contribution area** column on the cover, in section 1.6 and in Appendix D
against who actually did what. If the split changed, change all three and
`docs/contributions.md` together so they still agree.

### 3.2 Update the contents (one keystroke)

After you change names, the page numbers can shift by a page. Click anywhere in the contents
list and press `F9`, then choose **Update entire table**. Word may also do this automatically
when the file opens — say yes if it asks.

### 3.3 Evidence of collaboration (required by the rubric)

The rubric gives 10 marks for GitHub collaboration. The repository currently has one author,
so the history does not yet show a group. Each member should:

```bash
git checkout -b feature/<your-area>
# make at least one meaningful change in the files you own (see docs/contributions.md)
git add -A
git commit -m "feat(<area>): <what you changed>"
git push -u origin feature/<your-area>
gh pr create --fill
```

Then a **different** member reviews and merges the pull request. After that, capture the
evidence and paste it into Appendix D, under "Repository history at the time of writing":

```bash
git shortlog -sn --all
git log --graph --oneline --all
gh pr list --state all
```

If your lecturer does not require this, skip it — but the report says the ownership map "can
be checked against the repository", so the repository should support that claim.

### 3.4 Rotate the two secrets (recommended)

A database connection string and the staff password were pasted into a chat window during
development. Neither is in the client bundle, but both should be treated as exposed. The
report says rotation is part of the handover, so do it:

1. **Upstash** → your database → *Reset password* / regenerate the connection string.
2. **Render** → your service → *Environment* → update `REDIS_URL` with the new string.
3. Generate a new staff hash locally:

   ```bash
   cd server
   npm run hash -- "YourNewPassword"
   ```

4. Put the output in `STAFF_PASSWORD_HASH` on Render. Never paste the plaintext password
   into a dashboard that keeps logs.
5. Redeploy. Then check `/api/health` reports `"driver":"redis"` and log in with the new
   password.
6. Update the password in **section 2 of this file** and anywhere else you quoted it.

### 3.5 Final sanity check

```bash
cd server && npm test        # expect 10 passed
cd client && npm run build   # expect dist/ to build without warnings
```

Then open the live site once, place an order, log in as staff, and move that order to
`preparing`. That is the same path the marker will take.

---

## 4. What the report contains

35 pages, 9,850 words including tables and appendices.

| Part | Content |
|------|---------|
| Cover | Title, module, live URLs, repository, five-member group table |
| Declaration | Own-work statement, signature table, note on AI-assisted tools |
| Abstract | Problem, solution, method, result |
| Contents | Word field, already populated; `F9` to refresh |
| 1. Introduction | Background, problem statement, objectives, scope, group roles |
| 2. Requirements | Personas, 14 functional and 9 non-functional requirements, user stories with acceptance criteria, constraints |
| 3. Design | Architecture, frontend/backend structure, key-value data model, API design, order lifecycle, security, interface design system |
| 4. Implementation | Stack choices, server, client, error handling, the dialog focus bug, code quality |
| 5. Testing | 10 automated tests, 12 browser scenarios, accessibility, responsiveness, performance, security checks, defect log |
| 6. Deployment | Topology, environment variables, procedure, free-tier constraints, live verification, reading the records back from Redis |
| 7. Challenges | Seven lessons, including CORS, build-time env vars, key-value thinking, secrets |
| 8. Conclusion | What was achieved, future work, what we learned |
| References | 13 sources |
| Appendix A | API reference with request/response examples |
| Appendix B | Full key-value schema and index maintenance |
| Appendix C | Test output and live API evidence |
| Appendix D | Ownership map and repository history |
| Appendix E | Screenshot index and five full-page figures, including the database records |
| Appendix F | Viva preparation: questions and answers per area |

---

## 5. Mapping to the marking rubric (100 marks)

Taken from section 10 of the brief.

| Criterion | Marks | Where it is evidenced |
|-----------|-------|----------------------|
| React interface and user experience | 15 | Section 3.8 (tokens, type, contrast), 5.4–5.6 (12 browser scenarios, responsive, dark mode); figures 1–3 and 6–9; screenshots 01–12 |
| Express REST API | 20 | Section 3.5 (endpoint table), 4.2 (routers, Zod schemas, error envelope), 4.4; Appendix A; the 10 automated tests |
| Fetch API integration | 10 | Section 4.3 (`client/src/api.js`, one request helper, abort on unmount, typed error envelope); polling on the confirmation page |
| Key-value NoSQL database and persistence | 15 | Section 3.4 (schema, explicit indexes, `MULTI`), 6.7 (records read back from the live instance); Appendix B; screenshot 13 |
| Menu and order management functionality | 15 | Section 3.6 (forward-only status workflow), 4.2 (repositories, price snapshotting, `ITEM_IN_USE` guard); staff dashboard screenshots 06–09 |
| GitHub collaboration and code quality | 10 | `docs/contributions.md`, Appendix D, `git-history.txt`; **one author in the history at present — see 3.3** |
| Deployment and testing | 10 | Section 5 (tests, scenarios, defects), 6 (three hosts, env vars, live verification); live URLs in section 2 |
| Students Own Work | 5 | Declaration, section 1.5 (how we worked), the note on AI-assisted tools |

---

## 6. Coverage of the brief's final deliverables (section 11)

| Required deliverable | Status | Where |
|----------------------|--------|-------|
| GitHub repository URL | Done | https://github.com/kabelomoshe881-design/coffee-shop |
| Deployed React frontend URL | Done | https://coffee-shop-omega-lovat.vercel.app |
| Deployed Express backend URL | Done | https://ground-and-grain-api.onrender.com/api/health |
| Working app on a persistent NoSQL database | Done | Upstash Redis; `/api/health` reports `"driver":"redis"`; section 6.7 and screenshot 13 |
| README covering installation, technologies, API endpoints and deployment | Done | `README.md` — Quick start, Tech stack, API reference, Deployment |
| Screenshots of the application and database records | Done | Screenshots 01–12 (application) and 13 (database), indexed in Appendix E |
| Report outlining each member's contribution | Needs names | Section 1.6 and Appendix D, five placeholder rows — see 3.1 |
| Demonstration of adding a menu item, placing an order and updating its status | Partly | Screenshots 09 (add item), 03–04 (place order), 07 (advance status) show each step, and section 9 is the script. If your lecturer wants a video, record a two-minute screen capture following section 9 |

---

## 7. Files in this folder

```
submission/
├── SUBMISSION.md                          this file
├── BIWA2110-Ground-and-Grain-Report.docx  the report (hand this in)
├── report-preview.pdf                     reading copy of the report
├── BIWA2110-Ground-and-Grain-Source.zip   runnable code and docs
├── BIWA2110-Ground-and-Grain-Package.zip  the whole handover
├── build_docx.py                          regenerates the report from source
├── postprocess_docx.py                    fixes the field cache and page total
├── make_zips.py                           rebuilds both archives
├── capture_db_evidence.mjs                read-only dump of the live Redis
├── report.html                            earlier HTML version, kept for reference
├── screenshots/                           13 images
│   ├── 01-menu-light.png
│   ├── 02-menu-search.png
│   ├── 03-cart.png
│   ├── 04-confirmation.png
│   ├── 05-staff-login.png
│   ├── 06-dashboard-overview.png
│   ├── 07-dashboard-orders.png
│   ├── 08-dashboard-menu.png
│   ├── 09-menu-editor.png
│   ├── 10-menu-dark.png
│   ├── 11-mobile-menu.png
│   ├── 12-mobile-cart.png
│   └── 13-database-records.png           live key-value store, from the export below
└── evidence/
    ├── tests.txt                           test run transcript
    ├── api-evidence.txt                    live API calls with status codes
    ├── database-records.txt                live Redis export: keys, indexes, documents
    └── git-history.txt                     commits and authors
```

### Rebuilding the report

If you edit the text, edit `build_docx.py` (not the DOCX) so the source and the document
stay in step, then run the two passes:

```bash
python submission/build_docx.py            # first pass: measure
# open in Word, update fields, note the page count and word count
python submission/build_docx.py 35 9850    # second pass: real total and word count
# then in Word: update fields, save, export PDF
python submission/postprocess_docx.py submission/BIWA2110-Ground-and-Grain-Report.docx 35
```

The last argument of `postprocess_docx.py` is the page total, so it must match the real count.

---

## 8. Demo script for the viva (three minutes)

1. Open the health URL. Say "the API is awake and using Redis".
2. Open the app. Search "flat". Add a flat white, change the quantity.
3. Refresh the page. The cart is still there. Say why: `localStorage`, and the total is
   recalculated by the server.
4. Check out with a name. Point at the `ORD-` number and the URL.
5. Open a second tab to `/staff`, sign in, and move that order from `pending` to `preparing`.
6. Go back to the confirmation tab. It updates on its next poll without a reload.
7. Toggle dark mode, then narrow the window to phone width.
8. If there is time, show `evidence/database-records.txt` next to the app and point out that
   the order you just placed is in the store with its status.

If someone asks for a hard question, Appendix F has the answers and the file to point at.

---

## 9. Known limitations to state honestly

- One staff account, no roles. Justified in section 1.4.
- No payment. Orders are paid at the counter, and the checkout panel says so.
- The API sleeps on the free tier, so the first request after idle is slow. The interface
  shows a skeleton and a retry action instead of a blank screen.
- Polling every ten seconds rather than WebSockets, chosen deliberately for the free tier.
- Menu images are not uploaded; items are text and price only.

Naming these before a marker finds them is worth more than hiding them.
