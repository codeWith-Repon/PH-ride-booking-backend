# Ride Booking API

A secure, scalable, and modular backend API for a ride booking system built with Node.js, Express.js, TypeScript, and MongoDB.

## Features

- Authentication & Authorization

  - JWT-based Auth (Access & Refresh Token)
  - Role-based Access (Admin, Rider, Driver)

- User Management

  - Riders and Drivers under single User model

- Driver Features

  - Set availability status

  - Accept or reject rides

- Ride Management

  - Request, accept, start, complete, cancel rides
  - OTP verification before starting ride

- Vehicle Management

  - Cloudinary file upload for vehicle images

- Zod Validation

- Mongoose Models & Hooks

- Error Handling & Logging

### Tech Stack

- Backend: Node.js, Express.js

- Database: MongoDB, Mongoose

- Validation: Zod

- Authentication: JWT

- Image Upload: Multer + Cloudinary

- Language: TypeScript

## Project Structure

```bash
src/
├── app.ts
├── server.ts
├── config/
├── modules/
│ ├── auth/
│ ├── user/
│ ├── driver/
│ ├── vehicle/
│ └── ride/
├── middlewares/
├── utils/
```

## Installation & Setup

1.  Clone the repo

```bash
git clone https://github.com/codeWith-Repon/PH-ride-booking-backend.git
cd ride-booking-api
```

2.  Install dependencies

```bash
npm install
```

3. Environment variables (.env)

```bash
PORT=5000
MONGO_URI=mongodb://localhost:27017/ride-booking
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

4.  Run the server

```bash
npm run dev
```

## API Endpoints

### Auth Routes

| Method | Endpoint                       | Description          | Access |
| ------ | ------------------------------ | -------------------- | ------ |
| POST   | `/api/v1/auth/login`           | Login user           | Public |
| POST   | `/api/v1/auth/logout`          | Logout user          | Auth   |
| POST   | `/api/v1/auth/refresh-token`   | Get new access token | Auth   |
| POST   | `/api/v1/auth/change-password` | Change password      | Auth   |
| GET    | `/api/v1/auth/google`          | Google login         | Public |

### User Routes

| Method | Endpoint                     | Description             | Access       |
| ------ | ---------------------------- | ----------------------- | ------------ |
| POST   | `/api/v1/user/register-user` | Register user           | Public       |
| GET    | `/api/v1/user/users`         | Get all users           | Admin Only   |
| GET    | `/api/v1/user/get-me`        | Get logged-in user info | Rider/Driver |
| GET    | `/api/v1/user/:userId`       | Get single user         | Admin only   |
| PATCH  | `/api/v1/user/:userId`       | Update user profile     | Rider/Driver |

### Driver Routes

| Method | Endpoint                                 | Description           | Access |
| ------ | ---------------------------------------- | --------------------- | ------ |
| POST   | `/api/v1/driver/register-driver`         | Create driver profile | Public |
| POST   | `/api/v1/driver/change-status/:driverId` | Update driver status  | Admin  |
| GET    | `/api/v1/driver/drivers`                 | Get all drivers       | Admin  |
| GET    | `/api/v1/driver/:driverId`               | Get single driver     | Admin  |
| PATCH  | `/api/v1/driver/update/:driverId`        | Update driver profile | Driver |

### Vehicle Routes

| Method | Endpoint                            | Description                      | Access       |
| ------ | ----------------------------------- | -------------------------------- | ------------ |
| POST   | `/api/v1/vehicle/register`          | Register a vehicle (with images) | Driver       |
| PATCH  | `/api/v1/vehicle/update/:vehicleId` | Update vehicle details           | Driver       |
| GET    | `/api/v1/vehicle/vehicles`          | Get all vehicles                 | Admin        |
| GET    | `/api/v1/vehicle/:vehiclesId`       | Get single vehicles              | Driver/Admin |

### Ride Routes

| Method | Endpoint                     | Description               | Access       |
| ------ | ---------------------------- | ------------------------- | ------------ |
| POST   | `/api/v1/ride/book`          | Rider requests a ride     | Rider        |
| POST   | `/api/v1/ride/update-status` | Update ride status        | Rider/Driver |
| POST   | `/api/v1/ride/verify-otp`    | Rider verify otp for ride | Rider        |
| GET    | `/api/v1/ride/rides`         | Get all rides             | Driver/Rider |
| GET    | `/api/v1/ride/:rideId`       | Get single ride           | Admin        |

### Ride status flow

```bash
REQUESTED → ACCEPTED → OTP Verified → PICKED_UP → IN_TRANSIT → COMPLETED
Cancel: Rider (REQUESTED), Driver (before pickup)
```

### Testing

- Use Postman for API testing
- Content-Type:
  - application/json for normal requests
  - multipart/form-data for image upload (vehicles)

📬 Postman Collection
You can test all API endpoints using the Postman collection below:

👉 View Postman Collection

Steps:

Open the link in your browser.

Click Fork Collection to your workspace or Download as JSON.

Add environment variables (e.g., {{base_url}}, {{accessToken}}).
