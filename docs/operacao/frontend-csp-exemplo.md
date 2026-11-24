# CSP — frontend SchedulerPro (produção)

O pacote `client/` é uma SPA estática (`client/dist`). **Não** usar meta CSP restritiva em desenvolvimento (Vite HMR). Aplicar cabeçalhos HTTP no servidor que entrega `dist/`.

## Directivas sugeridas (ajustar hosts reais)

Substituir `https://api.exemplo.com` e `https://res.cloudinary.com` pelos valores de produção.

```
Content-Security-Policy:
  default-src 'self';
  base-uri 'self';
  object-src 'none';
  frame-ancestors 'none';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://res.cloudinary.com;
  font-src 'self';
  connect-src 'self' https://api.exemplo.com;
  form-action 'self';
  upgrade-insecure-requests;
```

Notas:

- `style-src 'unsafe-inline'`: Bootstrap e alguns componentes podem usar estilos inline; reavaliar após auditoria CSS.
- `connect-src`: incluir o origin da API (`VITE_API_URL`).
- Cookies de sessão: `SameSite` e HTTPS no backend — ver módulo auth do servidor.

## Exemplo Nginx

```nginx
location / {
  root /var/www/schedulerpro/client/dist;
  try_files $uri $uri/ /index.html;
  add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://res.cloudinary.com; font-src 'self'; connect-src 'self' https://api.exemplo.com; base-uri 'self'; object-src 'none'; frame-ancestors 'none'" always;
}
```

## Exemplo Caddy

```
header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://res.cloudinary.com; font-src 'self'; connect-src 'self' https://api.exemplo.com; base-uri 'self'; object-src 'none'; frame-ancestors 'none'"
root * /var/www/schedulerpro/client/dist
try_files {path} /index.html
file_server
```

## Validação manual

1. `npm run build && npm run preview`
2. Aplicar headers (ou proxy de teste)
3. Login, dashboard, upload de imagem, booking público