import { useState, type PropsWithChildren } from 'react';

import csgLogo from '@/assets/csg-logo.png';
import psitsLogo from '@/assets/psits-logo.png';
import { Heading, Text } from '@/presentation/components/typography';
import { LegalDialog } from '@/presentation/components/legal/legal-dialog';
import { ShimmerLogo } from '@/presentation/components/shimmer-logo';

interface AuthLayoutProps extends PropsWithChildren {
    title: string;
    description?: string;
}

export function AuthLayout({ title, description, children }: AuthLayoutProps) {
    const [legalOpen, setLegalOpen] = useState<'terms' | 'privacy' | null>(null);

    return (
        <div className="flex min-h-svh flex-col items-center justify-center bg-background px-6 py-10">
            <div className="w-full max-w-sm">
                <div className="mb-8 flex flex-col items-center text-center">
                    <img src={csgLogo} alt="OCC CSG" className="mb-3 h-16 w-16 object-contain" />
                    <Heading level="display" as="p" className="text-h3">
                        Central Government Council
                    </Heading>
                    {/* <Text variant="small" className="mt-1">

                    </Text> */}
                </div>
                <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
                    <div className="mb-6 space-y-1">
                        <Heading level="h2">{title}</Heading>
                        {description ? <Text variant="small">{description}</Text> : null}
                    </div>
                    {children}
                </div>

                <div className="mt-8 flex flex-col items-center gap-3 text-center">
                    <div className="flex items-center gap-2">

                        <Text variant="caption">Developed by</Text>
                        <ShimmerLogo src={psitsLogo} alt="PSITS" className="size-8 p-1" />
                    </div>
                    <div className="flex items-center gap-1.5 text-caption text-muted-foreground">
                        <button
                            type="button"
                            onClick={() => setLegalOpen('terms')}
                            className="underline-offset-4 hover:text-foreground hover:underline"
                        >
                            Terms &amp; Conditions
                        </button>
                        <span aria-hidden>·</span>
                        <button
                            type="button"
                            onClick={() => setLegalOpen('privacy')}
                            className="underline-offset-4 hover:text-foreground hover:underline"
                        >
                            Privacy Policy
                        </button>
                    </div>
                </div>
            </div>

            <LegalDialog open={legalOpen} onOpenChange={(open) => !open && setLegalOpen(null)} />
        </div>
    );
}
