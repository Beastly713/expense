import {
  createParamDecorator,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';

import type { AuthenticatedRequestUser } from '../types/authenticated-request-user';

interface AuthenticatedRequest extends Request {
  authUser?: AuthenticatedRequestUser;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedRequestUser | null => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.authUser ?? null;
  },
);