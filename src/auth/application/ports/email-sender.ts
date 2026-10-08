// Mensaje de correo saliente. El asunto/texto/html los arma quien invoca;
// el transporte no decide contenido.
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

// Puerto de envío de correo: la aplicación depende de esta interfaz, no de
// Resend ni de ningún proveedor concreto.
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export const EMAIL_SENDER = Symbol('EMAIL_SENDER');
