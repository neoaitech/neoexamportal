import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AllocationsModule } from './allocations/allocations.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { PapersModule } from './papers/papers.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { StorageModule } from './storage/storage.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    StorageModule,
    AllocationsModule,
    PapersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
