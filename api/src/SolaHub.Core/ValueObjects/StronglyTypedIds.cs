namespace SolaHub.Core.ValueObjects;

public readonly record struct UserId(Guid Value)
{
    public static UserId New() => new(Guid.NewGuid());

    public static UserId From(Guid value) => new(value);

    public override string ToString() => Value.ToString();
}

public readonly record struct ChurchId(Guid Value)
{
    public static ChurchId New() => new(Guid.NewGuid());

    public static ChurchId From(Guid value) => new(value);

    public override string ToString() => Value.ToString();
}

public readonly record struct VerseNoteId(Guid Value)
{
    public static VerseNoteId New() => new(Guid.NewGuid());

    public static VerseNoteId From(Guid value) => new(value);

    public override string ToString() => Value.ToString();
}

public readonly record struct ReadingPlanId(Guid Value)
{
    public static ReadingPlanId New() => new(Guid.NewGuid());

    public static ReadingPlanId From(Guid value) => new(value);

    public override string ToString() => Value.ToString();
}

public readonly record struct PresentationId(Guid Value)
{
    public static PresentationId New() => new(Guid.NewGuid());

    public static PresentationId From(Guid value) => new(value);

    public override string ToString() => Value.ToString();
}
