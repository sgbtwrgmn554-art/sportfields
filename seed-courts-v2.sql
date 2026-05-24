-- מחיקה והוספה מחדש עם מיקומים מדויקים
DELETE FROM courts WHERE added_by IS NULL;

INSERT INTO courts (name, address, location, sport_types, verified, photo_url) VALUES
-- תל אביב
('מגרש כדורסל גורדון', 'חוף גורדון, תל אביב', ST_MakePoint(34.7678, 32.0809)::geography, ARRAY['basketball'], true, 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400'),
('מגרש כדורגל הירקון', 'פארק הירקון, תל אביב', ST_MakePoint(34.8056, 32.0973)::geography, ARRAY['football'], true, 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=400'),
('מגרשי טניס הירקון', 'פארק הירקון, תל אביב', ST_MakePoint(34.7980, 32.0960)::geography, ARRAY['tennis'], true, 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400'),
('מגרש כדורסל לב תל אביב', 'רחוב דיזנגוף 50, תל אביב', ST_MakePoint(34.7740, 32.0790)::geography, ARRAY['basketball'], true, 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400'),
-- ירושלים
('מגרש ספורט גן סאקר', 'גן סאקר, ירושלים', ST_MakePoint(35.1997, 31.7887)::geography, ARRAY['basketball', 'football'], true, 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=400'),
('מגרש כדורסל קטמון', 'שכונת קטמון, ירושלים', ST_MakePoint(35.2012, 31.7650)::geography, ARRAY['basketball'], true, 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400'),
-- חיפה
('מגרש ספורט הדר', 'שכונת הדר, חיפה', ST_MakePoint(34.9885, 32.8184)::geography, ARRAY['basketball', 'football'], true, 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400'),
('מגרשי טניס כרמל', 'שדרות יצחק, חיפה', ST_MakePoint(34.9814, 32.8046)::geography, ARRAY['tennis'], true, 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400'),
-- באר שבע
('מגרש כדורסל הנגב', 'רחוב הנשיא, באר שבע', ST_MakePoint(34.7913, 31.2530)::geography, ARRAY['basketball'], true, 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400'),
('מגרש כדורגל עמק שרה', 'שכונת עמק שרה, באר שבע', ST_MakePoint(34.7990, 31.2610)::geography, ARRAY['football'], true, 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=400'),
-- ראשון לציון
('מגרש ספורט ראשון', 'פארק ראשון לציון', ST_MakePoint(34.8048, 31.9730)::geography, ARRAY['basketball', 'football'], true, 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400'),
('מגרשי טניס ראשון', 'שכונת נחלת יהודה, ראשון לציון', ST_MakePoint(34.8100, 31.9680)::geography, ARRAY['tennis'], true, 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400'),
-- נהריה
('מגרש כדורסל נהריה', 'ספורטק נהריה, נהריה', ST_MakePoint(35.0974, 33.0038)::geography, ARRAY['basketball'], true, 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400'),
('מגרש כדורגל נהריה', 'מגרש ספורט נהריה', ST_MakePoint(35.0960, 33.0050)::geography, ARRAY['football'], true, 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=400'),
('מגרשי טניס נהריה', 'רחוב הגעתון, נהריה', ST_MakePoint(35.0940, 33.0030)::geography, ARRAY['tennis'], true, 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400'),
-- עכו
('מגרש כדורסל עכו', 'שכונת וולפסון, עכו', ST_MakePoint(35.0827, 32.9331)::geography, ARRAY['basketball'], true, 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400'),
('אצטדיון עכו', 'כניסה דרומית, עכו', ST_MakePoint(35.0846, 32.9098)::geography, ARRAY['football'], true, 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=400'),
-- הקריות
('מגרש ספורט קריית אתא', 'מרכז קריית אתא', ST_MakePoint(35.1069, 32.8069)::geography, ARRAY['basketball', 'football'], true, 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400'),
('מגרש כדורסל קריית ביאליק', 'פארק קריית ביאליק', ST_MakePoint(35.0794, 32.8333)::geography, ARRAY['basketball'], true, 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400'),
('מגרש ספורט קריית מוצקין', 'מרכז קריית מוצקין', ST_MakePoint(35.0739, 32.8392)::geography, ARRAY['basketball', 'football'], true, 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=400'),
-- מרכז
('מגרש כדורסל רמת גן', 'פארק הלאומי, רמת גן', ST_MakePoint(34.8196, 32.0822)::geography, ARRAY['basketball'], true, 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400'),
('מגרש כדורגל גבעתיים', 'פארק גבעתיים', ST_MakePoint(34.8117, 32.0678)::geography, ARRAY['football'], true, 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=400'),
('מגרש ספורט פתח תקווה', 'פארק אפק, פתח תקווה', ST_MakePoint(34.8878, 32.0874)::geography, ARRAY['basketball', 'football'], true, 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400'),
('מגרש ספורט רעננה', 'פארק רעננה', ST_MakePoint(34.8719, 32.1841)::geography, ARRAY['basketball', 'tennis'], true, 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400'),
('מגרש ספורט נתניה', 'פארק נתניה', ST_MakePoint(34.8563, 32.3215)::geography, ARRAY['basketball', 'football'], true, 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400');
