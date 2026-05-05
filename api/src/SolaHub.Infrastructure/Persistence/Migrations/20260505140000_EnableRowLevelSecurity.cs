using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SolaHub.Infrastructure.Persistence.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260505140000_EnableRowLevelSecurity")]
    public partial class EnableRowLevelSecurity : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ─── Missing performance index ────────────────────────────────────────
            migrationBuilder.CreateIndex(
                name: "ix_reading_plans_is_public",
                table: "reading_plans",
                column: "is_public",
                filter: "is_public = true"
            );

            // ─── Dedicated application role ───────────────────────────────────────
            // The production connection string should use solahub_app (not postgres).
            // postgres/superuser bypasses RLS by default; solahub_app does not.
            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'solahub_app') THEN
                    CREATE ROLE solahub_app WITH LOGIN NOINHERIT;
                  END IF;
                END $$;
                """
            );

            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                  EXECUTE format('GRANT CONNECT ON DATABASE %I TO solahub_app', current_database());
                END $$;
                """
            );

            migrationBuilder.Sql(
                """
                GRANT USAGE ON SCHEMA public TO solahub_app;
                GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO solahub_app;
                GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO solahub_app;
                ALTER DEFAULT PRIVILEGES IN SCHEMA public
                  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO solahub_app;
                ALTER DEFAULT PRIVILEGES IN SCHEMA public
                  GRANT USAGE, SELECT ON SEQUENCES TO solahub_app;
                """
            );

            // ─── verse_notes ──────────────────────────────────────────────────────
            migrationBuilder.Sql(
                """
                ALTER TABLE verse_notes ENABLE ROW LEVEL SECURITY;
                ALTER TABLE verse_notes FORCE ROW LEVEL SECURITY;

                CREATE POLICY verse_notes_admin ON verse_notes
                  AS PERMISSIVE FOR ALL
                  USING (current_setting('app.is_admin', true) = 'true');

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

            // ─── reading_plans ────────────────────────────────────────────────────
            migrationBuilder.Sql(
                """
                ALTER TABLE reading_plans ENABLE ROW LEVEL SECURITY;
                ALTER TABLE reading_plans FORCE ROW LEVEL SECURITY;

                CREATE POLICY reading_plans_admin ON reading_plans
                  AS PERMISSIVE FOR ALL
                  USING (current_setting('app.is_admin', true) = 'true');

                CREATE POLICY reading_plans_read ON reading_plans
                  AS PERMISSIVE FOR SELECT
                  USING (
                    created_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                    OR is_public = true
                  );

                CREATE POLICY reading_plans_write ON reading_plans
                  AS PERMISSIVE FOR INSERT
                  WITH CHECK (
                    created_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                  );

                CREATE POLICY reading_plans_update ON reading_plans
                  AS PERMISSIVE FOR UPDATE
                  USING (
                    created_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                  );

                CREATE POLICY reading_plans_delete ON reading_plans
                  AS PERMISSIVE FOR DELETE
                  USING (
                    created_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                  );
                """
            );

            // ─── plan_participants ────────────────────────────────────────────────
            migrationBuilder.Sql(
                """
                ALTER TABLE plan_participants ENABLE ROW LEVEL SECURITY;
                ALTER TABLE plan_participants FORCE ROW LEVEL SECURITY;

                CREATE POLICY plan_participants_admin ON plan_participants
                  AS PERMISSIVE FOR ALL
                  USING (current_setting('app.is_admin', true) = 'true');

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

            // ─── community_posts ──────────────────────────────────────────────────
            migrationBuilder.Sql(
                """
                ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
                ALTER TABLE community_posts FORCE ROW LEVEL SECURITY;

                CREATE POLICY community_posts_admin ON community_posts
                  AS PERMISSIVE FOR ALL
                  USING (current_setting('app.is_admin', true) = 'true');

                CREATE POLICY community_posts_read ON community_posts
                  AS PERMISSIVE FOR SELECT
                  USING (
                    author_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                    OR visibility = 'Public'
                  );

                CREATE POLICY community_posts_write ON community_posts
                  AS PERMISSIVE FOR INSERT
                  WITH CHECK (
                    author_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                  );

                CREATE POLICY community_posts_update ON community_posts
                  AS PERMISSIVE FOR UPDATE
                  USING (
                    author_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                  );

                CREATE POLICY community_posts_delete ON community_posts
                  AS PERMISSIVE FOR DELETE
                  USING (
                    author_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                  );
                """
            );

            // ─── community_post_reports ───────────────────────────────────────────
            migrationBuilder.Sql(
                """
                ALTER TABLE community_post_reports ENABLE ROW LEVEL SECURITY;
                ALTER TABLE community_post_reports FORCE ROW LEVEL SECURITY;

                CREATE POLICY community_post_reports_admin ON community_post_reports
                  AS PERMISSIVE FOR ALL
                  USING (current_setting('app.is_admin', true) = 'true');

                CREATE POLICY community_post_reports_owner ON community_post_reports
                  AS PERMISSIVE FOR ALL
                  USING (
                    user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                  )
                  WITH CHECK (
                    user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                  );
                """
            );
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "ix_reading_plans_is_public", table: "reading_plans");

            migrationBuilder.Sql(
                """
                DROP POLICY IF EXISTS verse_notes_admin ON verse_notes;
                DROP POLICY IF EXISTS verse_notes_owner ON verse_notes;
                ALTER TABLE verse_notes DISABLE ROW LEVEL SECURITY;
                ALTER TABLE verse_notes NO FORCE ROW LEVEL SECURITY;

                DROP POLICY IF EXISTS reading_plans_admin ON reading_plans;
                DROP POLICY IF EXISTS reading_plans_read ON reading_plans;
                DROP POLICY IF EXISTS reading_plans_write ON reading_plans;
                DROP POLICY IF EXISTS reading_plans_update ON reading_plans;
                DROP POLICY IF EXISTS reading_plans_delete ON reading_plans;
                ALTER TABLE reading_plans DISABLE ROW LEVEL SECURITY;
                ALTER TABLE reading_plans NO FORCE ROW LEVEL SECURITY;

                DROP POLICY IF EXISTS plan_participants_admin ON plan_participants;
                DROP POLICY IF EXISTS plan_participants_owner ON plan_participants;
                ALTER TABLE plan_participants DISABLE ROW LEVEL SECURITY;
                ALTER TABLE plan_participants NO FORCE ROW LEVEL SECURITY;

                DROP POLICY IF EXISTS community_posts_admin ON community_posts;
                DROP POLICY IF EXISTS community_posts_read ON community_posts;
                DROP POLICY IF EXISTS community_posts_write ON community_posts;
                DROP POLICY IF EXISTS community_posts_update ON community_posts;
                DROP POLICY IF EXISTS community_posts_delete ON community_posts;
                ALTER TABLE community_posts DISABLE ROW LEVEL SECURITY;
                ALTER TABLE community_posts NO FORCE ROW LEVEL SECURITY;

                DROP POLICY IF EXISTS community_post_reports_admin ON community_post_reports;
                DROP POLICY IF EXISTS community_post_reports_owner ON community_post_reports;
                ALTER TABLE community_post_reports DISABLE ROW LEVEL SECURITY;
                ALTER TABLE community_post_reports NO FORCE ROW LEVEL SECURITY;
                """
            );

            migrationBuilder.Sql(
                """
                REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM solahub_app;
                REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM solahub_app;
                REVOKE USAGE ON SCHEMA public FROM solahub_app;
                """
            );

            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                  EXECUTE format('REVOKE CONNECT ON DATABASE %I FROM solahub_app', current_database());
                END $$;
                """
            );
        }
    }
}
