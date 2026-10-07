import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@flowcommerce/types';

export class MemberDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ format: 'uuid' })
  projectId!: string;

  @ApiProperty({ enum: Role })
  role!: Role;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;
}
