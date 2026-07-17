-- Earlier versions of create-admins-table.sql seeded a default account with a
-- hardcoded password ('admin123!') that was committed to source control.
-- If you ran that migration, this deactivates any account still using that
-- known-compromised hash. Create your own replacement admin FIRST with:
--   node scripts/generate-admin-hash.js <username> '<your-own-strong-password>'
-- and run the INSERT it prints, then run this migration.

UPDATE admins
SET is_active = false
WHERE password_hash = '$2b$10$snFot1SwrY/mmNHpJMMdeuqOjLIdj2i5YsJcE.jBjS1gdLrq6/cBq';
