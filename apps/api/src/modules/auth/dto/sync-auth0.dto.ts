import { IsEmail, IsOptional } from 'class-validator';

/** Optional email from the Auth0 session when the access token has no email claim. */
export class SyncAuth0Dto {
  @IsOptional()
  @IsEmail()
  email?: string;
}
