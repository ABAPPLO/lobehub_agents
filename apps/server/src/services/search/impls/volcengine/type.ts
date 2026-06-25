export interface VolcengineSearchRequest {
  Count?: number;
  Filter?: {
    NeedContent?: boolean;
    NeedUrl?: boolean;
  };
  Query: string;
  SearchType: 'web' | 'web_summary';
  TimeRange?: string;
}

export interface VolcengineWebItem {
  AuthInfoDes?: string;
  AuthInfoLevel?: number;
  Content?: string;
  ContentFormats?: string;
  Id: string;
  LogoUrl?: string;
  PublishTime?: string;
  RankScore?: number;
  SiteName?: string;
  Snippet: string;
  SortId: number;
  Summary?: string;
  Title: string;
  Url?: string;
}

export interface VolcengineSearchResult {
  CardResults?: any;
  LogId: string;
  ResultCount: number;
  SearchContext: {
    OriginQuery: string;
    SearchType: string;
  };
  TimeCost: number;
  WebResults?: VolcengineWebItem[];
}

export interface VolcengineResponse {
  ResponseMetadata?: {
    Action?: string;
    Region?: string;
    RequestId?: string;
    Service?: string;
    Version?: string;
  };
  Result?: VolcengineSearchResult;
}
