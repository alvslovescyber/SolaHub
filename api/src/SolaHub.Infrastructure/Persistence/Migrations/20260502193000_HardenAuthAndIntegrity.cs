using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SolaHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class HardenAuthAndIntegrity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "session_version",
                table: "users",
                type: "integer",
                nullable: false,
                defaultValue: 0
            );

            migrationBuilder
                .AlterColumn<int>(
                    name: "day_number",
                    table: "reading_plan_days",
                    type: "integer",
                    nullable: false,
                    oldClrType: typeof(int),
                    oldType: "integer"
                )
                .OldAnnotation(
                    "Npgsql:ValueGenerationStrategy",
                    NpgsqlValueGenerationStrategy.IdentityByDefaultColumn
                );

            migrationBuilder.CreateIndex(
                name: "ix_plan_participants_user_id",
                table: "plan_participants",
                column: "user_id"
            );

            migrationBuilder.AddForeignKey(
                name: "fk_churches_users_admin_id",
                table: "churches",
                column: "admin_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict
            );

            migrationBuilder.AddForeignKey(
                name: "fk_plan_participants_users_user_id",
                table: "plan_participants",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade
            );

            migrationBuilder.AddForeignKey(
                name: "fk_reading_plans_churches_church_id",
                table: "reading_plans",
                column: "church_id",
                principalTable: "churches",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull
            );

            migrationBuilder.AddForeignKey(
                name: "fk_reading_plans_users_created_by",
                table: "reading_plans",
                column: "created_by",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict
            );

            migrationBuilder.AddForeignKey(
                name: "fk_users_churches_church_id",
                table: "users",
                column: "church_id",
                principalTable: "churches",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull
            );

            migrationBuilder.AddForeignKey(
                name: "fk_verse_notes_users_user_id",
                table: "verse_notes",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(name: "fk_churches_users_admin_id", table: "churches");
            migrationBuilder.DropForeignKey(
                name: "fk_plan_participants_users_user_id",
                table: "plan_participants"
            );
            migrationBuilder.DropForeignKey(
                name: "fk_reading_plans_churches_church_id",
                table: "reading_plans"
            );
            migrationBuilder.DropForeignKey(
                name: "fk_reading_plans_users_created_by",
                table: "reading_plans"
            );
            migrationBuilder.DropForeignKey(name: "fk_users_churches_church_id", table: "users");
            migrationBuilder.DropForeignKey(
                name: "fk_verse_notes_users_user_id",
                table: "verse_notes"
            );

            migrationBuilder.DropIndex(
                name: "ix_plan_participants_user_id",
                table: "plan_participants"
            );

            migrationBuilder.DropColumn(name: "session_version", table: "users");

            migrationBuilder
                .AlterColumn<int>(
                    name: "day_number",
                    table: "reading_plan_days",
                    type: "integer",
                    nullable: false,
                    oldClrType: typeof(int),
                    oldType: "integer"
                )
                .Annotation(
                    "Npgsql:ValueGenerationStrategy",
                    NpgsqlValueGenerationStrategy.IdentityByDefaultColumn
                );
        }
    }
}
