import { createBrowserRouter, Navigate } from 'react-router-dom';

import { AppLayout } from '@/presentation/layouts/app-layout';
import { AcademicYearsPage } from '@/presentation/pages/academic-years/academic-years-page';
import { AccountPage } from '@/presentation/pages/account/account-page';
import { AttendanceHistoryPage } from '@/presentation/pages/account/attendance-history-page';
import { FaqPage } from '@/presentation/pages/account/faq-page';
import { PersonalInformationPage } from '@/presentation/pages/account/personal-information-page';
import { ChangePasswordPage } from '@/presentation/pages/auth/change-password-page';
import { LoginPage } from '@/presentation/pages/auth/login-page';
import { DashboardPage } from '@/presentation/pages/dashboard/dashboard-page';
import { EventDetailPage } from '@/presentation/pages/events/event-detail-page';
import { EventsPage } from '@/presentation/pages/events/events-page';
import { ErrorPage } from '@/presentation/pages/errors/error-page';
import { NotFoundPage } from '@/presentation/pages/errors/not-found-page';
import { QrPage } from '@/presentation/pages/profile/qr-page';
import { ScanPage } from '@/presentation/pages/scan/scan-page';
import { SettingsPage } from '@/presentation/pages/settings/settings-page';
import { StudentsPage } from '@/presentation/pages/students/students-page';
import { GuestRoute } from '@/presentation/routes/guest-route';
import { ProtectedRoute } from '@/presentation/routes/protected-route';

export const router = createBrowserRouter([
    {
        errorElement: <ErrorPage />,
        children: [
            { path: '/', element: <Navigate to="/dashboard" replace /> },
            {
                element: <GuestRoute />,
                children: [{ path: '/login', element: <LoginPage /> }],
            },
            {
                element: <ProtectedRoute />,
                children: [
                    { path: '/change-password', element: <ChangePasswordPage /> },
                    {
                        element: <AppLayout />,
                        children: [
                            { path: '/dashboard', element: <DashboardPage /> },
                            { path: '/academic-years', element: <AcademicYearsPage /> },
                            { path: '/events', element: <EventsPage /> },
                            { path: '/events/:eventId', element: <EventDetailPage /> },
                            { path: '/students', element: <StudentsPage /> },
                            { path: '/account', element: <AccountPage /> },
                            { path: '/account/personal-information', element: <PersonalInformationPage /> },
                            { path: '/account/attendance-history', element: <AttendanceHistoryPage /> },
                            { path: '/account/faq', element: <FaqPage /> },
                            { path: '/profile', element: <QrPage /> },
                            { path: '/scan', element: <ScanPage /> },
                            { path: '/settings', element: <SettingsPage /> },
                        ],
                    },
                ],
            },
            // Catch-all: any path that didn't match above (e.g. /sa) — must
            // stay last, and outside the guards above so it renders
            // regardless of auth state.
            { path: '*', element: <NotFoundPage /> },
        ],
    },
]);
