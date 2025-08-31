# KLT Dashboard

A modern, interactive dashboard for visualizing and analyzing Keploy Load Testing metrics and performance data. Built with Next.js, TypeScript, and Tailwind CSS.

## 🚀 Features

### 📊 Performance Monitoring
- **Real-time Metrics**: Live visualization of load testing metrics and performance data
- **Interactive Charts**: Dynamic charts powered by Recharts for analyzing latency trends and VU performance
- **Multi-Dashboard Support**: Manage and switch between multiple test dashboards
- **Historical Data**: Track performance trends over time with persistent data storage

### 🎯 Load Testing Analytics
- **Virtual Users (VU) Tracking**: Monitor individual VU performance and execution statistics
- **Step-by-Step Analysis**: Detailed breakdown of test steps with response times and failure rates
- **Threshold Monitoring**: Configure and track performance thresholds with severity levels
- **Data Table Views**: Sortable, filterable tables for detailed metric analysis

### 🔒 Security Integration
- **Security Report View**: Dedicated component for security analysis results
- **Multi-Severity Tracking**: Handle passed, failed, and warning security checks

### 💾 Data Management
- **Persistent Storage**: Local storage integration for dashboard data persistence
- **Export Capabilities**: Static build support for easy deployment and sharing
- **Offline Support**: Service worker integration for offline functionality

### 🎨 User Experience
- **Responsive Design**: Mobile-friendly interface built with Tailwind CSS
- **Drag & Drop**: Interactive table columns with drag-and-drop reordering
- **Dark/Light Theme**: Modern UI components with theme support
- **Progressive Web App**: PWA support with service worker and manifest

## 🛠️ Tech Stack

- **Framework**: Next.js 15.4.2 (React 19.1.0)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4.0
- **UI Components**: Radix UI primitives
- **Charts**: Recharts 3.1
- **Data Tables**: TanStack React Table 8.21
- **Drag & Drop**: dnd-kit
- **Validation**: Zod
- **Icons**: Lucide React

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/AHMED-D007A/KLT_Dashboard.git
   cd KLT_Dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Build & Deployment

### Development Build
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run start
```

### Static Export
```bash
npm run build:static
```
This creates a static export in the `out/` directory that can be served by any static file server.

### Serve Static Files
```bash
npm run serve:static
```
Serves the static build using Python's built-in HTTP server on port 3000.

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── data-table/       # Data table components
│   ├── dashboard_sidebar.tsx
│   ├── dashboard_list_page.tsx
│   ├── chart_area_interactive.tsx
│   ├── security_report_view.tsx
│   └── ...
├── context/              # React context providers
│   └── dashboard_context.tsx
├── hooks/                # Custom React hooks
│   └── use-data-table-instance.ts
├── lib/                  # Utility libraries
│   ├── utils.ts
│   └── serviceWorker.ts
└── types/                # TypeScript type definitions
    └── dashboard.ts
```

## 🔧 Configuration

### Environment Variables
No environment variables are required for basic functionality. The dashboard uses local storage for data persistence.

### Next.js Configuration
The project is configured for static export with image optimization disabled for compatibility with static hosting.

## 🔗 Related Projects

- [Keploy](https://github.com/keploy/keploy) - The main Keploy project
- [Keploy Load Testing](https://docs.keploy.io) - Official documentation

---

Built with ❤️ for the Keploy community
