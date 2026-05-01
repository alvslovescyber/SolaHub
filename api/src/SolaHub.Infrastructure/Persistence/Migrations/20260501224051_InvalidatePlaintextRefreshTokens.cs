using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SolaHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InvalidatePlaintextRefreshTokens : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Refresh tokens are now stored as HMAC-SHA256 hashes; invalidate legacy plaintext values.
            migrationBuilder.Sql("UPDATE users SET refresh_token = NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Cannot restore revoked refresh tokens.
        }
    }
}
