import { CalendarCheck, HelpCircle, LogOut, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/application/auth/auth.store';
import { useMyPenaltyHistory } from '@/application/penalties/use-my-penalty-history';
import { httpAuthRepository } from '@/infrastructure/auth/auth.repository.http';
import { Role } from '@/domain/enums';
import { formatCurrency } from '@/lib/utils';
import { Heading, Text } from '@/presentation/components/typography';
import { SettingsRow } from '@/presentation/components/settings-row';
import { UserAvatar } from '@/presentation/components/user-avatar';
import { PoweredByLogos } from '@/presentation/components/powered-by-logos';

export function AccountPage() {
    const student = useAuthStore((state) => state.student);
    const clear = useAuthStore((state) => state.clear);
    const navigate = useNavigate();

    // Only students carry a penalty balance (see BuildDashboardSummary::
    // buildStudentSummary) — enabled here so admins/officers never fire this
    // request, since the "Attendance & Penalties" row's trailing balance
    // (which they don't have) never waits on a fetch that would 404/empty
    // anyway.
    const isStudent = student?.role === Role.Student;
    const { data: penaltyHistory } = useMyPenaltyHistory({ enabled: isStudent });

    if (!student) return null;

    async function handleLogout() {
        try {
            await httpAuthRepository.logout();
        } finally {
            clear();
            navigate('/login', { replace: true });
        }
    }

    return (
        <div className="mx-auto max-w-md space-y-8">
            <div>
                <Heading level="h1">Account</Heading>
            </div>

            <div className="flex flex-col items-center gap-3 text-center">
                <UserAvatar student={student} className="size-20" fallbackClassName="text-h2" />
                <div>
                    <Text variant="small">{student.studentNumber}</Text>
                    <Heading level="h3" as="p">
                        {student.firstName} {student.lastName}
                    </Heading>
                </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
                <SettingsRow to="/account/personal-information" icon={<UserRound className="size-5" />}>
                    Personal information
                </SettingsRow>
                <Separator />
                <SettingsRow
                    to="/account/attendance-history"
                    icon={<CalendarCheck className="size-5" />}
                    trailing={isStudent ? formatCurrency(penaltyHistory?.total ?? 0) : undefined}
                >
                    Attendance & Penalties
                </SettingsRow>
                <Separator />
                <SettingsRow to="/account/faq" icon={<HelpCircle className="size-5" />}>
                    FAQ
                </SettingsRow>
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
                <SettingsRow onClick={handleLogout} icon={<LogOut className="size-5" />} destructive>
                    Log out
                </SettingsRow>
            </div>

            <PoweredByLogos />
        </div>
    );
}
