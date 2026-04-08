import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Settlement, SettlementSchema } from './settlement.schema';
import { SettlementsRepository } from './settlements.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Settlement.name, schema: SettlementSchema },
    ]),
  ],
  providers: [SettlementsRepository],
  exports: [MongooseModule, SettlementsRepository],
})
export class SettlementsModule {}