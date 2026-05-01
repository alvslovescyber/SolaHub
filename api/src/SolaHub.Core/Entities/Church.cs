using SolaHub.Core.Common;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Core.Entities;

public sealed class Church : BaseEntity<ChurchId>
{
    // Required by EF Core for materialization — never called by application code
    private Church()
        : base(default!)
    {
        Name = string.Empty;
        AdminId = default;
    }

    private Church(ChurchId id, string name, UserId adminId)
        : base(id)
    {
        Name = name;
        AdminId = adminId;
    }

    public string Name { get; private set; }
    public string? Description { get; private set; }
    public string? LogoUrl { get; private set; }
    public string? Website { get; private set; }
    public string? Location { get; private set; }
    public UserId AdminId { get; private set; }
    public bool IsActive { get; private set; } = true;

    public static Result<Church> Create(string name, UserId adminId)
    {
        if (string.IsNullOrWhiteSpace(name))
            return Error.Validation(nameof(name), "Church name cannot be empty.");

        if (name.Length > 200)
            return Error.Validation(nameof(name), "Church name must not exceed 200 characters.");

        return new Church(ChurchId.New(), name.Trim(), adminId);
    }

    public Result UpdateDetails(string name, string? description, string? website, string? location)
    {
        if (string.IsNullOrWhiteSpace(name))
            return Result.Failure(Error.Validation(nameof(name), "Name cannot be empty."));

        Name = name.Trim();
        Description = description?.Trim();
        Website = website?.Trim();
        Location = location?.Trim();
        MarkUpdated();
        return Result.Ok;
    }

    public void SetLogo(string? logoUrl)
    {
        LogoUrl = logoUrl;
        MarkUpdated();
    }

    public Result TransferAdmin(UserId newAdminId)
    {
        if (newAdminId == AdminId)
            return Result.Failure(
                Error.Conflict(nameof(Church), "New admin must be a different user.")
            );

        AdminId = newAdminId;
        MarkUpdated();
        return Result.Ok;
    }
}
