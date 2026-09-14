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

    return (
        <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={REVEAL_TRANSITION}
            className="flex h-dvh w-dvw flex-col items-center justify-center overflow-hidden px-6"
        >
            {showCard && qrUrl && (
                <PremiumIdCard
                    firstName={student.firstName}
                    lastName={student.lastName}
                    studentNumber={student.studentNumber}
                    section={student.section}
                    qrUrl={qrUrl}
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
