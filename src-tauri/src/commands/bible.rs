use crate::state::AppState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct VerseResult {
    pub book: String,
    pub book_short: String,
    pub chapter: u32,
    pub verse: u32,
    pub text: String,
    pub translation: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BookInfo {
    pub long_name: String,
    pub short_name: String,
    pub chapters: u32,
    pub testament: String,
}

/// Search verses using SQLite LIKE query.
#[tauri::command]
pub fn search_verses(
    query: String,
    translation: String,
    state: State<'_, AppState>,
) -> Result<Vec<VerseResult>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let results = db
        .prepare(
            "SELECT book, book_short, chapter, verse, text, translation
             FROM verses
             WHERE text LIKE ?1 AND translation = ?2
             LIMIT 200",
        )
        .and_then(|mut stmt| {
            let pattern = format!("%{}%", query);
            stmt.query_map(params![pattern, translation], |row| {
                Ok(VerseResult {
                    book: row.get(0)?,
                    book_short: row.get(1)?,
                    chapter: row.get(2)?,
                    verse: row.get(3)?,
                    text: row.get(4)?,
                    translation: row.get(5)?,
                })
            })
            .and_then(|rows| rows.collect::<Result<Vec<_>, _>>())
        })
        .map_err(|e| e.to_string())?;

    Ok(results)
}

/// Get all verses in a chapter.
#[tauri::command]
pub fn get_chapter(
    book: String,
    chapter: u32,
    translation: String,
    state: State<'_, AppState>,
) -> Result<Vec<VerseResult>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let results = db
        .prepare(
            "SELECT book, book_short, chapter, verse, text, translation
             FROM verses
             WHERE book_short = ?1 AND chapter = ?2 AND translation = ?3
             ORDER BY verse ASC",
        )
        .and_then(|mut stmt| {
            stmt.query_map(params![book, chapter, translation], |row| {
                Ok(VerseResult {
                    book: row.get(0)?,
                    book_short: row.get(1)?,
                    chapter: row.get(2)?,
                    verse: row.get(3)?,
                    text: row.get(4)?,
                    translation: row.get(5)?,
                })
            })
            .and_then(|rows| rows.collect::<Result<Vec<_>, _>>())
        })
        .map_err(|e| e.to_string())?;

    Ok(results)
}

