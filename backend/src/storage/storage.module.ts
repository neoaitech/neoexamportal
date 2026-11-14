import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { FilesController } from './files.controller.js';
import { StorageService } from './storage.service.js';

@Global()
@Module({
  imports: [JwtModule.register({})],
  controllers: [FilesController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
