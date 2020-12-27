BEGIN;

SELECT
  CASE version WHEN 2 THEN 1
               ELSE asin(100 + version)
  END
  FROM public.version;

UPDATE public.version SET version = 3;

ALTER TABLE public.tokens RENAME TO PRE_sessions;
ALTER TABLE public.sessions RENAME time TO created;
ALTER TABLE public.sessions RENAME CONSTRAINT tokens_pkey to sessions_pkey;
ALTER TABLE public.sessions RENAME CONSTRAINT tokens_user_id_fkey to sessions_user_id_fkey;
ALTER TABLE public.sessions
  ADD last_seen timestamp NOT NULL DEFAULT NOW(),
  ADD user_agent text,
  ADD login_ip inet,
  ADD last_seen_ip inet;

ALTER INDEX IDX_tokens_token RENAME TO IDX_sessions_token;

COMMIT;
