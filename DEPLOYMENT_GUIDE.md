# Deployment Guide

This guide covers deploying the AI Voice IVR System to production.

## Pre-Deployment Checklist

- [ ] All features tested locally
- [ ] Environment variables documented
- [ ] Database backup strategy planned
- [ ] Domain names acquired (if needed)
- [ ] SSL certificates ready
- [ ] Production API keys obtained
- [ ] Monitoring tools selected

## Option 1: Deploy to Vercel (Frontend) + Railway (Backend)

### Backend Deployment (Railway)

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your repository
   - Select the `backend` folder

3. **Configure Environment Variables**
   - Go to Variables tab
   - Add all variables from `.env`:
     ```
     NODE_ENV=production
     PORT=5000
     MONGODB_URI=your_production_mongodb_uri
     JWT_SECRET=your_production_jwt_secret
     TWILIO_ACCOUNT_SID=your_twilio_sid
     TWILIO_AUTH_TOKEN=your_twilio_token
     TWILIO_PHONE_NUMBER=your_twilio_number
     VAPI_API_KEY=your_vapi_key
     VAPI_PHONE_NUMBER_ID=your_vapi_phone_id
     OPENAI_API_KEY=your_openai_key
     FRONTEND_URL=https://your-frontend-domain.vercel.app
     ```

4. **Deploy**
   - Railway will auto-deploy
   - Note your backend URL: `https://your-app.railway.app`

### Frontend Deployment (Vercel)

1. **Create Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub

2. **Import Project**
   - Click "New Project"
   - Import your repository
   - Select the `frontend` folder as root directory

3. **Configure Environment Variables**
   - Add environment variable:
     ```
     NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
     ```

4. **Deploy**
   - Click "Deploy"
   - Your app will be live at: `https://your-app.vercel.app`

### Update Webhooks

1. **Twilio Console**
   - Update webhook URLs to: `https://your-backend.railway.app/api/webhooks/twilio/status`

2. **Vapi Dashboard**
   - Update webhook URL to: `https://your-backend.railway.app/api/webhooks/vapi`

## Option 2: Deploy to Heroku

### Backend Deployment

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
cd backend
heroku create your-ivr-backend

# Add MongoDB addon (or use Atlas)
heroku addons:create mongolab:sandbox

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_secret
heroku config:set TWILIO_ACCOUNT_SID=your_sid
heroku config:set TWILIO_AUTH_TOKEN=your_token
heroku config:set TWILIO_PHONE_NUMBER=your_number
heroku config:set VAPI_API_KEY=your_key
heroku config:set VAPI_PHONE_NUMBER_ID=your_id
heroku config:set OPENAI_API_KEY=your_key
heroku config:set FRONTEND_URL=https://your-frontend.vercel.app

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

### Frontend Deployment

Deploy to Vercel (same as Option 1)

## Option 3: Deploy to AWS

### Backend (EC2)

1. **Launch EC2 Instance**
   - Ubuntu 22.04 LTS
   - t2.small or larger
   - Open ports: 22, 80, 443, 5000

2. **SSH into Instance**
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   ```

3. **Install Dependencies**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   
   # Install PM2
   sudo npm install -g pm2
   
   # Install Nginx
   sudo apt install -y nginx
   ```

4. **Clone and Setup**
   ```bash
   git clone your-repo-url
   cd IVR_System/backend
   npm install
   
   # Create .env file
   nano .env
   # Add all production environment variables
   ```

5. **Start with PM2**
   ```bash
   pm2 start server.js --name ivr-backend
   pm2 startup
   pm2 save
   ```

6. **Configure Nginx**
   ```bash
   sudo nano /etc/nginx/sites-available/ivr-backend
   ```
   
   Add:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   
   Enable:
   ```bash
   sudo ln -s /etc/nginx/sites-available/ivr-backend /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

7. **Setup SSL with Let's Encrypt**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

### Frontend (Vercel)

Deploy to Vercel (same as Option 1)

## Option 4: Docker Deployment

### Create Dockerfiles

**backend/Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

**frontend/Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Docker Compose

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET=${JWT_SECRET}
      # Add all other env vars
    restart: always
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:5000/api
    depends_on:
      - backend
    restart: always
```

### Deploy
```bash
docker-compose up -d
```

## Production MongoDB Setup

### MongoDB Atlas (Recommended)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster (M10 or higher for production)
3. Configure network access (whitelist your server IPs)
4. Create database user
5. Get connection string
6. Update `MONGODB_URI` in production

## Security Checklist

- [ ] Use strong JWT_SECRET (64+ characters)
- [ ] Enable HTTPS everywhere
- [ ] Set secure CORS origins
- [ ] Use environment variables for all secrets
- [ ] Enable MongoDB authentication
- [ ] Set up firewall rules
- [ ] Use rate limiting
- [ ] Enable request logging
- [ ] Set up error monitoring (Sentry)
- [ ] Regular security updates
- [ ] Backup database regularly

## Monitoring Setup

### Recommended Tools

1. **Application Monitoring**
   - [Sentry](https://sentry.io) - Error tracking
   - [LogRocket](https://logrocket.com) - Session replay
   - [New Relic](https://newrelic.com) - APM

2. **Uptime Monitoring**
   - [UptimeRobot](https://uptimerobot.com)
   - [Pingdom](https://pingdom.com)

3. **Log Management**
   - [Papertrail](https://papertrailapp.com)
   - [Loggly](https://loggly.com)

## Post-Deployment

1. **Test All Features**
   - User registration/login
   - Script creation
   - Voice configuration
   - Single calls
   - Bulk campaigns
   - Call transfers
   - Analytics

2. **Monitor Performance**
   - Check response times
   - Monitor error rates
   - Watch database performance
   - Track API usage

3. **Setup Backups**
   - Database backups (daily)
   - Code backups (Git)
   - Environment variable backups

4. **Documentation**
   - Document deployment process
   - Create runbook for common issues
   - Document rollback procedure

## Scaling Considerations

### When to Scale

- Response time > 500ms
- CPU usage > 70%
- Memory usage > 80%
- Database connections maxed out

### How to Scale

1. **Horizontal Scaling**
   - Add more backend instances
   - Use load balancer (AWS ALB, Nginx)
   - Scale MongoDB (replica sets)

2. **Vertical Scaling**
   - Upgrade server resources
   - Increase database tier

3. **Caching**
   - Add Redis for session storage
   - Cache frequently accessed data
   - Use CDN for static assets

## Troubleshooting

### Backend Issues
```bash
# Check logs
pm2 logs ivr-backend
# or
heroku logs --tail
# or
railway logs
```

### Frontend Issues
```bash
# Check Vercel logs
vercel logs
```

### Database Issues
- Check MongoDB Atlas metrics
- Review slow queries
- Check connection limits

## Support

For deployment issues:
1. Check application logs
2. Verify environment variables
3. Test API endpoints
4. Check webhook configurations
5. Review security groups/firewall rules

## Rollback Procedure

If deployment fails:

1. **Vercel**: Use "Rollback" button in dashboard
2. **Railway**: Redeploy previous version
3. **Heroku**: `heroku rollback`
4. **AWS**: Restore from backup, redeploy previous version

---

**Remember**: Always test in staging environment before production deployment!

