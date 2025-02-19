import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { Company } from './entities/company.entity';

import { ProductService } from './product.service';
import { Product } from './entities/product.entity';
import { ProductController } from './product.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Company, Product], 'ordersConn'),
  ],
  controllers: [CompanyController, ProductController],
  providers: [CompanyService, ProductService],
  exports: []
})
export class OrdersModule {}
