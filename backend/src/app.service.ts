import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Fitness Tracker API - NestJS Backend Core';
  }
}
