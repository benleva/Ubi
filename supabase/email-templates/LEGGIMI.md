# Email di Supabase in italiano e inglese

Supabase manda da solo tre email (conferma iscrizione, nuova password, link di accesso). Per averle in due lingue:

1. Supabase › **Authentication › Emails** (o "Email Templates").
2. Per ciascun modello incolla il contenuto del file corrispondente nel riquadro del messaggio e cambia l'oggetto:

| Modello Supabase | File | Oggetto |
|---|---|---|
| Confirm signup | `conferma-iscrizione.html` | `Conferma la tua email · Confirm your email — Ubi` |
| Reset password | `nuova-password.html` | `Nuova password · New password — Ubi` |
| Magic link | `link-accesso.html` | `Il tuo link per entrare · Your login link — Ubi` |

3. Salva ogni modello.
