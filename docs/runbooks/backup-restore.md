# Backup And Restore Runbook

Use this runbook before migrations, before risky data changes, and during restore drills.

## Backup Before Migration

```bash
mkdir -p backups
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file "backups/prod-$(date +%Y%m%d-%H%M%S).dump"
```

Store the dump outside the database provider. For production, keep at least:

- 7 daily backups
- 4 weekly backups
- 12 monthly backups

## Restore Drill Into Staging

Never restore directly over production for a drill.

```bash
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --dbname "$STAGING_DATABASE_URL" \
  backups/prod-YYYYMMDD-HHMMSS.dump
```

After restore:

1. Run the app against staging only.
2. Verify login with staging Auth0 users.
3. Verify orders, buyers, products, and audit logs are readable.
4. Confirm no production email/SMS credentials are active in staging.

## Emergency Production Restore

Only do this when:

- the incident owner approves it
- the target restore point is known
- current production is backed up first
- users are notified or the app is temporarily placed in maintenance mode

Prefer provider point-in-time recovery over manual `pg_restore` when available.
