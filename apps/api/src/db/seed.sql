-- מגרשים לדוגמה בערים ראשיות בישראל

INSERT INTO courts (name, address, location, sport_types, verified) VALUES
-- תל אביב
('מגרש כדורסל גורדון', 'רחוב גורדון, תל אביב', ST_MakePoint(34.7648, 32.0853)::geography, ARRAY['basketball'], true),
('מגרש כדורגל הירקון', 'פארק הירקון, תל אביב', ST_MakePoint(34.7983, 32.1010)::geography, ARRAY['football'], true),
('מגרשי טניס הירקון', 'פארק הירקון, תל אביב', ST_MakePoint(34.7920, 32.0990)::geography, ARRAY['tennis'], true),
('מגרש כדורסל לב תל אביב', 'רחוב דיזנגוף, תל אביב', ST_MakePoint(34.7740, 32.0790)::geography, ARRAY['basketball'], true),

-- ירושלים
('מגרש ספורט גן סאקר', 'גן סאקר, ירושלים', ST_MakePoint(35.2024, 31.7830)::geography, ARRAY['basketball', 'football'], true),
('מלחה ספורט', 'קניון מלחה, ירושלים', ST_MakePoint(35.1847, 31.7469)::geography, ARRAY['basketball'], true),

-- חיפה
('מגרש ספורט הדר', 'שכונת הדר, חיפה', ST_MakePoint(34.9957, 32.8191)::geography, ARRAY['basketball', 'football'], true),
('פארק הכרמל', 'הכרמל, חיפה', ST_MakePoint(34.9756, 32.7940)::geography, ARRAY['tennis'], true),

-- באר שבע
('מגרש כדורסל הנגב', 'מרכז העיר, באר שבע', ST_MakePoint(34.7913, 31.2530)::geography, ARRAY['basketball'], true),

-- ראשון לציון
('מגרש ספורט ראשון', 'פארק ראשון לציון', ST_MakePoint(34.8048, 31.9730)::geography, ARRAY['basketball', 'football'], true);
