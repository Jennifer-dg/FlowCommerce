import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@flowcommerce/types';

export class ProjectDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  creadoEn!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  actualizadoEn!: Date;
}

export class UserProjectDto extends ProjectDto {
  @ApiProperty({ enum: Role })
  role!: Role;
}
