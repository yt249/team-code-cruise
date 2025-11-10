import jwt from 'jsonwebtoken';
export class AuthService {
    static required(req, res, next) {
        try {
            const payload = AuthService.verify(req);
            if (!payload)
                return res.status(401).json({ error: 'Missing Authorization' });
            req.user = payload;
            next();
        }
        catch (err) {
            console.error(err);
            return res.status(401).json({ error: 'Invalid token' });
        }
    }
    static optional(req, _res, next) {
        try {
            const payload = AuthService.verify(req);
            if (payload)
                req.user = payload;
        }
        catch {
            // ignore optional auth failures
        }
        next();
    }
    static requireRole(role) {
        return (req, res, next) => {
            if (!req.user || req.user.role !== role)
                return res.status(403).json({ error: 'Forbidden' });
            next();
        };
    }
    static verify(req) {
        const hdr = req.headers.authorization;
        if (!hdr)
            return null;
        const token = hdr.replace('Bearer ', '');
        const secret = process.env.JWT_SECRET || 'secret';
        return jwt.verify(token, secret);
    }
}
