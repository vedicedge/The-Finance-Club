# Built and installed by scripts/db/local-db.sh when the Postgres server headers are present.
MODULES = safeupdate
PG_CONFIG ?= pg_config
PGXS := $(shell $(PG_CONFIG) --pgxs)
include $(PGXS)
