-- ניקוי וזריעה מחדש עם מיקומים אמיתיים וכל סוגי הספורט
DELETE FROM courts WHERE added_by IS NULL;

INSERT INTO courts (name, address, location, sport_types, verified, photo_url) VALUES

-- ══════════════════════════════════════
--  תל אביב
-- ══════════════════════════════════════

-- מגרשי כדורסל גורדון (החוף — המפורסמים)
('מגרשי כדורסל גורדון',   'חוף גורדון, תל אביב',              ST_MakePoint(34.7672, 32.0817)::geography, ARRAY['basketball'], true,
 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400'),

-- ספורטק הירקון — כדורסל
('ספורטק הירקון — כדורסל', 'פארק הירקון, תל אביב',             ST_MakePoint(34.7986, 32.0993)::geography, ARRAY['basketball'], true,
 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400'),

-- ספורטק הירקון — כדורגל
('ספורטק הירקון — כדורגל', 'פארק הירקון, תל אביב',             ST_MakePoint(34.8052, 32.1028)::geography, ARRAY['football'], true,
 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=400'),

-- ספורטק הירקון — טניס
('ספורטק הירקון — טניס',   'פארק הירקון, תל אביב',             ST_MakePoint(34.7982, 32.0990)::geography, ARRAY['tennis'], true,
 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400'),

-- ספורטק הירקון — כדורעף חוף
('ספורטק הירקון — כדורעף', 'פארק הירקון, תל אביב',             ST_MakePoint(34.7979, 32.0988)::geography, ARRAY['volleyball'], true,
 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400'),

-- ספורטק הירקון — סקייטפארק
('סקייטפארק הירקון',       'ספורטק פארק הירקון, תל אביב',      ST_MakePoint(34.7991, 32.0997)::geography, ARRAY['skate'], true,
 'https://images.unsplash.com/photo-1564156280315-1d42b4651629?w=400'),

-- כדורעף חוף גורדון
('כדורעף חוף גורדון',      'חוף גורדון, תל אביב',              ST_MakePoint(34.7665, 32.0813)::geography, ARRAY['volleyball'], true,
 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400'),

-- כושר חוץ חוף פרישמן
('כושר חוץ חוף פרישמן',   'חוף פרישמן, תל אביב',              ST_MakePoint(34.7658, 32.0796)::geography, ARRAY['fitness'], true,
 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400'),

-- כושר חוץ חוף הצוק (צפון ת"א)
('כושר חוץ חוף הצוק',      'חוף הצוק, תל אביב',               ST_MakePoint(34.7937, 32.1282)::geography, ARRAY['fitness'], true,
 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400'),

-- ══════════════════════════════════════
--  ירושלים
-- ══════════════════════════════════════

-- גן סאקר כדורסל + כדורגל
('גן סאקר — כדורסל וכדורגל', 'גן סאקר, ירושלים',              ST_MakePoint(35.2063, 31.7908)::geography, ARRAY['basketball','football'], true,
 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400'),

-- כדורעף גן הפעמון
('כדורעף גן הפעמון',        'גן הפעמון (Liberty Bell), ירושלים', ST_MakePoint(35.2176, 31.7721)::geography, ARRAY['volleyball'], true,
 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400'),

-- כדורסל קטמון
('מגרש כדורסל קטמון',      'שכונת קטמון, ירושלים',             ST_MakePoint(35.2023, 31.7635)::geography, ARRAY['basketball'], true,
 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400'),

-- כושר חוץ עין לבן
('כושר חוץ עין לבן',        'שמורת עין לבן, ירושלים',           ST_MakePoint(35.1882, 31.7500)::geography, ARRAY['fitness'], true,
 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400'),

-- ══════════════════════════════════════
--  חיפה
-- ══════════════════════════════════════

-- כדורסל + כדורגל הדר
('מגרש ספורט הדר',          'שכונת הדר, חיפה',                  ST_MakePoint(34.9892, 32.8182)::geography, ARRAY['basketball','football'], true,
 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400'),

-- טניס כרמל
('מגרשי טניס הכרמל',        'שדרות יצחק, הכרמל, חיפה',          ST_MakePoint(34.9891, 32.7952)::geography, ARRAY['tennis'], true,
 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400'),

-- כושר חוץ חוף בת גלים
('כושר חוץ חוף בת גלים',    'חוף בת גלים, חיפה',               ST_MakePoint(34.9695, 32.8330)::geography, ARRAY['fitness'], true,
 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400'),

-- סקייטפארק חוף דדו
('סקייטפארק דדו',           'חוף דדו, חיפה',                    ST_MakePoint(34.9733, 32.8087)::geography, ARRAY['skate'], true,
 'https://images.unsplash.com/photo-1564156280315-1d42b4651629?w=400'),

-- כדורעף חוף זמיר
('כדורעף חוף זמיר',         'חוף זמיר, חיפה',                   ST_MakePoint(34.9720, 32.8110)::geography, ARRAY['volleyball'], true,
 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400'),

-- ══════════════════════════════════════
--  באר שבע
-- ══════════════════════════════════════

-- כדורסל פארק
('מגרש כדורסל פארק באר שבע', 'פארק העיר, באר שבע',             ST_MakePoint(34.7974, 31.2455)::geography, ARRAY['basketball'], true,
 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400'),

-- כדורגל עמק שרה
('מגרש כדורגל עמק שרה',     'שכונת עמק שרה, באר שבע',          ST_MakePoint(34.7989, 31.2618)::geography, ARRAY['football'], true,
 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=400'),

-- כושר חוץ נחל באר שבע
('כושר חוץ נחל באר שבע',    'טיילת נחל באר שבע',               ST_MakePoint(34.7912, 31.2501)::geography, ARRAY['fitness'], true,
 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400'),

-- ══════════════════════════════════════
--  ראשון לציון
-- ══════════════════════════════════════

('מגרש ספורט ראשון לציון', 'פארק ראשון לציון',                  ST_MakePoint(34.8048, 31.9727)::geography, ARRAY['basketball','football'], true,
 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400'),

('מגרשי טניס נחלת יהודה',   'שכונת נחלת יהודה, ראשון לציון',   ST_MakePoint(34.8102, 31.9682)::geography, ARRAY['tennis'], true,
 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400'),

('כדורעף ראשון לציון',      'פארק ראשון לציון',                  ST_MakePoint(34.8055, 31.9735)::geography, ARRAY['volleyball'], true,
 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400'),

-- ══════════════════════════════════════
--  נתניה
-- ══════════════════════════════════════

('מגרש ספורט נתניה',        'פארק ניצנים, נתניה',               ST_MakePoint(34.8562, 32.3214)::geography, ARRAY['basketball','football'], true,
 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400'),

-- כדורעף חוף נתניה
('כדורעף חוף נתניה',        'חוף עירוני נתניה',                  ST_MakePoint(34.8521, 32.3356)::geography, ARRAY['volleyball'], true,
 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400'),

-- ══════════════════════════════════════
--  רעננה
-- ══════════════════════════════════════

('פארק ספורט רעננה',        'פארק רעננה',                        ST_MakePoint(34.8720, 32.1842)::geography, ARRAY['basketball','tennis'], true,
 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400'),

-- ══════════════════════════════════════
--  מרכז
-- ══════════════════════════════════════

('מגרש כדורסל רמת גן',      'פארק הלאומי, רמת גן',              ST_MakePoint(34.8194, 32.0821)::geography, ARRAY['basketball'], true,
 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400'),

('מגרש כדורגל גבעתיים',     'פארק גבעתיים',                      ST_MakePoint(34.8115, 32.0680)::geography, ARRAY['football'], true,
 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=400'),

('מגרש ספורט פתח תקווה',    'פארק אפק, פתח תקווה',              ST_MakePoint(34.8876, 32.0874)::geography, ARRAY['basketball','football'], true,
 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400'),

-- סקייטפארק הוד השרון
('סקייטפארק הוד השרון',     'פארק עירוני, הוד השרון',            ST_MakePoint(34.8883, 32.1497)::geography, ARRAY['skate'], true,
 'https://images.unsplash.com/photo-1564156280315-1d42b4651629?w=400'),

-- ══════════════════════════════════════
--  נהריה
-- ══════════════════════════════════════

('מגרש כדורסל נהריה',       'ספורטק נהריה',                      ST_MakePoint(35.0972, 33.0038)::geography, ARRAY['basketball'], true,
 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400'),

('מגרשי טניס נהריה',        'רחוב הגעתון, נהריה',               ST_MakePoint(35.0941, 33.0030)::geography, ARRAY['tennis'], true,
 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400'),

-- כדורעף חוף נהריה
('כדורעף חוף נהריה',        'חוף גלים, נהריה',                   ST_MakePoint(35.0897, 33.0068)::geography, ARRAY['volleyball'], true,
 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400'),

-- ══════════════════════════════════════
--  עכו
-- ══════════════════════════════════════

('מגרש כדורסל עכו',         'שכונת וולפסון, עכו',               ST_MakePoint(35.0821, 32.9326)::geography, ARRAY['basketball'], true,
 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400'),

('מגרש כדורגל עכו',         'אצטדיון עכו',                       ST_MakePoint(35.0846, 32.9168)::geography, ARRAY['football'], true,
 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=400'),

-- ══════════════════════════════════════
--  הקריות
-- ══════════════════════════════════════

('מגרש ספורט קריית אתא',   'מרכז קריית אתא',                    ST_MakePoint(35.1067, 32.8069)::geography, ARRAY['basketball','football'], true,
 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400'),

('מגרש כדורסל קריית ביאליק', 'פארק קריית ביאליק',               ST_MakePoint(35.0792, 32.8333)::geography, ARRAY['basketball'], true,
 'https://images.unsplash.com/photo-1546519638405-a9f168a1fd25?w=400'),

-- כושר חוץ קריית ים (חוף)
('כושר חוץ חוף קריית ים',   'חוף קריית ים',                     ST_MakePoint(35.0762, 32.8538)::geography, ARRAY['fitness'], true,
 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400');
