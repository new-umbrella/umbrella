import { Item } from './Item';

export interface Genre {
  name: string;
  description: string | undefined;
  url: string;
  isPaginated: boolean;
  getNextPage?: (page: number) => Promise<Item[]>;
  items: Item[];
}
