import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Heading, Text } from '@/presentation/components/typography';

export function ErrorPage() {
    const error = useRouteError();

    const message = isRouteErrorResponse(error)
        ? error.statusText || 'Something went wrong.'
        : error instanceof Error
          ? error.message
          : 'Something went wrong.';

    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
            <Text variant="caption" className="tracking-wide">
                Error
            </Text>
            <Heading level="h1">Something went wrong</Heading>
            <Text variant="small" className="max-w-sm">
                {message}
            </Text>
            <Button asChild className="mt-2">
                <Link to="/dashboard">Back to dashboard</Link>
            </Button>
        </div>
    );
}
