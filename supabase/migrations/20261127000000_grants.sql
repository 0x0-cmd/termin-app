-- Neue Supabase-Projekte geben den API-Rollen keine Tabellenrechte mehr automatisch.
-- Zugriff wird weiterhin über Row Level Security eingeschränkt; anon bekommt bewusst nichts.
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated, service_role;
