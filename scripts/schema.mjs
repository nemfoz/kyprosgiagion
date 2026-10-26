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
];

// Columns added after the first release, for databases created earlier: [table, column, definition].
export const ADDED_COLUMNS = [
  ['photos', 'source_url', "TEXT NOT NULL DEFAULT ''"], // original page/image the photo came from
];
