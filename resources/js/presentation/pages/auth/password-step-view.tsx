import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Text } from '@/presentation/components/typography';
import { UserAvatar } from '@/presentation/components/user-avatar';
import type { RememberedAccount } from '@/application/auth/remembered-accounts.store';

interface PasswordStepViewProps {
    account: RememberedAccount;
    password: string;
    onPasswordChange: (password: string) => void;
    onSubmit: (event: FormEvent) => void;
    onBack: () => void;
    isSubmitting: boolean;
    isRateLimited: boolean;
    rateLimitedLabel: string;
}

export function PasswordStepView({
    account,
    password,
    onPasswordChange,
    onSubmit,
    onBack,
    isSubmitting,
    isRateLimited,
    rateLimitedLabel,
}: PasswordStepViewProps) {
    return (
        <>
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-border p-3">
                <UserAvatar student={account} className="size-11" />
                <div className="min-w-0 flex-1">
                    <Text className="truncate font-medium leading-tight">
                        {account.firstName} {account.lastName}
                    </Text>
                    <Text variant="caption" className="truncate">
                        {account.studentNumber}
                    </Text>
                </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <PasswordInput
                        id="password"
                        autoComplete="current-password"
                        autoFocus
                        value={password}
                        onChange={(event) => onPasswordChange(event.target.value)}
                        required
                    />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting || isRateLimited}>
                    {isRateLimited ? rateLimitedLabel : isSubmitting ? 'Signing in…' : 'Sign in'}
                </Button>
                <button
                    type="button"
                    onClick={onBack}
                    className="block w-full text-center text-small text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                    Not {account.firstName}? Choose another account
                </button>
            </form>
        </>
    );
}
