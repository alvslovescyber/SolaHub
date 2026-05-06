using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SolaHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddUserSessions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "ix_users_refresh_token", table: "users");

            migrationBuilder.CreateTable(
                name: "user_sessions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    refresh_token_hash = table.Column<string>(
                        type: "character varying(500)",
                        maxLength: 500,
                        nullable: false
                    ),
                    expires_at = table.Column<DateTimeOffset>(
                        type: "timestamp with time zone",
                        nullable: false
                    ),
                    last_used_at = table.Column<DateTimeOffset>(
                        type: "timestamp with time zone",
                        nullable: false
                    ),
                    revoked_at = table.Column<DateTimeOffset>(
                        type: "timestamp with time zone",
                        nullable: true
                    ),
                    created_at = table.Column<DateTimeOffset>(
                        type: "timestamp with time zone",
                        nullable: false
                    ),
                    updated_at = table.Column<DateTimeOffset>(
                        type: "timestamp with time zone",
                        nullable: false
                    ),
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_user_sessions", x => x.id);
                    table.ForeignKey(
                        name: "fk_user_sessions_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade
                    );
                }
            );

            migrationBuilder.CreateIndex(
                name: "ix_user_sessions_expires_at",
                table: "user_sessions",
                column: "expires_at"
            );

            migrationBuilder.CreateIndex(
                name: "ix_user_sessions_refresh_token_hash",
                table: "user_sessions",
                column: "refresh_token_hash",
                unique: true
            );

            migrationBuilder.CreateIndex(
                name: "ix_user_sessions_user_id",
                table: "user_sessions",
                column: "user_id"
            );

            migrationBuilder.Sql(
                """
                CREATE EXTENSION IF NOT EXISTS pgcrypto;

                INSERT INTO user_sessions (
                  id,
                  user_id,
                  refresh_token_hash,
                  expires_at,
                  last_used_at,
                  created_at,
                  updated_at
                )
                SELECT
                  gen_random_uuid(),
                  id,
                  refresh_token,
                  refresh_token_expiry,
                  COALESCE(last_login_at, updated_at, created_at, now()),
                  now(),
                  now()
                FROM users
                WHERE refresh_token IS NOT NULL
                  AND refresh_token_expiry IS NOT NULL
                  AND refresh_token_expiry > now();
                """
            );

            migrationBuilder.DropColumn(name: "refresh_token", table: "users");

            migrationBuilder.DropColumn(name: "refresh_token_expiry", table: "users");

            migrationBuilder.Sql(
                """
                ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
                ALTER TABLE user_sessions FORCE ROW LEVEL SECURITY;

                CREATE POLICY user_sessions_admin ON user_sessions
                  AS PERMISSIVE FOR ALL
                  USING (current_setting('app.is_admin', true) = 'true');

                CREATE POLICY user_sessions_auth_context_select ON user_sessions
                  AS PERMISSIVE FOR SELECT
                  USING (current_setting('app.auth_context', true) = 'true');

                CREATE POLICY user_sessions_auth_context_insert ON user_sessions
                  AS PERMISSIVE FOR INSERT
                  WITH CHECK (current_setting('app.auth_context', true) = 'true');

                CREATE POLICY user_sessions_auth_context_update ON user_sessions
                  AS PERMISSIVE FOR UPDATE
                  USING (current_setting('app.auth_context', true) = 'true')
                  WITH CHECK (current_setting('app.auth_context', true) = 'true');

                CREATE POLICY user_sessions_auth_context_delete ON user_sessions
                  AS PERMISSIVE FOR DELETE
                  USING (current_setting('app.auth_context', true) = 'true');
                """
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "refresh_token",
                table: "users",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true
            );

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "refresh_token_expiry",
                table: "users",
                type: "timestamp with time zone",
                nullable: true
            );

            migrationBuilder.CreateIndex(
                name: "ix_users_refresh_token",
                table: "users",
                column: "refresh_token",
                filter: "refresh_token IS NOT NULL"
            );

            migrationBuilder.Sql(
                """
                SET app.auth_context = 'true';

                UPDATE users u
                SET
                  refresh_token = latest.refresh_token_hash,
                  refresh_token_expiry = latest.expires_at
                FROM (
                  SELECT DISTINCT ON (user_id)
                    user_id,
                    refresh_token_hash,
                    expires_at
                  FROM user_sessions
                  WHERE revoked_at IS NULL
                    AND expires_at > now()
                  ORDER BY user_id, last_used_at DESC, updated_at DESC
                ) latest
                WHERE latest.user_id = u.id;

                DROP POLICY IF EXISTS user_sessions_auth_context_delete ON user_sessions;
                DROP POLICY IF EXISTS user_sessions_auth_context_update ON user_sessions;
                DROP POLICY IF EXISTS user_sessions_auth_context_insert ON user_sessions;
                DROP POLICY IF EXISTS user_sessions_auth_context_select ON user_sessions;
                DROP POLICY IF EXISTS user_sessions_admin ON user_sessions;

                SET app.auth_context = 'false';
                """
            );

            migrationBuilder.DropTable(name: "user_sessions");
        }
    }
}
