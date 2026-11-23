CREATE TABLE "month_exchange_rates" (
	"currency" text NOT NULL,
	"month" text NOT NULL,
	"rate" numeric(18, 8) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "month_exchange_rates_currency_month_pk" PRIMARY KEY("currency","month")
);
