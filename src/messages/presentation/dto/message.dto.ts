import { ApiProperty } from '@nestjs/swagger';
import { MessageDirection } from '@flowcommerce/types';

export class MessageDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  projectId!: string;

  @ApiProperty({ format: 'uuid' })
  leadId!: string;

  @ApiProperty({
    example: 'wamid.HBgLMzIzNDU2Nzc4OTAKACAAMwND...',
    description: 'Id asignado por la API de WhatsApp. Clave de idempotencia.',
  })
  whatsappMessageId!: string;

  @ApiProperty({ enum: MessageDirection, example: MessageDirection.OUTBOUND })
  direction!: MessageDirection;

  @ApiProperty({ example: 'Hola Ana, le comparto la propuesta.' })
  content!: string;

  @ApiProperty({
    example: 'SENT',
    description: 'Estado reportado por WhatsApp: SENT, DELIVERED, READ...',
  })
  status!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  creadoEn!: Date;
}
