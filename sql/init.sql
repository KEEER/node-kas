BEGIN;

CREATE TABLE public.version (
  version bigint NOT NULL
);
INSERT INTO public.version (version) VALUES (1);

CREATE TABLE public.users (
  id bigserial NOT NULL,
  phone_number character varying(16) NOT NULL,
  salt character(16) NOT NULL,
  password character(128) NOT NULL,
  keeer_id character varying(32),
  email character varying(320),
  nickname character varying(64),
  kiuid uuid NOT NULL,
  avatar_name character varying(64),
  status integer DEFAULT 0 NOT NULL,
  kredit bigint DEFAULT 0 NOT NULL,
  creation timestamp DEFAULT NOW() NOT NULL,
  last_update timestamp DEFAULT NOW() NOT NULL,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE INDEX IDX_users_keeer_id ON public.users (keeer_id);
CREATE INDEX IDX_users_kiuid ON public.users (kiuid);
CREATE INDEX IDX_users_phone_number ON public.users (phone_number);
CREATE INDEX IDX_users_email ON public.users (email);

CREATE TABLE public.tokens (
  id bigserial NOT NULL,
  token uuid NOT NULL,
  user_id bigint NOT NULL,
  time timestamp NOT NULL DEFAULT NOW(),
  CONSTRAINT tokens_pkey PRIMARY KEY(id),
  CONSTRAINT tokens_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public.users (id) MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

CREATE TABLE public.services (
  id bigserial NOT NULL,
  name character varying(32) NOT NULL,
  token uuid NOT NULL,
  login_prefs jsonb,
  CONSTRAINT services_pkey PRIMARY KEY (id)
);

CREATE INDEX IDX_services_name ON public.services (name);
CREATE INDEX IDX_services_token ON public.services (token);

CREATE INDEX IDX_tokens_token ON public.tokens (token);

CREATE TABLE public.payjs_orders (
  id bigserial NOT NULL,
  payjs_order_id character varying(32),
  amount bigint NOT NULL,
  time timestamp NOT NULL DEFAULT NOW(),
  user_id bigint NOT NULL,
  payjs_callback jsonb,
  CONSTRAINT payjs_orders_pkey PRIMARY KEY (id),
  CONSTRAINT payjs_orders_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public.users (id) MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

CREATE INDEX IDX_payjs_orders_time ON public.payjs_orders (time);

CREATE TABLE public.trade_records (
  id bigserial NOT NULL,
  amount bigint NOT NULL,
  time timestamp NOT NULL DEFAULT NOW(),
  type smallint NOT NULL,
  order_id bigint,
  user_id bigint NOT NULL,
  service_id bigint,
  CONSTRAINT trade_records_pkey PRIMARY KEY(id),
  CONSTRAINT trade_records_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public.users (id) MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE NO ACTION,
  CONSTRAINT trade_records_order_id_fkey FOREIGN KEY (order_id)
    REFERENCES public.payjs_orders (id) MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE NO ACTION,
  CONSTRAINT trade_records_service_id_fkey FOREIGN KEY (service_id)
    REFERENCES public.services (id) MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE NO ACTION
);

CREATE TABLE public.sms_codes (
  id bigserial NOT NULL,
  number character varying (16) NOT NULL,
  type smallint NOT NULL,
  user_id bigint,
  code character(4) NOT NULL,
  time timestamp NOT NULL DEFAULT NOW(),
  CONSTRAINT sms_codes_pkey PRIMARY KEY(id),
  CONSTRAINT sms_codes_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public.users (id) MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

CREATE INDEX IDX_sms_codes_code ON public.sms_codes (code);
CREATE INDEX IDX_sms_codes_time ON public.sms_codes (time);

CREATE TABLE public.email_tokens (
  id bigserial NOT NULL,
  type smallint NOT NULL,
  address character varying (320) NOT NULL,
  user_id bigint NOT NULL,
  token character varying (64) NOT NULL,
  time timestamp NOT NULL DEFAULT NOW(),
  CONSTRAINT email_tokens_pkey PRIMARY KEY(id),
  CONSTRAINT email_tokens_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public.users (id) MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

COMMIT;
