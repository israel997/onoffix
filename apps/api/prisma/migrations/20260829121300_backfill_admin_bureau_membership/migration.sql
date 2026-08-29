-- Un admin d'organisation avait un accès implicite à tous les bureaux (bypass des
-- vérifications de permission) mais n'était jamais un vrai membre "users_bureaux" :
-- invisible dans les listes de membres, donc impossible à mentionner ou à assigner
-- une tâche. On lui crée la ligne d'adhésion manquante, comme un manager normal.
INSERT INTO "users_bureaux" (user_id, bureau_id, role_dans_bureau)
SELECT u.id, b.id, 'MANAGER'
FROM "users" u
JOIN "bureaux" b ON b.organisation_id = u.organisation_id
WHERE u.role_global = 'ADMIN'
ON CONFLICT (user_id, bureau_id) DO NOTHING;
