# Employee Tracking System - Installation Guide

## Overview
A professional employee location tracking system with proper consent management, real-time monitoring, and privacy controls.

## System Requirements
- Node.js 14+ 
- Modern web browser with GPS support
- SQLite3 (included with Node.js)

## Installation Steps

### 1. Clone or Download the Project
```bash
# If using git
git clone <repository-url>
cd employee-tracking-system

# Or download and extract the files to your desired directory
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env file with your settings
# Important: Change the JWT_SECRET in production!
```

### 4. Initialize Database
The database will be created automatically when you first run the server. Alternatively, you can run:
```bash
# If you have sqlite3 command line tool
sqlite3 tracking.db < setup.sql
```

### 5. Start the Server
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

### 6. Access the Application
- **Main Page**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin
- **Employee Tracking**: http://localhost:3000/track

## Default Login
- **Username**: admin
- **Password**: admin123

⚠️ **Important**: Change the default admin password immediately after first login!

## Configuration

### Environment Variables
Edit the `.env` file to configure:

- `JWT_SECRET`: Secret key for authentication (change in production!)
- `PORT`: Server port (default: 3000)
- `DB_PATH`: Database file path (default: ./tracking.db)
- `CORS_ORIGIN`: Allowed CORS origins (default: *)

### Security Settings
- Rate limiting is enabled (100 requests per 15 minutes)
- Helmet.js security headers are configured
- All passwords are hashed with bcrypt
- JWT tokens expire after 24 hours

## Usage Guide

### For Administrators
1. Login to the admin dashboard
2. Enter an Employee ID to create a tracking session
3. Share the generated tracking link with the employee
4. Monitor real-time location on the dashboard
5. End the tracking session when needed

### For Employees
1. Click the tracking link provided by your administrator
2. Review the privacy information and consent form
3. Choose to consent or decline location sharing
4. If consented, your location will be shared in real-time
5. Close the page to stop sharing at any time

## Privacy & Compliance

### Consent Management
- Employees must explicitly consent to location tracking
- Consent is recorded with IP address and timestamp
- Employees can revoke consent by closing the tracking page
- Administrators can end tracking sessions at any time

### Data Security
- All location data is transmitted over HTTPS (when configured)
- Database contains consent records and audit trails
- Sessions are time-limited and revocable
- No location data is stored without explicit consent

### Legal Compliance
This system is designed for legitimate business purposes:
- Fleet management and vehicle tracking
- Employee safety monitoring
- Workforce coordination
- Emergency response

Always ensure compliance with local privacy laws and regulations.

## Deployment

### Production Deployment
1. Set up a reverse proxy (nginx/Apache) for SSL termination
2. Configure HTTPS with valid SSL certificates
3. Set up proper firewall rules
4. Configure database backups
5. Monitor system logs and performance

### Docker Deployment (Optional)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Troubleshooting

### Common Issues

**GPS not working**
- Ensure HTTPS is enabled (required for GPS in most browsers)
- Check browser location permissions
- Verify device has GPS capabilities

**Database errors**
- Check file permissions for the database file
- Ensure SQLite3 is properly installed
- Verify the database path in .env

**Socket connection issues**
- Check firewall settings
- Verify port accessibility
- Ensure WebSocket support is enabled

### Logs
Check the console output for detailed error messages and system status.

## Support
For technical support or questions about the system, contact your system administrator.

## License
MIT License - See LICENSE file for details.
