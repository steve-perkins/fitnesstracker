# FitnessTracker Production Deployment

This document describes how to build, push, and deploy the FitnessTracker application to production.

## Prerequisites

- Docker installed locally
- Access to `registry.steveperkins.com` (private Docker registry)
- SSH access to the Hetzner server
- DNS records configured for `fitness.steveperkins.com` and `api.fitness.steveperkins.com`

## Architecture

- **Frontend**: React SPA served by Nginx at `https://fitness.steveperkins.com`
- **Backend**: NestJS API at `https://api.fitness.steveperkins.com`
- **Database**: PostgreSQL 16 (internal network, not exposed)
- **Reverse Proxy**: Traefik with automatic Let's Encrypt SSL

## Build and Push Docker Images

### 1. Login to Private Registry

```bash
docker login registry.steveperkins.com
# Username: admin
# Password: (stored in registry htpasswd)
```

### 2. Build and Push Backend

```bash
cd backend
docker build -t registry.steveperkins.com/fitnesstracker-api:latest .
docker push registry.steveperkins.com/fitnesstracker-api:latest
```

### 3. Build and Push Frontend

The frontend requires build-time environment variables for the API URL and Google OAuth client ID:

```bash
cd web
docker build \
  --build-arg VITE_API_BASE_URL=https://api.fitness.steveperkins.com \
  --build-arg VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID \
  -t registry.steveperkins.com/fitnesstracker-web:latest .
docker push registry.steveperkins.com/fitnesstracker-web:latest
```

## Database Migration

### Initial Setup (First Deployment Only)

1. Export data from local PostgreSQL migration instance:

```bash
cd migration
docker exec fitness-postgres-migration pg_dump -U fitness_user -d fitness_tracker > fitnesstracker_dump.sql
```

2. Copy dump file to Hetzner server:

```bash
scp fitnesstracker_dump.sql user@hetzner-server:~/
```

3. On Hetzner server, after PostgreSQL container is running:

```bash
docker exec -i db-postgres-fitnesstracker psql -U fitnesstracker -d fitnesstracker < ~/fitnesstracker_dump.sql
```

## Deploy to Hetzner

### 1. Copy Docker Compose File

```bash
scp docker/docker-compose.yml user@hetzner-server:~/docker/
```

### 2. Update Configuration

On the Hetzner server, edit `docker-compose.yml` and update:

- `JWT_SECRET`: Generate with `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID`: Your Google OAuth client ID

### 3. Pull and Start Services

```bash
ssh user@hetzner-server
cd ~/docker
docker login registry.steveperkins.com
docker compose pull fitnesstracker-api fitnesstracker-web
docker compose up -d db-postgres-fitnesstracker fitnesstracker-api fitnesstracker-web
```

### 4. Verify Deployment

```bash
# Check containers are running
docker compose ps

# Check logs
docker compose logs fitnesstracker-api
docker compose logs fitnesstracker-web

# Test API
curl https://api.fitness.steveperkins.com/
```

## Google OAuth Configuration

In Google Cloud Console (https://console.cloud.google.com):

1. Go to: APIs & Services > Credentials > OAuth 2.0 Client IDs
2. Edit your OAuth client
3. Add to **Authorized JavaScript origins**:
   - `https://fitness.steveperkins.com`
4. Add to **Authorized redirect URIs**:
   - `https://fitness.steveperkins.com`

## DNS Configuration

Add A records pointing to your Hetzner server IP:

| Record | Name | Value |
|--------|------|-------|
| A | fitness | `<server-ip>` |
| A | api.fitness | `<server-ip>` |

Verify with: `dig fitness.steveperkins.com`

## Updating the Application

To deploy updates:

1. Make code changes
2. Rebuild and push Docker images (see above)
3. On server:

```bash
cd ~/docker
docker compose pull fitnesstracker-api fitnesstracker-web
docker compose up -d fitnesstracker-api fitnesstracker-web
```

## Rollback

To rollback to a previous version:

1. Tag current images before deploying:

```bash
docker tag registry.steveperkins.com/fitnesstracker-api:latest \
           registry.steveperkins.com/fitnesstracker-api:backup-YYYYMMDD
docker push registry.steveperkins.com/fitnesstracker-api:backup-YYYYMMDD
```

2. To rollback, pull the backup tag and restart:

```bash
docker pull registry.steveperkins.com/fitnesstracker-api:backup-YYYYMMDD
docker tag registry.steveperkins.com/fitnesstracker-api:backup-YYYYMMDD \
           registry.steveperkins.com/fitnesstracker-api:latest
docker compose up -d fitnesstracker-api
```

## Troubleshooting

### PWA manifest returns 403

If `manifest.json` or `sw.js` return 403 errors in production, the files likely have restrictive permissions (600 instead of 644). This can happen silently since Git doesn't track permission changes for files it already knows about.

Fix locally before rebuilding:
```bash
chmod 644 web/public/manifest.json web/public/sw.js
```

Then rebuild and redeploy the frontend image.

### Container won't start

```bash
docker compose logs fitnesstracker-api
```

### Database connection issues

```bash
# Check PostgreSQL is running
docker compose ps db-postgres-fitnesstracker

# Connect to database
docker exec -it db-postgres-fitnesstracker psql -U fitnesstracker -d fitnesstracker
```

### SSL certificate issues

Traefik handles SSL automatically. Check Traefik logs:

```bash
docker compose logs traefik
```

### CORS errors

Ensure the production frontend URL is in the backend CORS configuration (`backend/src/main.ts`).
