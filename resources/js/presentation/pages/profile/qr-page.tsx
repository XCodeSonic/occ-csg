import { AnimatePresence, motion } from 'framer-motion';
import { QrCode, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/application/auth/auth.store';
import { useStudentQr } from '@/application/students/use-student-qr';
import { Text } from '@/presentation/components/typography';
import { PremiumIdCard } from '@/presentation/components/lanyard/PremiumIdCard';

const REVEAL_TRANSITION = { type: 'spring', stiffness: 260, damping: 26, mass: 0.9 } as const;

export function QrPage() {
    const student = useAuthStore((state) => state.student);

    if (!student) return null;

    const { qrUrl, isLoading, isError, refetch } = useStudentQr(student.id);

    const showCard = Boolean(qrUrl) && !isLoading && !isError;
    const showError = isError && !isLoading;
    const course = student.departmentCode ?? student.departmentName ?? null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={REVEAL_TRANSITION}
            // Was `h-dvh w-dvw overflow-hidden`, which sized this against
            // the *whole* viewport regardless of where the page sits inside
            // AppLayout's centered, padded <main>. On desktop that made the
            // card blow past the layout's max-w-5xl container and forced a
            // horizontal scrollbar, so the card rendered off-center instead
            // of centered in the content column. `w-full` + a min-height
            // (instead of a hard 100dvh) keeps it fluid inside whatever
            // container it's placed in, on any screen size.
            className="flex min-h-[70svh] w-full flex-col items-center justify-center px-2 py-6"
        >
            {showCard && qrUrl && (
                <PremiumIdCard
                    firstName={student.firstName}
                    lastName={student.lastName}
                    studentNumber={student.studentNumber}
                    section={student.section}
                    qrUrl={qrUrl}
                    photoUrl={student.photoUrl}
                    course={course}
                />
            )}

            <AnimatePresence>
                {!showCard && (
                    <motion.div
                        key={showError ? 'error' : 'loading'}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center gap-3"
                    >
                        {showError ? (
                            <>
                                <Text variant="small" className="text-muted-foreground">
                                    Couldn't load your QR code.
                                </Text>
                                <Button size="sm" variant="outline" onClick={() => refetch()}>
                                    <RefreshCw className="size-4" />
                                    Retry
                                </Button>
                            </>
                        ) : (
                            <motion.div
                                className="text-neutral-400"
                                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                            >
                                <QrCode className="size-16" strokeWidth={1.5} />
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
