export type AppView =
  | 'landing'
  | 'dashboard'
  | 'legal'
  | 'roast'
  | 'blog'
  | 'feature'
  | 'pricing'
  | 'changelog'
  | 'success-stories'
  | 'what-is-hireschema';

export type LegalView = 'privacy' | 'terms' | 'cookies' | null;

export interface ParsedAppRoute {
  view: AppView;
  legalPage: LegalView;
  blogSlug: string | null;
  featureId: string | null;
  hasPaymentCallback: boolean;
}

const isPaymentCallback = (search: string): boolean => {
  const params = new URLSearchParams(search || '');
  return !!(
    params.get('paymentId') ||
    params.get('payment_id') ||
    params.get('session_id') ||
    params.get('session') ||
    params.get('checkout_session') ||
    params.get('id')
  );
};

export const parseAppRoute = (pathname: string, search: string): ParsedAppRoute => {
  const path = pathname || '/';
  const payment = isPaymentCallback(search);

  let view: AppView = 'landing';
  if (payment || path === '/app') view = 'dashboard';
  else if (path === '/roast' || path === '/roast-my-resume') view = 'roast';
  else if (path === '/pricing') view = 'pricing';
  else if (path === '/what-is-hireschema') view = 'what-is-hireschema';
  else if (path.startsWith('/feature/')) view = 'feature';
  else if (path.startsWith('/blog')) view = 'blog';
  else if (path === '/changelog') view = 'changelog';
  else if (path === '/success-stories') view = 'success-stories';
  else if (['/privacy', '/terms', '/cookies'].includes(path)) view = 'legal';

  const legalPage: LegalView = view === 'legal'
    ? (path.slice(1) as LegalView)
    : null;

  const blogSlug = path.startsWith('/blog')
    ? (path.replace(/^\/blog\/?/, '') || null)
    : null;

  const featureId = path.startsWith('/feature/')
    ? path.replace('/feature/', '') || null
    : null;

  return {
    view,
    legalPage,
    blogSlug,
    featureId,
    hasPaymentCallback: payment
  };
};
