CREATE TABLE schema_log (
    id serial  PRIMARY KEY,
    schema_version BIGINT NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE responses (
    id serial  PRIMARY KEY,
    psid    BIGINT  NOT NULL,
    created_at  TIMESTAMP   NOT NULL,
    question    VARCHAR(255)    NOT NULL,
    answer      VARCHAR(255)    NOT NULL
);

INSERT INTO schema_log (schema_version, updated_at) VALUES (1, now());