-- הוסף push_token לטבלת users
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;

-- טבלת מועדפים
CREATE TABLE IF NOT EXISTS user_favorites (
  user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, court_id)
);

CREATE INDEX IF NOT EXISTS user_favorites_court_idx ON user_favorites(court_id);
