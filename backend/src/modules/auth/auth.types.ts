export type AuthUser = {
  id: string;
  email: string;
};

export type JwtPayload = {
  sub: string;
  email: string;
};

