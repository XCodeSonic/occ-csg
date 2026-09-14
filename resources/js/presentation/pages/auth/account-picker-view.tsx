import { useState } from 'react';
import { ChevronRight, Settings, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/presentation/components/typography';
import { UserAvatar } from '@/presentation/components/user-avatar';
import type { RememberedAccount } from '@/application/auth/remembered-accounts.store';
import { ROLE_LABEL } from '@/domain/enums';

interface AccountPickerRowProps {
    account: RememberedAccount;
    managing: boolean;
    onSelect: (account: RememberedAccount) => void;
    onForget: (studentNumber: string) => void;
}

function AccountPickerRow({ account, managing, onSelect, onForget }: AccountPickerRowProps) {
    if (managing) {
        return (
            <div className="flex w-full items-center gap-3 px-4 py-3">
                <UserAvatar student={account} className="size-10" />
                <div className="min-w-0 flex-1">
                    <Text className="truncate font-medium leading-tight">
                        {account.firstName} {account.lastName}
                    </Text>
                    <Text variant="caption" className="truncate">
                        {ROLE_LABEL[account.role]}
                    </Text>
                </div>
                <button
                    type="button"
                    onClick={() => onForget(account.studentNumber)}
                    aria-label={`Remove ${account.firstName} ${account.lastName} from saved accounts`}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                    <X className="size-4" />
                </button>
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={() => onSelect(account)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
        >
            <UserAvatar student={account} className="size-10" />
            <div className="min-w-0 flex-1">
                <Text className="truncate font-medium leading-tight">
                    {account.firstName} {account.lastName}
                </Text>
                <Text variant="caption" className="truncate">
                    {ROLE_LABEL[account.role]}
                </Text>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </button>
    );
}

interface AccountPickerViewProps {
    accounts: RememberedAccount[];
    onSelect: (account: RememberedAccount) => void;
    onForget: (studentNumber: string) => void;
    onUseDifferentAccount: () => void;
}

export function AccountPickerView({ accounts, onSelect, onForget, onUseDifferentAccount }: AccountPickerViewProps) {
    const managing = useManagingAccounts();

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Text variant="small">
                    {managing.isManaging
                        ? 'Tap an account to remove it.'
                        : `${accounts.length} saved ${accounts.length === 1 ? 'account' : 'accounts'}`}
                </Text>
                <button
                    type="button"
                    onClick={managing.toggle}
                    aria-label={managing.isManaging ? 'Done managing accounts' : 'Manage saved accounts'}
                    aria-pressed={managing.isManaging}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                    {managing.isManaging ? (
                        <Text variant="small" className="font-medium text-foreground">
                            Done
                        </Text>
                    ) : (
                        <Settings className="size-4" />
                    )}
                </button>
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
                {accounts.map((account: RememberedAccount, index: number) => (
                    <div key={account.studentNumber}>
                        {index > 0 && <Separator />}
                        <AccountPickerRow account={account} managing={managing.isManaging} onSelect={onSelect} onForget={onForget} />
                    </div>
                ))}
            </div>

            <Button type="button" variant="outline" className="w-full" onClick={onUseDifferentAccount}>
                Use a different account
            </Button>

            <Text variant="caption" className="text-center">
                Restricted to authorized personnel only.
            </Text>
        </div>
    );
}

// Kept local to this view — whether the picker is in "manage" mode isn't
// meaningful to anything outside it, so it doesn't belong in LoginPage's
// state (that was part of what pushed LoginPage's own complexity too high).
function useManagingAccounts() {
    const [isManaging, setIsManaging] = useState(false);
    return { isManaging, toggle: () => setIsManaging((prev) => !prev) };
}
