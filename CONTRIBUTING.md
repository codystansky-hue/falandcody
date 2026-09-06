# Working on this together

Two people, two GitHub accounts, one website. This is how not to tread on each
other.

---

## 1. Get her onto the repo

On GitHub: **Settings → Collaborators and teams → Add people**, then her GitHub
username. She gets an email; once she accepts she can push, open pull requests
and edit files in the browser.

Pick **Write** access. Admin is only needed for deleting the repo and changing
its settings, and neither of you needs that day to day.

While you are in Settings, also:

- **Branches → Add branch protection rule** for `main`, with *Require a pull
  request before merging*, if you would rather nothing lands without the other
  one seeing it. Entirely optional for two people who talk to each other —
  skip it if it will just be friction.

## 2. Get her onto Vercel

The site is only useful when it is deployed. On Vercel: **Project → Settings →
Members**, invite her with the same email as her GitHub account. Hobby plan
allows this for personal projects.

The payoff is **preview deployments**: every pull request gets its own live URL.
She can change the palette, open a PR, and look at the real site on her phone
before anything touches the real one.

---

## 3. The everyday loop

Most changes to this site are content, not code — a date, a venue, an FAQ
answer, the colours. None of that needs a laptop or a terminal.

### In the browser (no setup at all)

1. Open [`src/lib/config.ts`](src/lib/config.ts) on GitHub.
2. Click the pencil icon.
3. Change what you want. Delete the `TODO:` prefix and write the real value.
4. Scroll down, choose **Create a new branch for this commit**, name it
   something like `ana/venue-details`, and **Propose changes**.
5. Vercel comments on the pull request with a preview link within a minute or
   two. Look at it.
6. If it is right, **Merge**. The live site updates itself.

If you get it wrong, nothing breaks: the branch is separate from the live site
until it is merged, and a merge can be reverted with one button.

### On a laptop

```bash
git clone https://github.com/<owner>/<repo>.git
cd <repo>
npm install
cp .env.example .env.local        # ask the other one for the values
npm run dev                        # http://localhost:3000
```

Then, per change:

```bash
git checkout main && git pull
git checkout -b ana/venue-details
# ...edit...
npm run typecheck                  # must be clean
git commit -am "Venue, address and the two nearest airports"
git push -u origin ana/venue-details
```

Open the pull request from the link git prints.

---

## 4. Who changes what

Nothing here is a rule, just the shape that avoids conflicts.

| Area | File | Needs any code knowledge? |
|---|---|---|
| Names, date, venue, events, hotels, FAQ, registry, story | `src/lib/config.ts` | No |
| Colours | the nine variables at the top of `src/app/globals.css` | No |
| Wording on a page | that page in `src/app/` | A little — the text is between `>` and `<` |
| Fonts | `src/app/layout.tsx` | A little |
| Anything else | — | Yes |

**One rule worth keeping:** if you are both going to be in `config.ts` on the
same evening, say so first. Two branches editing the same lines is the one thing
git makes annoying, and it is entirely avoidable by saying "I'm doing the FAQ
now."

---

## 5. Things not to do

- **Never commit `.env.local`.** It holds the database URL and both passphrases.
  `.gitignore` already blocks it; do not force it past that.
- **Do not rename an event `key`** in `config.ts` once guests have started
  replying. The keys are stored against each reply, so renaming `ceremony`
  orphans everybody who ticked it. Changing an event's `name`, `time`, `where`
  or `note` is always safe. Adding a new event is always safe.
- **Do not put a real name, email or photo of a guest into the repo.** Guest data
  lives in the database, which is not in git, and that is the right side of the
  line for it.
- **Do not share the admin passphrase with guests.** It exposes every email,
  postal address and phone number on the list.

---

## 6. When something is broken

- **The site will not build.** Read the Vercel log — it names the file and the
  line. Nine times in ten it is a missing quote or a missing comma in
  `config.ts`. `npm run typecheck` catches the same thing locally before you
  push.
- **A page says a detail is "not decided yet".** That value is still a `TODO:`
  string. `/admin` lists every one that is left, by its exact path in the config.
- **A page 404s.** `/registry`, `/story`, `/travel` and `/arrivals` hide
  themselves when they have nothing to show. Fill in the registry links, the
  story paragraphs, or set `travel.flyIn: true`.
- **The RSVP form says there is no database.** `DATABASE_URL` is unset in that
  environment, or `npm run migrate` has not been run against it.

---

## 7. Before it goes out to guests

- [ ] `/admin` shows zero outstanding TODOs (or only ones you meant to leave)
- [ ] `date.confirmed` is `true`
- [ ] Both passphrases set, and different from each other
- [ ] `npm run migrate` has run against the production database
- [ ] Somebody who is not either of you has filled the form in on a phone
- [ ] The RSVP deadline in `date.rsvpBy` is a date you can actually hold
