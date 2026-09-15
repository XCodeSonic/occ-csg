import '../css/app.css';
// Self-hosted, bundled by Vite (no request to fonts.googleapis.com /
// fonts.gstatic.com at runtime — see app.blade.php and
// AddSecurityHeaders.php, which previously allow-listed those origins
// specifically for this). Variable weight file covers the same
// 400–700, normal+italic range the Google Fonts <link> requested.
import '@fontsource-variable/instrument-sans';
import '@fontsource-variable/instrument-sans/wght-italic.css';

import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';

import { Toaster } from '@/components/ui/sonner';
import { router } from '@/presentation/routes/router';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

const container = document.getElementById('app');

if (container) {
    createRoot(container).render(
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
            <Toaster />
        </QueryClientProvider>,
    );
}
