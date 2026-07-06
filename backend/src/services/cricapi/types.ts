export type CricApiResponse<T> = {
  status: string;
  data: T;
  // CricAPI typically returns additional metadata fields; keep loose.
  [key: string]: unknown;
};

export type CricApiCurrentMatchesItem = {
  id?: string | number;
  match_id?: string | number;
  matchId?: string | number;
  title?: string;
  team1?: string;
  team_1?: string;
  team1_name?: string;
  team2?: string;
  team_2?: string;
  team2_name?: string;
  status?: string;
  matchStatus?: string;
  result?: string;
  winner?: string;
  date?: string;
  startDate?: string;
  venue?: string;
  // live-score fields are intentionally ignored here
  [key: string]: unknown;
};

export type CricApiSeriesItem = {
  id?: string | number;
  series_id?: string | number;
  seriesId?: string | number;
  name?: string;
  seriesName?: string;
  [key: string]: unknown;
};

export type CricApiSeriesInfoItem = {
  id?: string | number;
  matchId?: string | number;
  match_id?: string | number;
  date?: string;
  startDate?: string;
  venue?: string;
  team1?: string;
  team1_name?: string;
  team_1?: string;
  team2?: string;
  team2_name?: string;
  team_2?: string;
  status?: string;
  matchStatus?: string;
  result?: string;
  winner?: string;
  [key: string]: unknown;
};

