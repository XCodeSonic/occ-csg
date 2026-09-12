import type { PropsWithChildren } from 'react';

import { Heading, Text } from '@/presentation/components/typography';

interface AuthLayoutProps extends PropsWithChildren {
    title: string;
    description?: string;
}

export function AuthLayout({ title, description, children }: AuthLayoutProps) {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center bg-background px-6">
            <div className="w-full max-w-sm">
                <div className="mb-8 text-center">
                    <Heading level="display" as="p" className="text-h1">
                        OCC CSG
                    </Heading>
                </div>
                <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
                    <div className="mb-6 space-y-1">
                        <Heading level="h2">{title}</Heading>
                        {description ? <Text variant="small">{description}</Text> : null}
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
