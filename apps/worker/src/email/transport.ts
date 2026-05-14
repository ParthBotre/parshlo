import nodemailer, { type Transporter } from 'nodemailer';
import { Resend } from 'resend';

import { config } from '../config.js';

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}

export interface EmailTransport {
  send: (msg: EmailMessage) => Promise<void>;
}

class ResendTransport implements EmailTransport {
  private readonly client: Resend;
  constructor(apiKey: string) {
    this.client = new Resend(apiKey);
  }
  async send(msg: EmailMessage): Promise<void> {
    const { error } = await this.client.emails.send({
      from: config.EMAIL_FROM,
      to: Array.isArray(msg.to) ? msg.to : [msg.to],
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    });
    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }
  }
}

class SmtpTransport implements EmailTransport {
  private readonly transport: Transporter;
  constructor(host: string, port: number) {
    this.transport = nodemailer.createTransport({
      host,
      port,
      secure: false,
      tls: { rejectUnauthorized: false },
    });
  }
  async send(msg: EmailMessage): Promise<void> {
    await this.transport.sendMail({
      from: config.EMAIL_FROM,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    });
  }
}

export function createEmailTransport(): EmailTransport {
  if (config.EMAIL_TRANSPORT === 'resend') {
    if (!config.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY required for EMAIL_TRANSPORT=resend');
    }
    return new ResendTransport(config.RESEND_API_KEY);
  }
  return new SmtpTransport(config.MAILHOG_HOST, config.MAILHOG_PORT);
}
