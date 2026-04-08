import {
  Injectable,
} from '@nestjs/common';
import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';

interface SuccessEnvelope<TData> {
  success: true;
  data: TData;
}

function isSuccessEnvelope<TData>(value: unknown): value is SuccessEnvelope<TData> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    (value as { success?: unknown }).success === true &&
    'data' in value
  );
}

@Injectable()
export class ResponseInterceptor<TData>
  implements NestInterceptor<TData, SuccessEnvelope<TData>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<TData>,
  ): Observable<SuccessEnvelope<TData>> {
    return next.handle().pipe(
      map((value) => {
        if (isSuccessEnvelope<TData>(value)) {
          return value;
        }

        return {
          success: true,
          data: value,
        };
      }),
    );
  }
}