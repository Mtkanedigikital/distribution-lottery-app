DROP TABLE IF EXISTS entries CASCADE;
DROP TABLE IF EXISTS prizes CASCADE;

CREATE TABLE prizes (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  result_time_jst  TIMESTAMPTZ NOT NULL,
  publish_time_utc TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE entries (
  id           BIGSERIAL PRIMARY KEY,
  prize_id     TEXT NOT NULL REFERENCES prizes(id) ON DELETE CASCADE,
  entry_number TEXT NOT NULL,
  password     TEXT NOT NULL,
  is_winner    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX entries_unique_per_prize ON entries(prize_id, entry_number);
CREATE INDEX entries_prize_id_idx ON entries(prize_id);