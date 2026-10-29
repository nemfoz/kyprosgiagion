// Database tables, created idempotently by scripts/migrate.mjs.
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
  // Churches a user has visited (lib/visits.ts): "verified" = checked in within reach of the church. No location is kept.
  `CREATE TABLE IF NOT EXISTS visits (
    user_id    TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    site_id    INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    verified   INTEGER NOT NULL DEFAULT 0,
    visited_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, site_id)
  )`,
  'CREATE INDEX IF NOT EXISTS visits_site ON visits(site_id)',
  // A user's own settings outside Better Auth: whether their odoiporiko (/u/<id>) is public.
  `CREATE TABLE IF NOT EXISTS profiles (
    user_id    TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
    public     INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // Editions: one per Orthodox Church (lib/editions.ts). content = {name, church, title, intro} each {el, en}.
  `CREATE TABLE IF NOT EXISTS editions (
    id             TEXT PRIMARY KEY,
    sort           INTEGER NOT NULL DEFAULT 0,
    content        TEXT NOT NULL DEFAULT '{}',
    active         INTEGER NOT NULL DEFAULT 0,
    bounds         TEXT NOT NULL,                -- JSON [[south, west], [north, east]]
    camera         TEXT,                         -- JSON {bearing, pitch}
    default_region TEXT,
    countries      TEXT NOT NULL DEFAULT '[]',   -- JSON ISO codes, for the world map
    updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // Regions of an edition (districts, peninsulas…) — the map's filter and highlighted outline (lib/regions.ts).
  `CREATE TABLE IF NOT EXISTS regions (
    id         TEXT PRIMARY KEY,
    edition    TEXT NOT NULL DEFAULT 'cyprus',
    parent     TEXT,
    sort       INTEGER NOT NULL DEFAULT 0,
    name       TEXT NOT NULL DEFAULT '{}',      -- JSON {el, en}
    bounds     TEXT NOT NULL,                   -- JSON [[south, west], [north, east]]
    camera     TEXT,                            -- JSON {bearing, pitch}
    boundary   TEXT,                            -- GeoJSON (Multi)Polygon geometry, optional
    active     INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // Messages from the contact form (lib/messages-inbox.ts), read at /admin/messages.
  `CREATE TABLE IF NOT EXISTS contact_messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    topic      TEXT NOT NULL DEFAULT 'general',
    subject    TEXT NOT NULL DEFAULT '',
    body       TEXT NOT NULL,
    lang       TEXT NOT NULL DEFAULT 'el',
    user_id    TEXT,
    ip_hash    TEXT,                            -- salted hash, only for the hourly limit
    status     TEXT NOT NULL DEFAULT 'new',     -- 'new' | 'read' | 'done'
    emailed    INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    handled_by TEXT,
    handled_at TEXT
  )`,
  'CREATE INDEX IF NOT EXISTS contact_messages_status ON contact_messages(status, created_at)',
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
  ['metropolises', 'edition', "TEXT NOT NULL DEFAULT 'cyprus'"], // the Church (edition) the see belongs to
  ['contact_messages', 'ip_hash', 'TEXT'], // salted hash of the sender's address, for the hourly limit
];
