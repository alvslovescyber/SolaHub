namespace SolaHub.Core.ValueObjects;

public readonly record struct UserId
{
    public UserId(Guid value) => Value = StronglyTypedId.RequireNonEmpty(value, nameof(UserId));

    public Guid Value { get; }

    public static UserId New() => new(StronglyTypedId.NewSequentialGuid());

    public static UserId From(Guid value) => new(value);

    public override string ToString() => Value.ToString();
}

public readonly record struct UserSessionId
{
    public UserSessionId(Guid value) =>
        Value = StronglyTypedId.RequireNonEmpty(value, nameof(UserSessionId));

    public Guid Value { get; }

    public static UserSessionId New() => new(StronglyTypedId.NewSequentialGuid());

    public static UserSessionId From(Guid value) => new(value);

    public override string ToString() => Value.ToString();
}

public readonly record struct ChurchId
{
    public ChurchId(Guid value) => Value = StronglyTypedId.RequireNonEmpty(value, nameof(ChurchId));

    public Guid Value { get; }

    public static ChurchId New() => new(StronglyTypedId.NewSequentialGuid());

    public static ChurchId From(Guid value) => new(value);

    public override string ToString() => Value.ToString();
}

public readonly record struct VerseNoteId
{
    public VerseNoteId(Guid value) =>
        Value = StronglyTypedId.RequireNonEmpty(value, nameof(VerseNoteId));

    public Guid Value { get; }

    public static VerseNoteId New() => new(StronglyTypedId.NewSequentialGuid());

    public static VerseNoteId From(Guid value) => new(value);

    public override string ToString() => Value.ToString();
}

public readonly record struct ReadingPlanId
{
    public ReadingPlanId(Guid value) =>
        Value = StronglyTypedId.RequireNonEmpty(value, nameof(ReadingPlanId));

    public Guid Value { get; }

    public static ReadingPlanId New() => new(StronglyTypedId.NewSequentialGuid());

    public static ReadingPlanId From(Guid value) => new(value);

    public override string ToString() => Value.ToString();
}

public readonly record struct CommunityPostId
{
    public CommunityPostId(Guid value) =>
        Value = StronglyTypedId.RequireNonEmpty(value, nameof(CommunityPostId));

    public Guid Value { get; }

    public static CommunityPostId New() => new(StronglyTypedId.NewSequentialGuid());

    public static CommunityPostId From(Guid value) => new(value);

    public override string ToString() => Value.ToString();
}

public readonly record struct PresentationId
{
    public PresentationId(Guid value) =>
        Value = StronglyTypedId.RequireNonEmpty(value, nameof(PresentationId));

    public Guid Value { get; }

    public static PresentationId New() => new(StronglyTypedId.NewSequentialGuid());

    public static PresentationId From(Guid value) => new(value);

    public override string ToString() => Value.ToString();
}

internal static class StronglyTypedId
{
    public static Guid NewSequentialGuid() => Guid.CreateVersion7();

    public static Guid RequireNonEmpty(Guid value, string name)
    {
        if (value == Guid.Empty)
            throw new ArgumentException($"{name} cannot be an empty UUID.", nameof(value));

        return value;
    }
}
