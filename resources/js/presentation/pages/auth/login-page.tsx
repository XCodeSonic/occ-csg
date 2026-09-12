import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/presentation/components/typography';
import { AuthLayout } from '@/presentation/layouts/auth-layout';
import { useLogin } from '@/application/auth/use-login';

export function LoginPage() {
    const navigate = useNavigate();
    const login = useLogin();
    const [studentNumber, setStudentNumber] = useState('');
    const [password, setPassword] = useState('');

    function handleSubmit(event: FormEvent) {
        event.preventDefault();
        login.mutate(
            { username: studentNumber, password },
            {
                onSuccess: (result) => {
                    navigate(result.student.mustChangePassword ? '/change-password' : '/dashboard');
                },
                onError: () => {
                    toast.error('Incorrect student number or password.');
                },
            },
        );
    }

    return (
        <AuthLayout title="Sign in" description="Use your student number and password.">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="studentNumber">Student number</Label>
                    <Input
                        id="studentNumber"
                        autoComplete="username"
                        value={studentNumber}
                        onChange={(event) => setStudentNumber(event.target.value)}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                    />
                </div>
                <Button type="submit" className="w-full" disabled={login.isPending}>
                    {login.isPending ? 'Signing in…' : 'Sign in'}
                </Button>
                <Text variant="caption" className="text-center">
                    First time signing in? Your default password was given to you by your department.
                </Text>
            </form>
        </AuthLayout>
    );
}
