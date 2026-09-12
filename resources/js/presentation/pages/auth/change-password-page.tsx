import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout } from '@/presentation/layouts/auth-layout';
import { useChangePassword } from '@/application/auth/use-change-password';

export function ChangePasswordPage() {
    const navigate = useNavigate();
    const changePassword = useChangePassword();
    const [currentPassword, setCurrentPassword] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');

    function handleSubmit(event: FormEvent) {
        event.preventDefault();
        changePassword.mutate(
            { current_password: currentPassword, password, password_confirmation: passwordConfirmation },
            {
                onSuccess: () => {
                    toast.success('Password changed.');
                    navigate('/dashboard');
                },
                onError: () => {
                    toast.error('Could not change your password. Check the current password and try again.');
                },
            },
        );
    }

    return (
        <AuthLayout title="Set a new password" description="You must change your password before continuing.">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current password</Label>
                    <Input
                        id="currentPassword"
                        type="password"
                        value={currentPassword}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password">New password</Label>
                    <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="passwordConfirmation">Confirm new password</Label>
                    <Input
                        id="passwordConfirmation"
                        type="password"
                        value={passwordConfirmation}
                        onChange={(event) => setPasswordConfirmation(event.target.value)}
                        required
                    />
                </div>
                <Button type="submit" className="w-full" disabled={changePassword.isPending}>
                    {changePassword.isPending ? 'Saving…' : 'Save password'}
                </Button>
            </form>
        </AuthLayout>
    );
}
