-- Migration: הוספת עמודות city ו-photo_url לטבלת courts
ALTER TABLE courts ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE courts ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE courts ADD COLUMN IF NOT EXISTS notes TEXT;

-- אינדקס לחיפוש לפי עיר
CREATE INDEX IF NOT EXISTS courts_city_idx ON courts(city);
