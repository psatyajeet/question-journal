ALTER TABLE responses
    ALTER COLUMN question TYPE TEXT,
    ALTER COLUMN answer TYPE TEXT;

INSERT INTO schema_log (schema_version, updated_at) VALUES (3, now());