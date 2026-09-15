import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw, WifiOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/application/auth/auth.store';
import { useStudentQr } from '@/application/students/use-student-qr';
import { Text } from '@/presentation/components/typography';
import { Tile } from '@/presentation/components/tile';
import { TONE } from '@/presentation/components/tone';
import { PremiumIdCard } from '@/presentation/components/lanyard/PremiumIdCard';
import { cn } from '@/lib/utils';

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
            // `w-full` + a min-height (instead of a hard 100dvh) keeps this
            // fluid inside whatever container it's placed in, on any screen
            // size — sizing against the whole viewport made the card blow
            // past AppLayout's max-w-5xl on desktop and render off-centre.
            className="relative flex min-h-[70svh] w-full flex-col items-center justify-center px-2 py-6"
        >
            {/*
              The card's violet drop shadow does the close-range lighting;
              this pool does the room. Together they're why a white card on
              a white page still reads as an object sitting above the
              surface. Hidden while erroring — nothing to light.
            */}
            {!showError && (
                <span
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-1/2 size-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500 opacity-[0.08] blur-3xl dark:opacity-[0.14]"
                />
            )}

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
                        className="relative flex w-full flex-col items-center justify-center"
                    >
                        {showError ? (
                            <div
                                className={cn(
                                    'flex w-[min(92vw,24rem)] flex-col items-center gap-4 rounded-3xl border p-8 text-center',
                                    TONE.red.wash,
                                )}
                            >
                                <Tile tone="red" size="lg" variant="solid" Icon={WifiOff} />
                                <div>
                                    <Text className="font-medium">Your QR code didn't load</Text>
                                    <Text variant="small">You'll need a connection to fetch it. Your code itself hasn't changed.</Text>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => refetch()}>
                                    <RefreshCw className="size-4" />
                                    Try again
                                </Button>
                            </div>
                        ) : (
                            /*
                              A skeleton in the card's own shape rather than a
                              pulsing icon. The card is the entire screen here,
                              so a small throbbing glyph in the middle of an
                              empty page reads as "broken" for the second or
                              two before it lands; an outline of the thing
                              that's coming reads as "loading".
                            */
                            <div className="flex w-[min(92vw,24rem)] animate-pulse flex-col items-center gap-6 rounded-[clamp(1.5rem,5vw,2rem)] border border-border bg-card px-6 py-8">
                                <div className="size-16 rounded-full bg-muted" />
                                <div className="h-4 w-40 rounded-full bg-muted" />
                                <div className="h-3 w-28 rounded-full bg-muted" />
                                <div className="aspect-square w-full rounded-3xl bg-muted" />
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
