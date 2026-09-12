import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Student } from '@/domain/entities';
import { cn } from '@/lib/utils';

function initials(student: Pick<Student, 'firstName' | 'lastName'>) {
    return `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase();
}

interface UserAvatarProps {
    student: Pick<Student, 'firstName' | 'lastName' | 'photoUrl'>;
    className?: string;
    fallbackClassName?: string;
}

export function UserAvatar({ student, className, fallbackClassName }: UserAvatarProps) {
    return (
        <Avatar className={cn(className)}>
            {student.photoUrl ? <AvatarImage src={student.photoUrl} alt={`${student.firstName} ${student.lastName}`} /> : null}
            <AvatarFallback className={cn(fallbackClassName)}>{initials(student)}</AvatarFallback>
        </Avatar>
    );
}
