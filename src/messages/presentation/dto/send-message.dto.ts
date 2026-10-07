import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  // El texto es lo único que el cliente decide. whatsappMessageId, direction y
  // status no aparecen aquí a propósito: el primero lo asigna la API de
  // WhatsApp, la dirección es siempre OUTBOUND en este endpoint y el estado lo
  // reporta la propia API. No se puede forzar ninguno de los tres desde HTTP.
  @ApiProperty({
    example: 'Hola Ana, le comparto la propuesta que conversamos.',
    description: 'Texto del mensaje que se enviará al lead.',
  })
  @IsString()
  @IsNotEmpty()
  // 4096 es el límite de un mensaje de texto de WhatsApp. Más allá la Graph API
  // rechaza la petición, así que se corta aquí para devolver un 400 en la
  // frontera en lugar de un error del proveedor con 500.
  @MaxLength(4096)
  content!: string;
}
