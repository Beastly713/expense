import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Settlement, SettlementSchema } from './settlement.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Settlement.name, schema: SettlementSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class SettlementsModule {}