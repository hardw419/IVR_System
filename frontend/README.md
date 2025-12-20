# Frontend - AI Voice IVR System

Next.js frontend for the AI Voice IVR System.

## Features

- Modern React with Next.js 14
- TypeScript for type safety
- Tailwind CSS for styling
- Zustand for state management
- React Hook Form for form handling
- Hot Toast for notifications
- Responsive design
- Protected routes with authentication

## Installation

```bash
npm install
```

## Environment Variables

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Running

Development mode:
```bash
npm run dev
```

Build for production:
```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── dashboard/          # Dashboard pages
│   │   │   ├── page.tsx        # Dashboard home
│   │   │   ├── scripts/        # Scripts management
│   │   │   ├── voices/         # Voices management
│   │   │   ├── calls/          # Calls management
│   │   │   ├── agents/         # Agents management
│   │   │   └── analytics/      # Analytics page
│   │   ├── login/              # Login page
│   │   ├── register/           # Register page
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page
│   │   └── globals.css         # Global styles
│   ├── components/             # React components
│   │   └── DashboardLayout.tsx # Dashboard layout
│   ├── lib/                    # Utilities
│   │   └── api.ts              # API client
│   └── store/                  # State management
│       └── authStore.ts        # Auth store
├── public/                     # Static files
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## Pages

### Public Pages
- `/` - Home (redirects to login or dashboard)
- `/login` - User login
- `/register` - User registration

### Protected Pages (require authentication)
- `/dashboard` - Dashboard home with statistics
- `/dashboard/scripts` - Manage call scripts
- `/dashboard/voices` - Manage voice configurations
- `/dashboard/calls` - Make single/bulk calls and view history
- `/dashboard/agents` - Manage agents for call transfers
- `/dashboard/analytics` - View call analytics

## Components

### DashboardLayout
Main layout component for dashboard pages with:
- Sidebar navigation
- User info display
- Logout functionality

## State Management

Using Zustand for global state:

### Auth Store (`authStore.ts`)
- User authentication state
- Login/logout functions
- Token management
- User profile

## API Integration

All API calls are centralized in `src/lib/api.ts`:

- Axios instance with interceptors
- Automatic token injection
- Error handling
- API endpoints for all resources

## Styling

- **Tailwind CSS** for utility-first styling
- **Custom color scheme** with primary colors
- **Responsive design** for mobile and desktop
- **Dark mode ready** (can be enabled)

## Forms

Using React Hook Form for:
- Form validation
- Error handling
- Controlled inputs
- Submit handling

## Notifications

Using React Hot Toast for:
- Success messages
- Error messages
- Loading states
- Custom notifications

## TypeScript

Full TypeScript support with:
- Type-safe API calls
- Interface definitions
- Type inference
- Strict mode enabled

## Development

### Adding a New Page

1. Create page in `src/app/dashboard/[page-name]/page.tsx`
2. Wrap with `DashboardLayout`
3. Add navigation link in `DashboardLayout.tsx`
4. Create API functions in `src/lib/api.ts` if needed

### Adding a New API Endpoint

1. Add function to appropriate API object in `src/lib/api.ts`
2. Use TypeScript interfaces for request/response types
3. Handle errors appropriately

## Building for Production

```bash
npm run build
```

This creates an optimized production build in `.next/` directory.

## Deployment

Recommended platforms:
- **Vercel** (easiest for Next.js)
- **Netlify**
- **AWS Amplify**

Update `NEXT_PUBLIC_API_URL` to your production backend URL.

