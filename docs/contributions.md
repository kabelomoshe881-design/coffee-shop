# Group contributions

The brief marks collaboration, not just the final product. A repository with one giant commit
and no branches reads as individual work no matter how good the code is. This document is the
record you submit alongside the repo.

> **Action required:** the table below is a *plan*. Fill in real names and student numbers, and
> make the commits from each member's own machine or GitHub account. See
> [Suggested git workflow](#suggested-git-workflow) — it takes about 20 minutes and it is what
> turns this from "one person built it" into "we built it".

---

## Team

| Member | Student number | Primary ownership | Secondary |
| --- | --- | --- | --- |
| _Name 1_ | _00000000_ | Backend API + data model | Deployment |
| _Name 2_ | _00000000_ | Frontend customer experience | Design system |
| _Name 3_ | _00000000_ | Staff dashboard | Testing |
| _Name 4_ | _00000000_ | Documentation + integration | Code review |

Adjust to your actual group size. With three members, fold documentation into whoever has the
lightest load; do not leave it unowned.

---

## Ownership map

Each area maps to real files, so ownership is verifiable from `git log`.

### Backend API + data model — `server/`

| File | Responsibility |
| --- | --- |
| `src/store/redis.js`, `src/store/file.js` | Key-value driver interface and both implementations |
| `src/repositories/menu.js` | Menu CRUD, index maintenance |
| `src/repositories/orders.js` | Order creation, price snapshotting, status workflow, daily summary |
| `src/routes/*.js` | REST endpoints |
| `src/schemas.js` | Zod validation |
| `src/middleware/*.js` | JWT auth, error envelope |
| `src/app.js` | App factory wiring |
| `test/api.test.js` | API tests |

### Frontend customer experience — `client/src/pages/MenuPage.jsx`, `ConfirmPage.jsx`, components

| File | Responsibility |
| --- | --- |
| `pages/MenuPage.jsx` | Menu browsing, search, category filter, hero |
| `components/MenuCard.jsx` | Item card and add-to-cart |
| `components/CartDrawer.jsx` | Cart, quantity steppers, checkout form |
| `pages/ConfirmPage.jsx` | Order confirmation and status polling |
| `context/CartContext.jsx` | Cart state and `localStorage` persistence |
| `api.js` | Fetch wrapper, error normalisation |

### Staff dashboard — `client/src/pages/StaffDashboard.jsx`, `StaffLogin.jsx`

| File | Responsibility |
| --- | --- |
| `pages/StaffLogin.jsx` | Sign-in form and validation |
| `pages/StaffDashboard.jsx` | Overview stats, live board, orders table, menu management |
| `context/AuthContext.jsx` | Token storage, login/logout |
| `components/ui.jsx` | Modal, TextField, StatusPill, skeletons |

### Design system — `design-system/`, `client/src/styles/`

| File | Responsibility |
| --- | --- |
| `design-system/ground-and-grain/MASTER.md` | Tokens, type scale, component rules |
| `design-system/ground-and-grain/pages/*.md` | Per-page overrides |
| `styles/tokens.css` | Every colour, space and motion value |
| `styles/app.css` | All component styling, responsive rules |

### Documentation + integration — `README.md`, `docs/`, deployment

| File | Responsibility |
| --- | --- |
| `README.md` | Setup, architecture, deployment |
| `docs/api.md` | Endpoint reference |
| `docs/data-model.md` | Key-value schema rationale |
| `client/vercel.json`, `client/public/_redirects` | SPA routing on deploy |

---

## Suggested git workflow

Do this once, on the machine that has the finished project.

```bash
cd coffee-shop
git init
git add .
git commit -m "chore: initial project scaffold"
git branch -M main
gh repo create coffee-shop --private --source=. --push   # or create it in the browser
```

Then, for each member, create a branch and have **that member** make a meaningful commit. The
point is that `git shortlog -sn` shows more than one author.

```bash
# Member 1 — backend
git checkout -b feature/backend-api
# ...they review and adjust server/ code...
git add server/
git commit -m "feat(api): add key-value repositories, routes and validation"
git push -u origin feature/backend-api

# Member 2 — customer frontend
git checkout main && git checkout -b feature/customer-experience
git add client/src/pages/MenuPage.jsx client/src/pages/ConfirmPage.jsx client/src/components/
git commit -m "feat(menu): add menu browsing, cart drawer and order confirmation"
git push -u origin feature/customer-experience

# Member 3 — staff dashboard
git checkout main && git checkout -b feature/staff-dashboard
git add client/src/pages/StaffDashboard.jsx client/src/pages/StaffLogin.jsx
git commit -m "feat(staff): add dashboard with live board and menu management"
git push -u origin feature/staff-dashboard

# Member 4 — docs and deployment
git checkout main && git checkout -b docs/readme-and-deployment
git add README.md docs/ design-system/
git commit -m "docs: add setup guide, API reference and data model"
git push -u origin docs/readme-and-deployment
```

Open a pull request per branch, have a **different** member approve it, then merge. Four small
PRs with review comments is exactly the evidence the brief is looking for.

### Commands that prove the collaboration

Paste the output of these into your submission or appendix:

```bash
git log --oneline --graph --all        # branch structure and merge commits
git shortlog -sn --all                 # commits per author
git log --format='%h %an %s' --no-merges   # who did what
gh pr list --state all                 # PRs and their reviewers
```

---

## Honest task split

If your group prefers to divide by *feature vertical* rather than by layer, this split also
works and produces cleaner PRs:

| Member | Vertical | Touches |
| --- | --- | --- |
| A | "A customer can see the menu" | `MenuPage`, `MenuCard`, `GET /api/menu`, seed data |
| B | "A customer can place an order" | `CartDrawer`, `CartContext`, `POST /api/orders`, price snapshot |
| C | "A customer can track the order" | `ConfirmPage`, `GET /api/orders/:id`, polling |
| D | "Staff can run the shop" | `StaffLogin`, `StaffDashboard`, auth, status workflow, menu CRUD |

Each vertical is a demo-able slice, which also makes the presentation easier: each member
demonstrates their own feature instead of narrating someone else's code.

---

## What each member should be able to explain

Use this as a viva checklist. Nobody should be unable to answer for their own area.

**Backend**
- Why is the store key-value rather than relational, and how does filtering work without `WHERE`?
- Why is `priceCents` an integer instead of a decimal?
- What happens if the server dies halfway through creating an order? (Answer: `MULTI`.)
- Where is the status workflow enforced, and why not in React?

**Customer frontend**
- How does the cart survive a page refresh?
- Where does the total come from — client or server? Why?
- How does the confirmation page know the order became *ready*?

**Staff dashboard**
- How is a 401 handled mid-session?
- Why are background refreshes silent while the first load shows a skeleton?
- What happens when you try to delete an item that is in an open order?

**Design + docs**
- Why these colours and this typeface? What was rejected and why?
- How is contrast handled in dark mode?
- What are the deployment steps, and what breaks on a free tier?

---

## Time log (optional but useful)

| Week | Focus | Deliverable |
| --- | --- | --- |
| 1 | Requirements, data model, API contract | `docs/data-model.md`, `docs/api.md` |
| 2 | API implementation + tests | 10 passing tests, working endpoints |
| 3 | Frontend customer flow + design system | Menu, cart, confirmation |
| 4 | Staff dashboard, deployment, documentation | Live URLs, README, presentation |
