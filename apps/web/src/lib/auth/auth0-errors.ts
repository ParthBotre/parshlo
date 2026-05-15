/** Map Auth0 / OAuth callback errors to user-facing copy. */
export function authErrorMessage(error?: string, description?: string): string {
  if (error === 'access_denied') {
    return 'Sign-in was cancelled. Please try again.';
  }
  if (error === 'login_required') {
    return 'Please sign in to continue.';
  }
  if (description) {
    return description;
  }
  if (error) {
    return `Sign-in failed (${error}). Please try again.`;
  }
  return 'Sign-in failed. Please try again.';
}

export function signInRedirectUrl(
  base: string | URL,
  opts: { error?: string; error_description?: string; next?: string },
): URL {
  const url = new URL('/auth/sign-in', base);
  if (opts.error) {
    url.searchParams.set('error', opts.error);
  }
  if (opts.error_description) {
    url.searchParams.set('error_description', opts.error_description);
  }
  if (opts.next?.startsWith('/')) {
    url.searchParams.set('next', opts.next);
  }
  return url;
}
