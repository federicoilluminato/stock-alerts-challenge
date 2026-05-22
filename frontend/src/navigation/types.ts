export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Stocks: undefined;
  StockDetail: { symbol: string; name: string };
  Alerts: undefined;
  CreateAlert: { symbol: string; name: string } | undefined;
};

