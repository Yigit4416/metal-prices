export interface GoldData {
  name: string;
  buying: string;
  selling: string;
  changeRate: string;
  changeAmount: string;
  status: 'up' | 'down' | 'neutral';
  time: string;
}
