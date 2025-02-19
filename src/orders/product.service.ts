import { In, InsertResult, Like, Repository } from 'typeorm';
import { isUUID } from 'class-validator';
import { ProcessSummaryDto, SearchInputDto, SearchPaginationDto } from 'profaxnojs/util';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { ProductDto } from './dto/product.dto';
import { Product } from './entities/product.entity';

import { CompanyService } from './company.service';
import { Company } from './entities/company.entity';

import { AlreadyExistException, IsBeingUsedException } from './exceptions/orders.exception';

@Injectable()
export class ProductService {

  private readonly logger = new Logger(ProductService.name);

  private dbDefaultLimit = 1000;

  constructor(
    private readonly ConfigService: ConfigService,
    
    @InjectRepository(Product, 'ordersConn')
    private readonly productRepository: Repository<Product>,

    private readonly companyService: CompanyService
    
  ){
    this.dbDefaultLimit = this.ConfigService.get("dbDefaultLimit");
  }

  updateProduct(dto: ProductDto): Promise<ProductDto> {
    if(!dto.id)
      return this.createProduct(dto); // * create
    
    this.logger.warn(`updateProduct: starting process... dto=${JSON.stringify(dto)}`);
    const start = performance.now();

    // * find company
    const inputDto: SearchInputDto = new SearchInputDto(dto.companyId);
    
    return this.companyService.findCompaniesByParams({}, inputDto)
    .then( (companyList: Company[]) => {

      if(companyList.length == 0){
        const msg = `company not found, id=${dto.companyId}`;
        this.logger.warn(`updateProduct: not executed (${msg})`);
        throw new NotFoundException(msg);
      }

      const company = companyList[0];

      // * find product
      const inputDto: SearchInputDto = new SearchInputDto(dto.id);
        
      return this.findProductsByParams({}, inputDto)
      .then( (entityList: Product[]) => {

        // * validate
        if(entityList.length == 0){
          this.logger.warn(`createProduct: product not found, id=${dto.id}`);
          return this.createProduct(dto); // * create, if the dto has an id and the object is not found, the request may possibly come from data replication  
        }

        let entity = entityList[0];

        // * update
        entity.company = company;
        entity.name = dto.name.toUpperCase();
        entity.price = dto.price;
        
        return this.saveProduct(entity) // * update product
        .then( (entity: Product) => {

          const end = performance.now();
          this.logger.log(`updateProduct: executed, runtime=${(end - start) / 1000} seconds`);
          return dto;
        
        })
        
      })

    })
    .catch(error => {
      if(error instanceof NotFoundException)
        throw error;

      this.logger.error(`updateProduct: error`, error);
      throw error;
    })

  }

  createProduct(dto: ProductDto): Promise<ProductDto> {
    this.logger.warn(`createProduct: starting process... dto=${JSON.stringify(dto)}`);
    const start = performance.now();

    // * find company
    const inputDto: SearchInputDto = new SearchInputDto(dto.companyId);

    return this.companyService.findCompaniesByParams({}, inputDto)
    .then( (companyList: Company[]) => {

      if(companyList.length == 0){
        const msg = `company not found, id=${dto.companyId}`;
        this.logger.warn(`createProduct: not executed (${msg})`);
        throw new NotFoundException(msg);
        //return new productsResponseDto(HttpStatus.NOT_FOUND, msg);
      }

      const company = companyList[0];

      // * find product
      const inputDto: SearchInputDto = new SearchInputDto(undefined, [dto.name]);
      
      return this.findProductsByParams({}, inputDto, company.id)
      .then( (entityList: Product[]) => {
  
        // * validate
        if(entityList.length > 0){
          const msg = `product already exists, name=${dto.name}`;
          this.logger.warn(`createProduct: not executed (${msg})`);
          throw new AlreadyExistException(msg);
          // return new productsResponseDto(HttpStatus.BAD_REQUEST, msg);
        }
        
        // * create
        let entity = new Product();
        entity.id = dto.id ? dto.id : undefined;
        entity.company = company;
        entity.name = dto.name.toUpperCase();
        entity.price = dto.price;
          
        return this.saveProduct(entity) // * create product
        .then( (entity: Product) => {
  
          const end = performance.now();
          this.logger.log(`createProduct: created OK, runtime=${(end - start) / 1000} seconds`);
          return dto;
  
        })
  
      })

    })
    .catch(error => {
      if(error instanceof NotFoundException || error instanceof AlreadyExistException)
        throw error;

      this.logger.error(`createProduct: error`, error);
      throw error;
    })
    
  }

