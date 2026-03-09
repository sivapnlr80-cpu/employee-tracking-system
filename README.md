# Employee Location Tracking System

A professional fleet management solution with proper consent mechanisms and privacy controls.

## Features
- Real-time employee location tracking with explicit consent
- Admin dashboard for monitoring employee locations
- Secure authentication and session management
- Privacy-focused design with user controls
- WebSocket-based real-time communication
- GPS consent management

## Security & Privacy
- Employees must explicitly consent to location sharing
- Location data is encrypted in transit
- Sessions are time-limited and revocable
- Admin can stop tracking at any time
- No location data stored without consent

## Setup
1. Install dependencies: `npm install`
2. Set up environment variables
3. Run database migrations
4. Start server: `npm start`
5. Access admin dashboard: `http://localhost:3000/admin`
6. Employee access: `http://localhost:3000/track`

## Usage
1. Admin creates tracking session
2. Employee receives link and provides GPS consent
3. Live location appears on admin dashboard
4. Admin can stop tracking at any time
