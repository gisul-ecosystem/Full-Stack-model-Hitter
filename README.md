# VM To Model

Students → Tests → email invite → isolated ZIP submit → model score.

## Flow

1. **Students** — import CSV/Excel with `name`, `email`
2. **Tests** — create a test (gets unique submit token)
3. Open test → add candidates from students
4. Email template & send (includes `/submit/[token]` link)
5. Candidates upload ZIP on that isolated link
6. Queue extracts → scores via model → score on that test’s candidates

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Env

- `MONGODB_URI`
- SMTP_* for email
- `MODEL_API_URL` / `MODEL_API_KEY` / `MODEL_NAME` for scoring
- `APP_BASE_URL` (optional) for absolute submit links in emails

## Main routes

| Route | Purpose |
|-------|---------|
| `/` | Metrics |
| `/students` | Import/list students |
| `/tests` | Create/list tests |
| `/tests/[id]` | Add candidates, copy link, email, scores |
| `/submit/[token]` | Isolated public ZIP upload |
| `/queue` | Extract/score queue |
