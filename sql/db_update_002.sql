ALTER TABLE responses
    ADD COLUMN month INTEGER NOT NULL,
    ADD COLUMN day INTEGER NOT NULL;

CREATE INDEX responses_month_day ON responses (month, day);

INSERT INTO schema_log (schema_version, updated_at) VALUES (2, now());