import {
  type SearchParams,
  type UniformSearchResponse,
  type UniformSearchResult,
} from '@lobechat/types';
import { TRPCError } from '@trpc/server';
import debug from 'debug';

import { type SearchServiceImpl } from '../type';
import {
  type VolcengineResponse,
  type VolcengineSearchRequest,
  type VolcengineWebItem,
} from './type';

const log = debug('lobe-search:Volcengine');

const timeRangeMapping = {
  day: 'OneDay',
  month: 'OneMonth',
  week: 'OneWeek',
  year: 'OneYear',
};

export class VolcengineImpl implements SearchServiceImpl {
  private get apiKey(): string | undefined {
    return process.env.VOLCENGINE_API_KEY;
  }

  private get baseUrl(): string {
    return process.env.VOLCENGINE_BASE_URL || 'https://open.feedcoopapi.com/search_api/web_search';
  }

  async query(query: string, params: SearchParams = {}): Promise<UniformSearchResponse> {
    log('Starting Volcengine query with query: "%s", params: %o', query, params);

    const body: VolcengineSearchRequest = {
      Count: 10,
      Filter: {
        NeedContent: true,
        NeedUrl: true,
      },
      Query: query,
      SearchType: 'web',
    };

    if (params?.searchTimeRange && params.searchTimeRange !== 'anytime') {
      const mapped = timeRangeMapping[params.searchTimeRange as keyof typeof timeRangeMapping];
      if (mapped) {
        body.TimeRange = mapped;
      }
    }

    log('Constructed request body: %o', body);

    let response: Response;
    const startAt = Date.now();
    let costTime: number;

    try {
      log('Sending request to endpoint: %s', this.baseUrl);
      response = await fetch(this.baseUrl, {
        body: JSON.stringify(body),
        headers: {
          'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : '',
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });
      log('Received response with status: %d', response.status);
      costTime = Date.now() - startAt;
    } catch (error) {
      log.extend('error')('Volcengine fetch error: %o', error);
      throw new TRPCError({
        cause: error,
        code: 'SERVICE_UNAVAILABLE',
        message: 'Failed to connect to Volcengine.',
      });
    }

    if (!response.ok) {
      const errorBody = await response.text();
      log.extend('error')(
        `Volcengine request failed with status ${response.status}: %s`,
        errorBody.length > 200 ? `${errorBody.slice(0, 200)}...` : errorBody,
      );
      throw new TRPCError({
        cause: errorBody,
        code: 'SERVICE_UNAVAILABLE',
        message: `Volcengine request failed: ${response.statusText}`,
      });
    }

    try {
      const volcengineResponse = (await response.json()) as VolcengineResponse;

      log('Parsed Volcengine response');

      const webResults = volcengineResponse.Result?.WebResults || [];

      const mappedResults = webResults.map(
        (item: VolcengineWebItem): UniformSearchResult => ({
          category: 'general',
          content: item.Summary || item.Snippet || '',
          engines: ['volcengine'],
          parsedUrl: item.Url ? new URL(item.Url).hostname : '',
          publishedDate: item.PublishTime,
          score: item.RankScore || 1,
          thumbnail: item.LogoUrl || undefined,
          title: item.Title || '',
          url: item.Url || '',
        }),
      );

      log('Mapped %d results to SearchResult format', mappedResults.length);

      return {
        costTime: volcengineResponse.Result?.TimeCost ?? costTime,
        query,
        resultNumbers: mappedResults.length,
        results: mappedResults,
      };
    } catch (error) {
      log.extend('error')('Error parsing Volcengine response: %o', error);
      throw new TRPCError({
        cause: error,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to parse Volcengine response.',
      });
    }
  }
}
