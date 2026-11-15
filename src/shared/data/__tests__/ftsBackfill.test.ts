import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(__dirname, '../../../../drizzle');
const run = (db: Database.Database, file: string) => {
  for (const part of fs.readFileSync(path.join(dir, file), 'utf8').split('--> statement-breakpoint'))
    db.exec(part);
};
const hits = (db: Database.Database, term: string) =>
  db.prepare('SELECT rowid FROM stories_fts WHERE stories_fts MATCH ? ORDER BY rowid').all(term);

describe('0002_stories_fts_backfill', () => {
  it('indexes stories that were cached before the FTS migration', () => {
    const db = new Database(':memory:');
    run(db, '0000_init.sql');
    db.prepare(
      "INSERT INTO items (id, type, title, text, fetched_at) VALUES (1, 'story', 'Rust internals', NULL, 1)",
    ).run();
    db.prepare(
      "INSERT INTO items (id, type, title, text, fetched_at) VALUES (2, 'comment', NULL, 'rust comment', 1)",
    ).run();
    run(db, '0001_stories_fts.sql');
    expect(hits(db, 'rust')).toEqual([]);

    run(db, '0002_stories_fts_backfill.sql');
    expect(hits(db, 'rust')).toEqual([{ rowid: 1 }]);
    // Idempotent: a second run does not duplicate entries.
    run(db, '0002_stories_fts_backfill.sql');
    expect(hits(db, 'rust')).toEqual([{ rowid: 1 }]);
  });
});
