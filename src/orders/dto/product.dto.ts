import { IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength, ValidateNested } from "class-validator";

export class ProductDto {
  
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsUUID()
  companyId: string;

  @IsString()
  @MaxLength(45)
  name: string;

  @IsNumber()
  price: number;

  constructor(companyId: string, name: string, price: number, id?: string) {
    this.companyId = companyId;
    this.name = name;
    this.price = price;
    this.id = id;
  }
}
