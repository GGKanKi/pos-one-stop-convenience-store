# One Convenience Store

A modern React + TypeScript POS and inventory management system built for One Convenience Store operations across multiple branches. The application supports staff transactions, inventory monitoring, admin reporting, and store performance tracking.

## Overview

This project provides a centralized web dashboard for convenience store operations, including:

- Point-of-sale (POS) transactions for staff
- Inventory checking and stock updates
- Admin dashboard with sales and profit insights
- Staff and branch management
- Product status monitoring and approvals
- Daily reports, payouts, and delivery tracking
- Authentication, password recovery, and role-based access

## Tech Stack

- React 19
- TypeScript
- Vite
- React Router
- Supabase client
- XLSX for spreadsheet handling
- Lucide React icons

## Project Structure

```text
One-Convenience/
├── public/                  # Static assets and images
├── src/
│   ├── components/         # Shared UI components
│   ├── pages/              # Public, staff, and admin pages
│   ├── services/           # API and auth utilities
│   ├── App.tsx             # App routing
│   ├── main.tsx            # App bootstrap
│   └── index.css           # Global styles
├── package.json            # Scripts and dependencies
├── tsconfig.json           # TypeScript config
├── vite.config.ts          # Vite config
├── .gitignore
└── README.md
```

## Features

### Staff Features
- Cash register and checkout flow
- Product recall and stock review
- Inventory check process
- Discount handling and transaction operations
- Logout and session handling

### Admin Features
- Staff management
- Inventory tracking and approval workflow
- Discrepancy management
- Transaction history
- Sales and profit summaries
- Product status and reporting
- Daily reports and payout management
- Delivery monitoring

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A running backend API for the application endpoints

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the project root if your backend is not using the default local API URL:

```env
VITE_API_BASE_URL=http://localhost/One-Convenience/backend/api
```

### Run the App

```bash
npm run dev
```

Then open the local Vite URL shown in the terminal, usually:

```text
http://localhost:5173
```

## Production Build

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```

## Notes

This project is a frontend application and expects a backend service to handle authentication, inventory storage, POS transactions, and reporting data. Update the `VITE_API_BASE_URL` environment variable to match your local or production API endpoint.

## License

This project is currently unlicensed unless otherwise specified by the repository owner.
