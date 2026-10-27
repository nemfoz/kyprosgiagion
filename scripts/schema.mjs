// Database tables, created idempotently by scripts/migrate.mjs (also used by scripts/sync.mjs).
// Must match lib/db/schema.ts (Drizzle) — column names are snake_case in both.

export const SCHEMA = [
  // ---- content ----
  `CREATE TABLE IF NOT EXISTS sites (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    slug            TEXT NOT NULL UNIQUE,
    type            TEXT NOT NULL DEFAULT 'church',
    region          TEXT NOT NULL DEFAULT 'famagusta',
    lat             REAL NOT NULL,
    lng             REAL NOT NULL,
    coords_verified INTEGER NOT NULL DEFAULT 0,
    published       INTEGER NOT NULL DEFAULT 0,
    content         TEXT NOT NULL DEFAULT '{}',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS photos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id    INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    src        TEXT NOT NULL,
    caption_el TEXT NOT NULL DEFAULT '',
    caption_en TEXT NOT NULL DEFAULT '',
    credit     TEXT NOT NULL DEFAULT '',
    sort       INTEGER NOT NULL DEFAULT 0
  )`,
  'CREATE INDEX IF NOT EXISTS photos_site ON photos(site_id, sort)',
  // YouTube videos embedded on a church page (only the video id is stored).
  `CREATE TABLE IF NOT EXISTS videos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id    INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    youtube_id TEXT NOT NULL,
    title_el   TEXT NOT NULL DEFAULT '',
    title_en   TEXT NOT NULL DEFAULT '',
    sort       INTEGER NOT NULL DEFAULT 0
  )`,
  'CREATE INDEX IF NOT EXISTS videos_site ON videos(site_id, sort)',
  // Proposals from users, waiting for an admin.
  `CREATE TABLE IF NOT EXISTS submissions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    kind         TEXT NOT NULL,                 -- 'create' | 'update'
    site_id      INTEGER REFERENCES sites(id) ON DELETE SET NULL,
    payload      TEXT NOT NULL,                 -- JSON: proposed site fields + new photos
    note         TEXT NOT NULL DEFAULT '',      -- message from the submitter
    status       TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
    author_id    TEXT NOT NULL,
    reviewer_id  TEXT,
    review_note  TEXT NOT NULL DEFAULT '',
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    reviewed_at  TEXT
  )`,
  'CREATE INDEX IF NOT EXISTS submissions_status ON submissions(status, created_at)',

  // ---- Better Auth (with admin plugin fields + "approved") ----
  `CREATE TABLE IF NOT EXISTS user (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    email          TEXT NOT NULL UNIQUE,
    email_verified INTEGER NOT NULL DEFAULT 0,
    image          TEXT,
    role           TEXT NOT NULL DEFAULT 'user',
    approved       INTEGER NOT NULL DEFAULT 0,
    banned         INTEGER DEFAULT 0,
    ban_reason     TEXT,
    ban_expires    INTEGER,
    created_at     INTEGER NOT NULL,
    updated_at     INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS session (
    id              TEXT PRIMARY KEY,
    expires_at      INTEGER NOT NULL,
    token           TEXT NOT NULL UNIQUE,
    ip_address      TEXT,
    user_agent      TEXT,
    user_id         TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    impersonated_by TEXT,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS session_user ON session(user_id)',
  `CREATE TABLE IF NOT EXISTS account (
    id                       TEXT PRIMARY KEY,
    account_id               TEXT NOT NULL,
    provider_id              TEXT NOT NULL,
    user_id                  TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    access_token             TEXT,
    refresh_token            TEXT,
    id_token                 TEXT,
    access_token_expires_at  INTEGER,
    refresh_token_expires_at INTEGER,
    scope                    TEXT,
    password                 TEXT,
    created_at               INTEGER NOT NULL,
    updated_at               INTEGER NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS account_user ON account(user_id)',
  `CREATE TABLE IF NOT EXISTS verification (
    id         TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value      TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS verification_identifier ON verification(identifier)',
  // Content imports already applied by scripts/migrate.mjs (each runs once).
  `CREATE TABLE IF NOT EXISTS data_imports (
    name       TEXT PRIMARY KEY,
    summary    TEXT NOT NULL DEFAULT '',
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // Metropolises of the Church of Cyprus: bilingual content JSON {el:{name,seat,summary,history}, en:{…}}.
  `CREATE TABLE IF NOT EXISTS metropolises (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    slug            TEXT NOT NULL UNIQUE,
    sort            INTEGER NOT NULL DEFAULT 0,
    website         TEXT NOT NULL DEFAULT '',
    feed_url        TEXT NOT NULL DEFAULT '',     -- RSS/Atom feed for the latest news
    logo            TEXT NOT NULL DEFAULT '',     -- stored copy (never hotlinked)
    content         TEXT NOT NULL DEFAULT '{}',
    news_fetched_at TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // Latest news items read from each Metropolis's feed (titles and links only — no copied images).
  `CREATE TABLE IF NOT EXISTS metropolis_news (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    metropolis_id  INTEGER NOT NULL REFERENCES metropolises(id) ON DELETE CASCADE,
    url            TEXT NOT NULL,
    title          TEXT NOT NULL,
    summary        TEXT NOT NULL DEFAULT '',
    published_at   TEXT,
    UNIQUE (metropolis_id, url)
  )`,
  'CREATE INDEX IF NOT EXISTS metropolis_news_recent ON metropolis_news(metropolis_id, published_at)',
  // Users' corrections to the interface text in the extra languages (lib/translations.ts).
  `CREATE TABLE IF NOT EXISTS translation_suggestions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    key         TEXT NOT NULL,
    locale      TEXT NOT NULL,
    text        TEXT NOT NULL,
    note        TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'pending',
    author_id   TEXT NOT NULL,
    reviewer_id TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    reviewed_at TEXT
  )`,
  'CREATE INDEX IF NOT EXISTS translation_suggestions_status ON translation_suggestions(status, locale)',
  // Site-wide settings edited in the admin, as JSON (e.g. 'points' — lib/points.ts).
  `CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_by TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS rate_limit (
    id           TEXT PRIMARY KEY,
    key          TEXT NOT NULL UNIQUE,
    count        INTEGER NOT NULL,
    last_request INTEGER NOT NULL
  )`,
];

// Columns added after the first release, for databases created earlier: [table, column, definition].
export const ADDED_COLUMNS = [
  ['photos', 'source_url', "TEXT NOT NULL DEFAULT ''"], // original page/image the photo came from
  ['submissions', 'points', 'INTEGER NOT NULL DEFAULT 0'], // awarded on approval (lib/completeness.ts)
  ['submissions', 'completed', "TEXT NOT NULL DEFAULT '[]'"], // missions and bonuses the approval earned (JSON)
  ['photos', 'historic', 'INTEGER NOT NULL DEFAULT 0'], // old/archive photo (bonus points)
  ['sites', 'metropolis_id', 'INTEGER REFERENCES metropolises(id) ON DELETE SET NULL'], // the Metropolis it belongs to
];
