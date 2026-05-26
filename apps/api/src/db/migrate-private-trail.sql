-- הוספת תמיכה במקומות פרטיים + מידע שביל
ALTER TABLE courts
  ADD COLUMN IF NOT EXISTS is_private     BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS access_code    VARCHAR(8),
  ADD COLUMN IF NOT EXISTS trail_km       NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS trail_minutes  INTEGER,
  ADD COLUMN IF NOT EXISTS trail_difficulty VARCHAR(10); -- easy / medium / hard
