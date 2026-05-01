using Microsoft.EntityFrameworkCore;
using SolaHub.Core.Entities;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;
using SolaHub.Infrastructure.Persistence;

namespace SolaHub.Infrastructure.Repositories;

public sealed class VerseNoteRepository(AppDbContext db) : IVerseNoteRepository
{
    public Task<VerseNote?> GetByIdAsync(VerseNoteId id, CancellationToken ct) =>
        db.VerseNotes.FirstOrDefaultAsync(n => n.Id == id, ct);

    public async Task<IReadOnlyList<VerseNote>> GetByUserAsync(UserId userId, CancellationToken ct)
    {
        var notes = await db
            .VerseNotes.Where(n => n.UserId == userId)
            .OrderByDescending(n => n.UpdatedAt)
            .ToListAsync(ct);
        return notes.AsReadOnly();
    }

    public async Task<IReadOnlyList<VerseNote>> GetByVerseRefAsync(
        VerseRef verseRef,
        bool sharedOnly,
        CancellationToken ct
    )
    {
        var query = db.VerseNotes.Where(n =>
            n.VerseRef.BookShort == verseRef.BookShort
            && n.VerseRef.Chapter == verseRef.Chapter
            && n.VerseRef.Verse == verseRef.Verse
        );

        if (sharedOnly)
            query = query.Where(n => n.IsShared);

        var notes = await query.OrderByDescending(n => n.CreatedAt).ToListAsync(ct);
        return notes.AsReadOnly();
    }

    public async Task<IReadOnlyList<VerseNote>> SearchByTagAsync(
        UserId userId,
        string tag,
        CancellationToken ct
    )
    {
        var normalized = tag.Trim().ToLowerInvariant();
        // Use EF Core + PostgreSQL JSONB contains for tag search
        var notes = await db
            .VerseNotes.Where(n => n.UserId == userId)
            .Where(n =>
                EF.Functions.JsonContains(EF.Property<string>(n, "_tags"), $"\"{normalized}\"")
            )
            .OrderByDescending(n => n.UpdatedAt)
            .ToListAsync(ct);
        return notes.AsReadOnly();
    }

    public async Task AddAsync(VerseNote note, CancellationToken ct)
    {
        await db.VerseNotes.AddAsync(note, ct);
        await db.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(VerseNote note, CancellationToken ct)
    {
        db.VerseNotes.Update(note);
        await db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(VerseNoteId id, CancellationToken ct)
    {
        await db.VerseNotes.Where(n => n.Id == id).ExecuteDeleteAsync(ct);
    }
}