/// Get a single specific verse.
#[tauri::command]
pub fn get_verse(
    book: String,
    chapter: u32,
    verse: u32,
    translation: String,
    state: State<'_, AppState>,
) -> Result<Option<VerseResult>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let result = db
        .prepare(
            "SELECT book, book_short, chapter, verse, text, translation
             FROM verses
             WHERE book_short = ?1 AND chapter = ?2 AND verse = ?3 AND translation = ?4
             LIMIT 1",
        )
        .and_then(|mut stmt| {
            stmt.query_row(params![book, chapter, verse, translation], |row| {
                Ok(VerseResult {
                    book: row.get(0)?,
                    book_short: row.get(1)?,
                    chapter: row.get(2)?,
                    verse: row.get(3)?,
                    text: row.get(4)?,
                    translation: row.get(5)?,
                })
            })
        });

    match result {
        Ok(v) => Ok(Some(v)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// List all books — from DB if populated, else canonical hardcoded list.
#[tauri::command]
pub fn get_book_list(state: State<'_, AppState>) -> Result<Vec<BookInfo>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let verse_count: i64 = db
        .query_row("SELECT COUNT(*) FROM verses", [], |r| r.get(0))
        .unwrap_or(0);

    if verse_count == 0 {
        return Ok(canonical_book_list());
    }

    let results = db
        .prepare(
            "SELECT DISTINCT book, book_short,
                    MAX(chapter) as chapters,
                    CASE WHEN book_short IN ('GEN','EXO','LEV','NUM','DEU','JOS','JDG','RUT',
                        '1SA','2SA','1KI','2KI','1CH','2CH','EZR','NEH','EST','JOB','PSA',
                        'PRO','ECC','SNG','ISA','JER','LAM','EZK','DAN','HOS','JOL','AMO',
                        'OBA','JON','MIC','NAH','HAB','ZEP','HAG','ZEC','MAL')
                    THEN 'OT' ELSE 'NT' END as testament
             FROM verses
             GROUP BY book_short
             ORDER BY MIN(rowid)",
        )
        .and_then(|mut stmt| {
            stmt.query_map([], |row| {
                Ok(BookInfo {
                    long_name: row.get(0)?,
                    short_name: row.get(1)?,
                    chapters: row.get::<_, u32>(2)?,
                    testament: row.get(3)?,
                })
            })
            .and_then(|rows| rows.collect::<Result<Vec<_>, _>>())
        })
        .map_err(|e| e.to_string())?;

    if results.is_empty() {
        return Ok(canonical_book_list());
    }

    Ok(results)
}

fn canonical_book_list() -> Vec<BookInfo> {
    vec![
        BookInfo {
            long_name: "Genesis".into(),
            short_name: "GEN".into(),
            chapters: 50,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Exodus".into(),
            short_name: "EXO".into(),
            chapters: 40,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Leviticus".into(),
            short_name: "LEV".into(),
            chapters: 27,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Numbers".into(),
            short_name: "NUM".into(),
            chapters: 36,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Deuteronomy".into(),
            short_name: "DEU".into(),
            chapters: 34,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Joshua".into(),
            short_name: "JOS".into(),
            chapters: 24,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Judges".into(),
            short_name: "JDG".into(),
            chapters: 21,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Ruth".into(),
            short_name: "RUT".into(),
            chapters: 4,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "1 Samuel".into(),
            short_name: "1SA".into(),
            chapters: 31,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "2 Samuel".into(),
            short_name: "2SA".into(),
            chapters: 24,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "1 Kings".into(),
            short_name: "1KI".into(),
            chapters: 22,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "2 Kings".into(),
            short_name: "2KI".into(),
            chapters: 25,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "1 Chronicles".into(),
            short_name: "1CH".into(),
            chapters: 29,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "2 Chronicles".into(),
            short_name: "2CH".into(),
            chapters: 36,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Ezra".into(),
            short_name: "EZR".into(),
            chapters: 10,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Nehemiah".into(),
            short_name: "NEH".into(),
            chapters: 13,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Esther".into(),
            short_name: "EST".into(),
            chapters: 10,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Job".into(),
            short_name: "JOB".into(),
            chapters: 42,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Psalms".into(),
            short_name: "PSA".into(),
            chapters: 150,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Proverbs".into(),
            short_name: "PRO".into(),
            chapters: 31,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Ecclesiastes".into(),
            short_name: "ECC".into(),
            chapters: 12,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Song of Solomon".into(),
            short_name: "SNG".into(),
            chapters: 8,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Isaiah".into(),
            short_name: "ISA".into(),
            chapters: 66,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Jeremiah".into(),
            short_name: "JER".into(),
            chapters: 52,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Lamentations".into(),
            short_name: "LAM".into(),
            chapters: 5,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Ezekiel".into(),
            short_name: "EZK".into(),
            chapters: 48,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Daniel".into(),
            short_name: "DAN".into(),
            chapters: 12,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Hosea".into(),
            short_name: "HOS".into(),
            chapters: 14,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Joel".into(),
            short_name: "JOL".into(),
            chapters: 3,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Amos".into(),
            short_name: "AMO".into(),
            chapters: 9,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Obadiah".into(),
            short_name: "OBA".into(),
            chapters: 1,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Jonah".into(),
            short_name: "JON".into(),
            chapters: 4,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Micah".into(),
            short_name: "MIC".into(),
            chapters: 7,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Nahum".into(),
            short_name: "NAH".into(),
            chapters: 3,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Habakkuk".into(),
            short_name: "HAB".into(),
            chapters: 3,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Zephaniah".into(),
            short_name: "ZEP".into(),
            chapters: 3,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Haggai".into(),
            short_name: "HAG".into(),
            chapters: 2,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Zechariah".into(),
            short_name: "ZEC".into(),
            chapters: 14,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Malachi".into(),
            short_name: "MAL".into(),
            chapters: 4,
            testament: "OT".into(),
        },
        BookInfo {
            long_name: "Matthew".into(),
            short_name: "MAT".into(),
            chapters: 28,
            testament: "NT".into(),
        },
        BookInfo {
            long_name: "Mark".into(),
            short_name: "MRK".into(),
            chapters: 16,
            testament: "NT".into(),
        },
        BookInfo {
            long_name: "Luke".into(),
            short_name: "LUK".into(),
            chapters: 24,
            testament: "NT".into(),
        },
        BookInfo {
            long_name: "John".into(),
            short_name: "JHN".into(),
            chapters: 21,
            testament: "NT".into(),
        },
        BookInfo {
            long_name: "Acts".into(),
            short_name: "ACT".into(),
            chapters: 28,
            testament: "NT".into(),
        },
        BookInfo {
            long_name: "Romans".into(),
            short_name: "ROM".into(),
            chapters: 16,
            testament: "NT".into(),
        },
        BookInfo {
            long_name: "1 Corinthians".into(),
            short_name: "1CO".into(),
            chapters: 16,
            testament: "NT".into(),
        },
        BookInfo {
            long_name: "2 Corinthians".into(),
            short_name: "2CO".into(),
            chapters: 13,
            testament: "NT".into(),
        },
        BookInfo {
            long_name: "Galatians".into(),
            short_name: "GAL".into(),
            chapters: 6,
            testament: "NT".into(),
        },
        BookInfo {
            long_name: "Ephesians".into(),
            short_name: "EPH".into(),
            chapters: 6,
            testament: "NT".into(),
        },
        BookInfo {
            long_name: "Philippians".into(),
            short_name: "PHP".into(),
            chapters: 4,
            testament: "NT".into(),
        },
        BookInfo {
            long_name: "Colossians".into(),
            short_name: "COL".into(),
            chapters: 4,
            testament: "NT".into(),
        },
        BookInfo {
            long_name: "1 Thessalonians".into(),
            short_name: "1TH".into(),
            chapters: 5,
            testament: "NT".into(),
        },
        BookInfo {
            long_name: "2 Thessalonians".into(),
            short_name: "2TH".into(),
            chapters: 3,
            testament: "NT".into(),
        },
        BookInfo {
            long_name: "1 Timothy".into(),
            short_name: "1TI".into(),
            chapters: 6,
            testament: "NT".into(),
        },
        BookInfo {
            long_name: "2 Timothy".into(),
            short_name: "2TI".into(),
            chapters: 4,
            testament: "NT".into(),
        },
        BookInfo {
            long_name: "Titus".into(),
            short_name: "TIT".into(),
            chapters: 3,
            testament: "NT".into(),
        },
        BookInfo {
            long_name: "Philemon".into(),
            short_name: "PHM".into(),
            chapters: 1,
            testament: "NT".into(),
        },
        BookInfo {
            long_name: "Hebrews".into(),
            short_name: "HEB".into(),
            chapters: 13,
            testament: "NT".into(),
        },
        BookInfo {
            long_name: "James".into(),
            short_name: "JAS".into(),
            chapters: 5,
            testament: "NT".into(),
        },
        BookInfo {
            long_name: "1 Peter".into(),
            short_name: "1PE".into(),
            chapters: 5,
            testament: "NT".into(),
        },
        BookInfo {
            long_name: "2 Peter".into(),
            short_name: "2PE".into(),
            chapters: 3,
            testament: "NT".into(),
        },
        BookInfo {
            long_name: "1 John".into(),
            short_name: "1JN".into(),
            chapters: 5,
            testament: "NT".into(),
        },
        BookInfo {
            long_name: "2 John".into(),
            short_name: "2JN".into(),
            chapters: 1,
            testament: "NT".into(),
        },
        BookInfo {
            long_name: "3 John".into(),
            short_name: "3JN".into(),
            chapters: 1,
            testament: "NT".into(),
        },
        BookInfo {
            long_name: "Jude".into(),
            short_name: "JUD".into(),
            chapters: 1,
            testament: "NT".into(),
        },
        BookInfo {
            long_name: "Revelation".into(),
            short_name: "REV".into(),
            chapters: 22,
            testament: "NT".into(),
        },
    ]
}
