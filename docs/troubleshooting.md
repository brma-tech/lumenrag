# Troubleshooting

## OpenAI returns 429

`insufficient_quota` or `credit_balance_exhausted` means the project attached to
the API key has no remaining balance. A `rate_limit_exceeded` response requires
slower request pacing instead.

## WinError 10054

This means a local peer closed the connection. Check that LumenVec is healthy:

```powershell
Invoke-WebRequest http://127.0.0.1:19190/health
```

The LumenRAG backend logs each chat stage (`embedding`, `lumenvec_search`, and
`chat_completion`) so you can identify where a request stopped.

## Destination not authorized

Use one of the built-in providers or add the service origin to
`LUMENRAG_ALLOWED_OUTBOUND_URLS`. Do not put credentials in a provider URL.
