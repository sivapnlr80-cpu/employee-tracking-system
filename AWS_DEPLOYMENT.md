# AWS Deployment Guide - Employee Tracking System

## Option 1: AWS EC2 Deployment (Recommended)

### Prerequisites
- AWS Account
- EC2 Instance (Ubuntu 20.04+ recommended)
- Domain name (optional)
- SSL certificate (for HTTPS)

### Step 1: Launch EC2 Instance

1. **Go to AWS Console → EC2 → Launch Instance**
2. **Choose AMI:** Ubuntu Server 20.04 LTS
3. **Instance Type:** t2.micro (Free tier) or t3.small
4. **Key Pair:** Create/download key pair for SSH access
5. **Security Group:** Allow ports:
   - SSH (22): Your IP only
   - HTTP (80): Anywhere (0.0.0.0/0)
   - HTTPS (443): Anywhere (0.0.0.0/0)
6. **Launch Instance**

### Step 2: Connect to EC2 Instance

```bash
# SSH into your instance
ssh -i "your-key-pair.pem" ubuntu@your-ec2-public-ip

# Update system
sudo apt update && sudo apt upgrade -y
```

### Step 3: Install Node.js

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 4: Clone Your Repository

```bash
# Install git
sudo apt install git -y

# Clone your repository
git clone https://github.com/sivapnlr80-cpu/employee-tracking-system.git
cd employee-tracking-system

# Install dependencies
npm install
```

### Step 5: Configure Environment

```bash
# Copy environment file
cp .env.example .env

# Edit environment variables
nano .env
```

**Important .env settings:**
```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=3000
CORS_ORIGIN=https://your-domain.com
```

### Step 6: Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the application
pm2 start server.js --name "employee-tracking"

# Save PM2 configuration
pm2 save
pm2 startup
```

### Step 7: Set up Nginx as Reverse Proxy

```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/employee-tracking
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Or your EC2 public IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/employee-tracking /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
```

### Step 8: Set up SSL with Let's Encrypt (Optional but Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add this line:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

### Step 9: Configure Firewall

```bash
# Allow Nginx through firewall
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw enable
```

## Option 2: AWS Elastic Beanstalk (Easier)

### Step 1: Prepare Your Application

```bash
# Create a .ebextensions directory
mkdir .ebextensions

# Create nodejs.config file
cat > .ebextensions/nodejs.config << EOF
option_settings:
  aws:elasticbeanstalk:container:nodejs:
    NodeCommand: "npm start"
    NodeVersion: "18.x"
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    PORT: 8080
EOF

# Create Procfile
echo "web: npm start" > Procfile

# Commit changes
git add .
git commit -m "Add Elastic Beanstalk configuration"
git push origin main
```

### Step 2: Deploy via Elastic Beanstalk Console

1. **Go to AWS Console → Elastic Beanstalk**
2. **Create Application**
3. **Application name:** employee-tracking-system
4. **Platform:** Node.js
5. **Application code:** Connect to GitHub
6. **Select your repository:** sivapnlr80-cpu/employee-tracking-system
7. **Deploy**

## Option 3: AWS Amplify (Simplest for Static + Backend)

### Step 1: Add Amplify Configuration

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Initialize Amplify
amplify init

# Add hosting
amplify add hosting

# Deploy
amplify publish
```

## Option 4: Docker on EC2 (Most Professional)

### Step 1: Create Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

USER node

CMD ["npm", "start"]
```

### Step 2: Create docker-compose.yml

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

### Step 3: Deploy with Docker

```bash
# Install Docker on EC2
sudo apt install docker.io docker-compose -y
sudo usermod -aG docker ubuntu

# Build and run
docker-compose up -d
```

## Security Considerations

1. **Change default admin password**
2. **Use environment variables for secrets**
3. **Enable HTTPS**
4. **Regular security updates**
5. **Monitor AWS CloudTrail logs**
6. **Use AWS WAF for additional protection**

## Monitoring and Maintenance

```bash
# Check application logs
pm2 logs employee-tracking

# Monitor system resources
htop

# Check Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Update application
cd employee-tracking-system
git pull origin main
npm install
pm2 restart employee-tracking
```

## Cost Optimization

- **Free tier:** t2.micro instance (750 hours/month)
- **Reserved instances:** Save up to 60% for 1-3 year commitments
- **Spot instances:** Save up to 90% for fault-tolerant workloads
- **Auto Scaling:** Scale based on demand

## Backup Strategy

```bash
# Backup database
sqlite3 tracking.db ".backup backup-$(date +%Y%m%d).db"

# Backup to S3 (optional)
aws s3 cp tracking.db s3://your-backup-bucket/
```

Choose the option that best fits your needs:
- **EC2:** Full control, best for custom configurations
- **Elastic Beanstalk:** Easier deployment, managed platform
- **Amplify:** Simplest for modern web apps
- **Docker:** Most professional, containerized deployment
