import type { RestClient } from './api.js';
import { extractItems } from './format.js';

export interface PaginatedResult {
	data: Array<Record<string, unknown>>;
	pages: number;
	truncated: boolean;
}

export async function fetchAllPages(
	client: RestClient,
	path: string,
	query: Record<string, string | number>,
	options: { pageSize?: number; maxPages?: number } = {}
): Promise<PaginatedResult> {
	const pageSize = options.pageSize ?? 100;
	const maxPages = options.maxPages ?? 10;
	const data: Array<Record<string, unknown>> = [];

	for (let page = 1; page <= maxPages; page += 1) {
		const response = await client.request({
			method: 'GET',
			path,
			query: { ...query, page, pagesize: pageSize },
		});
		const items = extractItems(response);
		data.push(...items);
		if (items.length < pageSize) {
			return { data, pages: page, truncated: false };
		}
	}

	return { data, pages: maxPages, truncated: true };
}
