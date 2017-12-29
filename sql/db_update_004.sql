CREATE TABLE users (
    id serial  PRIMARY KEY,
    psid    BIGINT  NOT NULL UNIQUE
);

INSERT INTO schema_log (schema_version, updated_at) VALUES (4, now());