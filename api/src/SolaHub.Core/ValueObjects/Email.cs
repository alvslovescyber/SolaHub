using System.Text.RegularExpressions;
using SolaHub.Core.Common;

namespace SolaHub.Core.ValueObjects;

public sealed record Email
{
    private static readonly Regex EmailRegex = new(
        @"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase,
        TimeSpan.FromMilliseconds(100)
    );

    private Email(string value) => Value = value;

    public string Value { get; }

    public static Result<Email> Create(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return Error.Validation(nameof(Email), "Email cannot be empty.");

        email = email.Trim().ToLowerInvariant();

        if (!EmailRegex.IsMatch(email))
            return Error.Validation(nameof(Email), "Invalid email format.");

        return new Email(email);
    }

    public override string ToString() => Value;
}
