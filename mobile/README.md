# Attendance Mobile (Expo)

Quick start (local dev with Android emulator):

1. Install dependencies:
   - npm install
   - npx expo install @react-native-async-storage/async-storage expo-location expo-barcode-scanner
2. Start expo:
   - npm start
3. In Android emulator use host 10.0.2.2 to reach the Django backend running on localhost.

Usage notes:
- Open the app on an emulator or device, login as student or staff.
- Use the **Scan QR** button on the Courses screen to scan a QR code containing an attendance token. The scanned token will auto-fill the token field.

API base is configured in `mobile/src/api/client.js` (default: `http://10.0.2.2:8000/api`).

Screens:
- Login (student/staff)
- Courses
- Lecturer actions (generate tokens with geolocation) — includes QR generation & share/copy from toast
- Feedback: A simple "Give Feedback" screen is available from `Courses` where users can rate (1-5) and add a comment. Submits to `POST /api/feedback/` and works anonymously or with your logged-in token.

Notes:
- This is an MVP scaffold. Implement push notifications, offline sync, and E2E tests for production readiness.
- To enable token copy functionality install the native clipboard dependency:
  - npx expo install expo-clipboard
