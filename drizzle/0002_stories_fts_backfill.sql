-- 0001 created the FTS index and its triggers but did not index stories already cached.
-- Clear the index and rebuild it from the rows the triggers would have indexed (safe to run on any state).
INSERT INTO stories_fts(stories_fts) VALUES ('delete-all');
--> statement-breakpoint
INSERT INTO stories_fts(rowid, title, text) SELECT id, title, text FROM items WHERE title IS NOT NULL;
