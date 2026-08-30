-- Un compte peut posséder/rejoindre plusieurs organisations, mais "email_verifie"
-- vivait par organisation : une organisation créée/rejointe après la première
-- restait bloquée à "non vérifié" alors que l'email du compte était déjà prouvé
-- ailleurs — et resendOtp répondait systématiquement à la place de l'organisation
-- déjà vérifiée (jamais de code envoyé pour la nouvelle). On rattrape les
-- organisations existantes concernées.
UPDATE "users" u
SET "email_verifie" = true
WHERE u."email_verifie" = false
AND EXISTS (
  SELECT 1 FROM "users" u2
  WHERE u2."account_id" = u."account_id"
  AND u2."id" <> u."id"
  AND u2."email_verifie" = true
);
