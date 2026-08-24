import { SetMetadata } from '@nestjs/common';

// Marca una rotta come raggiungibile senza sessione valida — usato solo per
// login/registrazione/set-password/account-status. I redirect di Google
// (auth/gmail|drive/connect|callback) restano protetti dal guard normale:
// sono navigazioni GET del browser con cookie SameSite=Lax, quindi il
// cookie di sessione arriva comunque anche dopo il redirect cross-site da
// accounts.google.com.
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
