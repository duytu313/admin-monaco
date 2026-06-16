# Admin Dashboard (Next.js)

A comprehensive admin dashboard built with **Next.js 16**, **React 19**, **Firebase**, and **Tailwind CSS v4**. This application manages bookings, rooms, facilities, promotions, user roles, and notifications for a karaoke business.

## 🚀 Tech Stack

| Technology         | Purpose                          |
|--------------------|----------------------------------|
| Next.js 16         | React framework (App Router)     |
| React 19           | UI library                       |
| TypeScript         | Type safety                      |
| Tailwind CSS v4    | Utility-first styling            |
| Firebase Auth      | Authentication (email/password)  |
| Firebase Realtime DB| Database & security rules       |
| shadcn/ui          | Component library (Radix-based)  |
| Recharts           | Data visualization               |
| React Hook Form    | Form management                  |
| Zod                | Schema validation                |
| date-fns           | Date utilities                   |
| Lucide React       | Icons                            |

## 🧱 Project Structure

```
├── app/
│   ├── api/                    # API routes (e.g., admin setup)
│   ├── dashboard/              # Protected dashboard pages
│   │   ├── bookings/
│   │   ├── facilities/
│   │   ├── promotions/
│   │   └── page.tsx            # Main dashboard (analytics)
│   ├── login/                  # Authentication pages
│   ├── layout.tsx              # Root layout
│   ├── globals.css             # Global styles
│   └── page.tsx                # Landing/redirect page
├── components/
│   ├── dashboard/              # Dashboard-specific components (sidebar, etc.)
│   ├── ui/                     # shadcn/ui components
│   └── theme-provider.tsx      # Dark/light theme provider
├── hooks/                      # Custom React hooks
│   ├── use-mobile.ts
│   └── use-toast.ts
├── lib/
│   ├── firebase-config.ts      # Firebase client config (reads env vars)
│   └── utils.ts                # Utility functions (cn, etc.)
├── public/                     # Static assets (images, icons)
├── styles/                     # Additional styles
├── database.rules.json         # Firebase Realtime Database security rules
├── .gitignore                  # Ignored files (secrets, logs, builds)
├── next.config.mjs             # Next.js configuration
├── package.json                # Dependencies & scripts
├── tsconfig.json               # TypeScript configuration
└── postcss.config.mjs          # PostCSS configuration
```

## ⚙️ Prerequisites

- **Node.js** >= 18.x
- **npm**, **yarn**, or **pnpm** (recommended)
- A **Firebase project** with:
  - **Authentication** (Email/Password provider enabled)
  - **Realtime Database** (created and rules configured)

## 🔧 Getting Started

### 1. Clone & Install Dependencies

```bash
cd admin-dashboard-with-next-js
pnpm install
# or: npm install
# or: yarn install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXX
```

> ⚠️ **Security:** Never commit `.env` or `.env.local` to version control. The `.gitignore` already excludes these files.

### 3. Apply Firebase Realtime Database Rules

- Copy the rules from `database.rules.json` into your Firebase Realtime Database console under the "Rules" tab.
- **Important:** The `.read` and `.write` at the root level are set to `false` to block unauthenticated access. All other rules require authentication.

### 4. Create an Admin User

The app includes a setup endpoint. After signing up a user via Firebase Authentication, call:

```
GET /api/setup-admin?uid=<FIREBASE_UID>&email=<EMAIL>
```

This will grant the user the `admin` role in the Realtime Database.

### 5. Run the Development Server

```bash
pnpm dev
# or: npm run dev
# or: yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

> **Note:** The `.env.local` file is already present in the project and is protected by `.gitignore`. You do not need to recreate it unless you are setting up a fresh clone.

## 📦 Build for Production

```bash
pnpm build
pnpm start
```

## 🔒 Security Best Practices

This project follows security best practices:

| Measure                        | Implementation                                    |
|--------------------------------|--------------------------------------------------|
| Environment variables          | All secrets loaded via `process.env` in `.env.local` |
| No hardcoded credentials       | Firebase config reads from env vars only         |
| Firebase security rules        | Granular read/write rules based on auth & roles  |
| Git ignored secrets            | `.env*`, credential JSON files, log files        |
| Minimal API exposure           | Only one setup API route (should be disabled in prod) |

### Recommended Production Hardening

- **Disable the `/api/setup-admin` route** in production or protect it with an admin secret key.
- **Enable Firebase App Check** to prevent unauthorized API calls.
- **Set up rate limiting** on Firebase Authentication to prevent brute force attacks.
- **Use Firebase Cloud Functions** to handle admin user creation server-side instead of exposing an API route.

## 👥 User Roles

| Role          | Permissions                                                      |
|---------------|------------------------------------------------------------------|
| **Admin**     | Full CRUD on rooms, facilities, bookings, promotions, settings   |
| **Receptionist** | View bookings, manage bookings, read promotions & news        |
| **Customer**  | View own bookings only, view public rooms/facilities             |

## 🔑 Key Scripts

```bash
pnpm dev       # Start development server
pnpm build     # Build for production
pnpm start     # Start production server
pnpm lint      # Run ESLint
```

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature`.
3. Make your changes and commit: `git commit -m 'Add new feature'`.
4. Push to the branch: `git push origin feature/your-feature`.
5. Open a Pull Request.

## 📄 License

This project is private and proprietary. All rights reserved.