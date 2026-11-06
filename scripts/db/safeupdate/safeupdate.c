/*
 * A local stand-in for the `safeupdate` guard Supabase loads for every request that comes
 * through its API: an UPDATE or DELETE without a WHERE clause fails with
 * "UPDATE requires a WHERE clause". Our database functions run inside those requests, so the
 * test database loads this to catch such statements before Supabase does.
 *
 * One difference, on purpose: statements typed directly by a test (top-level) are exempt, so
 * fixtures can stay short. Only statements inside functions and DO blocks are checked, which is
 * where the site's database code lives. (The site's own supabase-js calls always add a filter.)
 */
#include "postgres.h"
#include "fmgr.h"
#include "nodes/parsenodes.h"
#include "nodes/pg_list.h"
#include "parser/analyze.h"
#include "tcop/tcopprot.h"

PG_MODULE_MAGIC;

void _PG_init(void);

static post_parse_analyze_hook_type prev_hook = NULL;

static void
check_query(Query *query)
{
	ListCell   *lc;

	if ((query->commandType == CMD_UPDATE || query->commandType == CMD_DELETE) &&
		(query->jointree == NULL || query->jointree->quals == NULL))
		ereport(ERROR,
				(errcode(ERRCODE_CARDINALITY_VIOLATION),
				 errmsg("%s requires a WHERE clause",
						query->commandType == CMD_UPDATE ? "UPDATE" : "DELETE")));

	foreach(lc, query->cteList)
	{
		CommonTableExpr *cte = lfirst_node(CommonTableExpr, lc);

		if (IsA(cte->ctequery, Query))
			check_query((Query *) cte->ctequery);
	}
}

static void
safeupdate_hook(ParseState *pstate, Query *query, JumbleState *jstate)
{
	if (prev_hook)
		prev_hook(pstate, query, jstate);
	/* A statement sent by the client shares the client's query string; nested ones do not. */
	if (pstate->p_sourcetext != debug_query_string)
		check_query(query);
}

void
_PG_init(void)
{
	prev_hook = post_parse_analyze_hook;
	post_parse_analyze_hook = safeupdate_hook;
}
