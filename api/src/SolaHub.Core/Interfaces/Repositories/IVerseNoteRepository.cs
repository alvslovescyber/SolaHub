using SolaHub.Core.Entities;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Core.Interfaces.Repositories;

public interface IVerseNoteRepository
{
    Task<VerseNote?> GetByIdAsync(VerseNoteId id, CancellationToken ct = default);
    Task<IReadOnlyList<VerseNote>> GetByUserAsync(UserId userId, CancellationToken ct = default);
    Task<IReadOnlyList<VerseNote>> GetByVerseRefAsync(
        VerseRef verseRef,
        bool sharedOnly = false,
        CancellationToken ct = default
    );
    Task<IReadOnlyList<VerseNote>> SearchByTagAsync(
        UserId userId,
        string tag,
        CancellationToken ct = default
    );
    Task AddAsync(VerseNote note, CancellationToken ct = default);
    Task UpdateAsync(VerseNote note, CancellationToken ct = default);
    Task DeleteAsync(VerseNoteId id, CancellationToken ct = default);
}
