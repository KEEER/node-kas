BEGIN;

SELECT
  CASE version WHEN 1 THEN 1
               ELSE asin(100 + version)
  END
  FROM public.version;

UPDATE public.version SET version = 2;

ALTER TABLE public.users ADD lower_keeer_id character varying(32);
UPDATE public.users SET lower_keeer_id = LOWER(keeer_id);

COMMIT;
