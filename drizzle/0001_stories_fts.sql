-- FTS5 index over cached stories (rows with a title). External-content table:
-- the text lives in `items`; triggers keep the index in step with it.
CREATE VIRTUAL TABLE `stories_fts` USING fts5(title, text, content='items', content_rowid='id', tokenize='porter unicode61');
--> statement-breakpoint
CREATE TRIGGER `items_fts_insert` AFTER INSERT ON `items` WHEN new.title IS NOT NULL BEGIN
  INSERT INTO stories_fts(rowid, title, text) VALUES (new.id, new.title, new.text);
END;
--> statement-breakpoint
CREATE TRIGGER `items_fts_delete` AFTER DELETE ON `items` WHEN old.title IS NOT NULL BEGIN
  INSERT INTO stories_fts(stories_fts, rowid, title, text) VALUES ('delete', old.id, old.title, old.text);
END;
--> statement-breakpoint
CREATE TRIGGER `items_fts_update` AFTER UPDATE ON `items` BEGIN
  INSERT INTO stories_fts(stories_fts, rowid, title, text) SELECT 'delete', old.id, old.title, old.text WHERE old.title IS NOT NULL;
  INSERT INTO stories_fts(rowid, title, text) SELECT new.id, new.title, new.text WHERE new.title IS NOT NULL;
END;