  findProducts(companyId: string, paginationDto: SearchPaginationDto, inputDto: SearchInputDto): Promise<ProductDto[]> {
    const start = performance.now();

    return this.findProductsByParams(paginationDto, inputDto, companyId)
    .then( (entityList: Product[]) => entityList.map( (entity) => new ProductDto(entity.company.id, entity.name, entity.price, entity.id) ) )
    .then( (dtoList: ProductDto[]) => {
      
      if(dtoList.length == 0){
        const msg = `products not found`;
        this.logger.warn(`findProducts: ${msg}`);
        throw new NotFoundException(msg);
        //return new ProductsResponseDto(HttpStatus.NOT_FOUND, msg);
      }

      const end = performance.now();
      this.logger.log(`findProducts: executed, runtime=${(end - start) / 1000} seconds`);
      return dtoList;
      //return new ProductsResponseDto(HttpStatus.OK, 'OK', dtoList);
    })
    .catch(error => {
      if(error instanceof NotFoundException)
        throw error;

      this.logger.error(`findProducts: error`, error);
      throw error;
    })
 
  }

  findOneProductByValue(companyId: string, value: string): Promise<ProductDto[]> {
    const start = performance.now();

    const inputDto: SearchInputDto = new SearchInputDto(value);

    return this.findProductsByParams({}, inputDto, companyId)
    .then( (entityList: Product[]) => entityList.map( (entity) => new ProductDto(entity.company.id, entity.name, entity.price, entity.id) ) )
    .then( (dtoList: ProductDto[]) => {
      
      if(dtoList.length == 0){
        const msg = `product not found, value=${value}`;
        this.logger.warn(`findOneProductByValue: ${msg}`);
        throw new NotFoundException(msg);
        //return new ProductsResponseDto(HttpStatus.NOT_FOUND, msg);
      }

      const end = performance.now();
      this.logger.log(`findOneProductByValue: executed, runtime=${(end - start) / 1000} seconds`);
      return dtoList;
      //return new ProductsResponseDto(HttpStatus.OK, 'OK', dtoList);
    })
    .catch(error => {
      if(error instanceof NotFoundException)
        throw error;

      this.logger.error(`findOneProductByValue: error`, error);
      throw error;
    })
    
  }

  removeProduct(id: string): Promise<string> {
    this.logger.warn(`removeProduct: starting process... id=${id}`);
    const start = performance.now();

    // * find product
    const inputDto: SearchInputDto = new SearchInputDto(id);
    
    return this.findProductsByParams({}, inputDto)
    .then( (entityList: Product[]) => {
  
      // * validate
      if(entityList.length == 0){
        const msg = `product not found, id=${id}`;
        this.logger.warn(`removeProduct: not executed (${msg})`);
        throw new NotFoundException(msg);
        //return new ProductsResponseDto(HttpStatus.NOT_FOUND, msg);
      }
      
      // * delete
      return this.productRepository.delete(id) // * delete product and productElement on cascade
      .then( () => {
        const end = performance.now();
        this.logger.log(`removeProduct: OK, runtime=${(end - start) / 1000} seconds`);
        return 'deleted';
        //return new ProductsResponseDto(HttpStatus.OK, 'delete OK');
      })

    })
    .catch(error => {
      if(error instanceof NotFoundException)
        throw error;

      if(error.errno == 1217) {
        const msg = 'product is being used';
        this.logger.warn(`removeProduct: not executed (${msg})`, error);
        throw new IsBeingUsedException(msg);
        //return new ProductsResponseDto(HttpStatus.BAD_REQUEST, 'product is being used');
      }

      this.logger.error('removeProduct: error', error);
      throw error;
    })

  }

  findProductsByParams(paginationDto: SearchPaginationDto, inputDto: SearchInputDto, companyId?: string): Promise<Product[]> {
    const {page=1, limit=this.dbDefaultLimit} = paginationDto;

    // * search by partial name
    if(inputDto.search) {
      const whereByName = { company: { id: companyId }, name: Like(`%${inputDto.search}%`), active: true };
      const whereById   = { id: inputDto.search, active: true };
      const where = isUUID(inputDto.search) ? whereById : whereByName;

      return this.productRepository.find({
        take: limit,
        skip: (page - 1) * limit,
        where: where
      })
    }

    // * search by names
    if(inputDto.searchList) {
      return this.productRepository.find({
        take: limit,
        skip: (page - 1) * limit,
        where: {
          company: { 
            id: companyId 
          },
          name: In(inputDto.searchList),
          active: true,
        }
      })
    }

    // * search all
    return this.productRepository.find({
      take: limit,
      skip: (page - 1) * limit,
      where: { 
        company: { 
          id: companyId 
        },
        active: true 
      }
    })
    
  }

  saveProduct(entity: Product): Promise<Product> {
    const start = performance.now();

    const newEntity: Product = this.productRepository.create(entity);

    return this.productRepository.save(newEntity)
    .then( (entity: Product) => {
      const end = performance.now();
      this.logger.log(`saveProduct: OK, runtime=${(end - start) / 1000} seconds, entity=${JSON.stringify(entity)}`);
      return entity;
    })
  }

}
