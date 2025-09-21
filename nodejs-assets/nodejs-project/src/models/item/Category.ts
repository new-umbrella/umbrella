import { Item } from './Item';

export interface Category {
  name: string;
  description?: string;
  url: string;
  isPaginated: boolean;
  getNextPage?: (page: number) => Promise<Item[]>;
  items: Item[];
}
