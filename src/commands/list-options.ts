import { parseOptionalPositiveInteger } from '../core/validation.js';

export interface ListOptions {
	json?: boolean;
	page?: string;
	limit?: string;
	since?: string;
	until?: string;
	status?: string;
	currency?: string;
}

export function buildListQuery(
	options: ListOptions,
	config: { currencyParam?: string; defaultSort?: string } = {}
): Record<string, string | number> {
	const query: Record<string, string | number> = {};
	const page = parseOptionalPositiveInteger(options.page, '--page');
	const limit = parseOptionalPositiveInteger(options.limit, '--limit');
	if (page) {
		query.page = page;
	}
	if (limit) {
		query.pagesize = limit;
	}
	if (options.since) {
		query.date_after = options.since;
	}
	if (options.until) {
		query.date_before = options.until;
	}
	if (options.status) {
		query.status_is = options.status;
	}
	if (config.defaultSort) {
		query.sort = config.defaultSort;
		query.direction = 'desc';
	}
	if (options.currency && config.currencyParam) {
		query[config.currencyParam] = options.currency.toLowerCase();
	}
	return query;
}
