using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SolaHub.Infrastructure.Persistence.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260506110000_HardenRlsPolicies")]
public partial class HardenRlsPolicies : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            DROP POLICY IF EXISTS verse_notes_owner ON verse_notes;

            CREATE POLICY verse_notes_select ON verse_notes
              AS PERMISSIVE FOR SELECT
              USING (
                user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                OR is_shared = true
              );

            CREATE POLICY verse_notes_insert ON verse_notes
              AS PERMISSIVE FOR INSERT
              WITH CHECK (
                user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
              );

            CREATE POLICY verse_notes_update ON verse_notes
              AS PERMISSIVE FOR UPDATE
              USING (
                user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
              )
              WITH CHECK (
                user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
              );

            CREATE POLICY verse_notes_delete ON verse_notes
              AS PERMISSIVE FOR DELETE
              USING (
                user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
              );
            """
        );

        migrationBuilder.Sql(
            """
            DROP POLICY IF EXISTS plan_participants_owner ON plan_participants;

            CREATE POLICY plan_participants_select ON plan_participants
              AS PERMISSIVE FOR SELECT
              USING (
                user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                OR EXISTS (
                  SELECT 1
                  FROM reading_plans rp
                  WHERE rp.id = plan_id
                    AND rp.created_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                )
              );

            CREATE POLICY plan_participants_insert ON plan_participants
              AS PERMISSIVE FOR INSERT
              WITH CHECK (
                user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                AND EXISTS (
                  SELECT 1
                  FROM reading_plans rp
                  WHERE rp.id = plan_id
                    AND (
                      rp.created_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                      OR (rp.is_public = true AND rp.status = 'Active')
                    )
                )
              );

            CREATE POLICY plan_participants_update ON plan_participants
              AS PERMISSIVE FOR UPDATE
              USING (
                user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                OR EXISTS (
                  SELECT 1
                  FROM reading_plans rp
                  WHERE rp.id = plan_id
                    AND rp.created_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                )
              )
              WITH CHECK (
                user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                OR EXISTS (
                  SELECT 1
                  FROM reading_plans rp
                  WHERE rp.id = plan_id
                    AND rp.created_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                )
              );

            CREATE POLICY plan_participants_delete ON plan_participants
              AS PERMISSIVE FOR DELETE
              USING (
                user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                OR EXISTS (
                  SELECT 1
                  FROM reading_plans rp
                  WHERE rp.id = plan_id
                    AND rp.created_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                )
              );
            """
        );

        migrationBuilder.Sql(
            """
            ALTER TABLE reading_plan_days ENABLE ROW LEVEL SECURITY;
            ALTER TABLE reading_plan_days FORCE ROW LEVEL SECURITY;

            CREATE POLICY reading_plan_days_admin ON reading_plan_days
              AS PERMISSIVE FOR ALL
              USING (current_setting('app.is_admin', true) = 'true');

            CREATE POLICY reading_plan_days_select ON reading_plan_days
              AS PERMISSIVE FOR SELECT
              USING (
                EXISTS (
                  SELECT 1
                  FROM reading_plans rp
                  WHERE rp.id = plan_id
                    AND (
                      rp.created_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                      OR rp.is_public = true
                    )
                )
              );

            CREATE POLICY reading_plan_days_insert ON reading_plan_days
              AS PERMISSIVE FOR INSERT
              WITH CHECK (
                EXISTS (
                  SELECT 1
                  FROM reading_plans rp
                  WHERE rp.id = plan_id
                    AND rp.created_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                )
              );

            CREATE POLICY reading_plan_days_update ON reading_plan_days
              AS PERMISSIVE FOR UPDATE
              USING (
                EXISTS (
                  SELECT 1
                  FROM reading_plans rp
                  WHERE rp.id = plan_id
                    AND rp.created_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                )
              )
              WITH CHECK (
                EXISTS (
                  SELECT 1
                  FROM reading_plans rp
                  WHERE rp.id = plan_id
                    AND rp.created_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                )
              );

            CREATE POLICY reading_plan_days_delete ON reading_plan_days
              AS PERMISSIVE FOR DELETE
              USING (
                EXISTS (
                  SELECT 1
                  FROM reading_plans rp
                  WHERE rp.id = plan_id
                    AND rp.created_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                )
              );
            """
        );

        migrationBuilder.Sql(
            """
            ALTER TABLE users ENABLE ROW LEVEL SECURITY;
            ALTER TABLE users FORCE ROW LEVEL SECURITY;

            CREATE POLICY users_admin ON users
              AS PERMISSIVE FOR ALL
              USING (current_setting('app.is_admin', true) = 'true');

            CREATE POLICY users_self_select ON users
              AS PERMISSIVE FOR SELECT
              USING (
                id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
              );

            CREATE POLICY users_self_update ON users
              AS PERMISSIVE FOR UPDATE
              USING (
                id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
              )
              WITH CHECK (
                id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
              );

            CREATE POLICY users_auth_lookup_select ON users
              AS PERMISSIVE FOR SELECT
              USING (current_setting('app.auth_context', true) = 'true');

            CREATE POLICY users_auth_lookup_insert ON users
              AS PERMISSIVE FOR INSERT
              WITH CHECK (current_setting('app.auth_context', true) = 'true');

            CREATE POLICY users_auth_lookup_update ON users
              AS PERMISSIVE FOR UPDATE
              USING (current_setting('app.auth_context', true) = 'true')
              WITH CHECK (current_setting('app.auth_context', true) = 'true');
            """
        );

        migrationBuilder.Sql(
            """
            ALTER TABLE churches ENABLE ROW LEVEL SECURITY;
            ALTER TABLE churches FORCE ROW LEVEL SECURITY;

            CREATE POLICY churches_admin ON churches
              AS PERMISSIVE FOR ALL
              USING (current_setting('app.is_admin', true) = 'true');

            CREATE POLICY churches_read_active ON churches
              AS PERMISSIVE FOR SELECT
              USING (is_active = true);

            CREATE POLICY churches_owner_insert ON churches
              AS PERMISSIVE FOR INSERT
              WITH CHECK (
                admin_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
              );

            CREATE POLICY churches_owner_update ON churches
              AS PERMISSIVE FOR UPDATE
              USING (
                admin_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
              )
              WITH CHECK (
                admin_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
              );

            CREATE POLICY churches_owner_delete ON churches
              AS PERMISSIVE FOR DELETE
              USING (
                admin_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
              );
            """
        );
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            DROP POLICY IF EXISTS churches_owner_delete ON churches;
            DROP POLICY IF EXISTS churches_owner_update ON churches;
            DROP POLICY IF EXISTS churches_owner_insert ON churches;
            DROP POLICY IF EXISTS churches_read_active ON churches;
            DROP POLICY IF EXISTS churches_admin ON churches;
            ALTER TABLE churches DISABLE ROW LEVEL SECURITY;
            """
        );

        migrationBuilder.Sql(
            """
            DROP POLICY IF EXISTS users_auth_lookup_update ON users;
            DROP POLICY IF EXISTS users_auth_lookup_insert ON users;
            DROP POLICY IF EXISTS users_auth_lookup_select ON users;
            DROP POLICY IF EXISTS users_self_update ON users;
            DROP POLICY IF EXISTS users_self_select ON users;
            DROP POLICY IF EXISTS users_admin ON users;
            ALTER TABLE users DISABLE ROW LEVEL SECURITY;
            """
        );

        migrationBuilder.Sql(
            """
            DROP POLICY IF EXISTS reading_plan_days_delete ON reading_plan_days;
            DROP POLICY IF EXISTS reading_plan_days_update ON reading_plan_days;
            DROP POLICY IF EXISTS reading_plan_days_insert ON reading_plan_days;
            DROP POLICY IF EXISTS reading_plan_days_select ON reading_plan_days;
            DROP POLICY IF EXISTS reading_plan_days_admin ON reading_plan_days;
            ALTER TABLE reading_plan_days DISABLE ROW LEVEL SECURITY;
            """
        );

        migrationBuilder.Sql(
            """
            DROP POLICY IF EXISTS plan_participants_delete ON plan_participants;
            DROP POLICY IF EXISTS plan_participants_update ON plan_participants;
            DROP POLICY IF EXISTS plan_participants_insert ON plan_participants;
            DROP POLICY IF EXISTS plan_participants_select ON plan_participants;

            CREATE POLICY plan_participants_owner ON plan_participants
              AS PERMISSIVE FOR ALL
              USING (
                user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
              )
              WITH CHECK (
                user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
              );
            """
        );

        migrationBuilder.Sql(
            """
            DROP POLICY IF EXISTS verse_notes_delete ON verse_notes;
            DROP POLICY IF EXISTS verse_notes_update ON verse_notes;
            DROP POLICY IF EXISTS verse_notes_insert ON verse_notes;
            DROP POLICY IF EXISTS verse_notes_select ON verse_notes;

            CREATE POLICY verse_notes_owner ON verse_notes
              AS PERMISSIVE FOR ALL
              USING (
                user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                OR is_shared = true
              )
              WITH CHECK (
                user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
              );
            """
        );
    }
}
