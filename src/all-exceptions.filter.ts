import { Request, Response } from 'express';
import { BaseExceptionFilter } from '@nestjs/core';
import { MyLoggerService } from './my-logger/my-logger.service';
import { PrismaClientValidationError } from 'generated/prisma/runtime/library';
import {
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
} from '@nestjs/common';

type MyResponseObj = {
  statusCode: number;
  timeStamp: string;
  path: string;
  response: string | object;
};

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  private readonly logger = new MyLoggerService(AllExceptionsFilter.name);

  catch(exception: any, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const myResponseObj: MyResponseObj = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timeStamp: new Date().toISOString(),
      path: request.url,
      response: 'Internal Server Error',
    };

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      myResponseObj.statusCode = exception.getStatus();
      myResponseObj.response =
        typeof res === 'string'
          ? res
          : `${(res as any).error || 'Error'}: ${(res as any).message || 'Something went wrong'}`;
    } else if (exception instanceof PrismaClientValidationError) {
      myResponseObj.statusCode = 422;
      myResponseObj.response = exception.message.replaceAll(/\n/g, '');
    }

    response.status(myResponseObj.statusCode).json(myResponseObj);

    this.logger.error(
      `[${request.method} ${request.url}] ${myResponseObj.response}`,
      AllExceptionsFilter.name,
    );

    super.catch(exception, host);
  }
}
