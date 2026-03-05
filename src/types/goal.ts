import { AmountFilter, ListFilters, NameFilter, SortFilter } from "./global";

export type GoalFilters = {
  walletId?: string;
  startingDateBeginning?: string;
  startingDateEnding?: string;
  endingDateBeginning?: string;
  endingDateEnding?: string;
  sortBy?: "startingDate" | "endingDate" | "amount" | "createdAt" | "name";
} & ListFilters &
  NameFilter &
  AmountFilter &
  SortFilter;
