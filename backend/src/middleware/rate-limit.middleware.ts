// backend/src/middleware/rate-limit.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import rateLimit from 'express-rate-limit';

@Injectable()
export class AutocompleteRateLimitMiddleware implements NestMiddleware {
  private limiter = rateLimit({
    windowMs: 3 * 1000, // 3 seconds
    max: 5, // max 5 requests per window per IP
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({ success: false, message: 'Bạn thao tác quá nhanh, vui lòng chờ.' });
    },
  });

  use(req: any, res: any, next: () => void) {
    this.limiter(req, res, next);
  }
}
