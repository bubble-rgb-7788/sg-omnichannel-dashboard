const unauthorized = () => new Response('Authentication required', {
  status: 401,
  headers: { 'WWW-Authenticate': 'Basic realm="Sales Dashboard"' },
});

export async function onRequest(context) {
  const configuredUser = context.env.DASHBOARD_USER;
  const configuredPassword = context.env.DASHBOARD_PASSWORD;

  if (!configuredUser || !configuredPassword) {
    return new Response('Dashboard authentication is not configured.', { status: 503 });
  }

  const authorization = context.request.headers.get('Authorization') || '';
  if (!authorization.startsWith('Basic ')) return unauthorized();

  let decoded;
  try {
    decoded = atob(authorization.slice(6));
  } catch {
    return unauthorized();
  }

  const separator = decoded.indexOf(':');
  const user = separator >= 0 ? decoded.slice(0, separator) : '';
  const password = separator >= 0 ? decoded.slice(separator + 1) : '';
  if (user !== configuredUser || password !== configuredPassword) return unauthorized();

  return context.next();
}
