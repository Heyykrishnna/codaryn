export function authMiddleware(req: any, res: any, next: any) {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
}

export class AuthGuard {
  canActivate(context: any): boolean {
    const req = context.switchToHttp().getRequest();
    return Boolean(req.headers.authorization);
  }
}
