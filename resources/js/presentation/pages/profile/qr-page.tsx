// import { AnimatePresence, motion } from 'framer-motion';
// import { QrCode, RefreshCw } from 'lucide-react';

// import { Button } from '@/components/ui/button';
// import { useAuthStore } from '@/application/auth/auth.store';
// import { useStudentQr } from '@/application/students/use-student-qr';
// import { Text } from '@/presentation/components/typography';
// import Lanyard from '@/presentation/components/lanyard/Lanyard';

// const REVEAL_TRANSITION = { type: 'spring', stiffness: 260, damping: 26, mass: 0.9 } as const;

// export function QrPage() {
//     const student = useAuthStore((state) => state.student);

//     if (!student) return null;

//     const { qrUrl, isLoading, isError, refetch } = useStudentQr(student.id);

//     const showLanyard = Boolean(qrUrl) && !isLoading && !isError;
//     const showError = isError && !isLoading;

//     return (
//         <motion.div
//             initial={{ opacity: 0, y: 28, scale: 0.92 }}
//             animate={{ opacity: 1, y: 0, scale: 1 }}
//             transition={REVEAL_TRANSITION}
//             style={{ transformOrigin: 'bottom center' }}
//             className="relative h-screen w-full"
//         >
//             {/* The 3D lanyard-and-card model, straight from reactbits' own
//                 frontImage flow: the QR PNG is composited onto the card.glb
//                 texture atlas's front-face UV region (see Lanyard.tsx), so
//                 the physical card shows the student's actual QR code, name,
//                 and student number instead of the default card art. It only
//                 mounts once the QR code is ready — the card would otherwise
//                 pop in with a blank face. */}
//             {showLanyard && qrUrl && (
//                                 <Lanyard
//                     position={[0, 0.0, 9.9]}
//                     fov={20}
//                     gravity={[0, -40, 0]}
//                     frontImage={qrUrl}
//                     imageFit="contain"
//                                         lanyardWidth={1.15}
//                     studentName={`${student.firstName} ${student.lastName}`}
//                     studentNumber={student.studentNumber}
//                 />
//             )}

//             {/* Loading / error states overlay the same area the lanyard
//                 occupies, so the page never shows an empty canvas. */}
//             <AnimatePresence>
//                 {!showLanyard && (
//                     <motion.div
//                         key={showError ? 'error' : 'loading'}
//                         initial={{ opacity: 0 }}
//                         animate={{ opacity: 1 }}
//                         exit={{ opacity: 0 }}
//                         className="absolute inset-0 flex flex-col items-center justify-center gap-3"
//                     >
//                         {showError ? (
//                             <>
//                                 <Text variant="small" className="text-white/70">
//                                     Couldn't load your QR code.
//                                 </Text>
//                                 <Button
//                                     size="sm"
//                                     variant="outline"
//                                     className="border-white/20 bg-white/5 text-white hover:bg-white/10"
//                                     onClick={() => refetch()}
//                                 >
//                                     <RefreshCw className="size-4" />
//                                     Retry
//                                 </Button>
//                             </>
//                         ) : (
//                             <motion.div
//                                 className="text-violet-300"
//                                 animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
//                                 transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
//                             >
//                                 <QrCode className="size-16" strokeWidth={1.5} />
//                             </motion.div>
//                         )}
//                     </motion.div>
//                 )}
//             </AnimatePresence>

//             <Text variant="small" className="absolute inset-x-0 bottom-6 text-center text-white/50">
//                 Drag the card, or present this QR to the attendance scanner.
//             </Text>
//         </motion.div>
//     );
// }


import { AnimatePresence, motion } from 'framer-motion';
import { QrCode, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/application/auth/auth.store';
import { useStudentQr } from '@/application/students/use-student-qr';
import { Text } from '@/presentation/components/typography';
import Lanyard from '@/presentation/components/lanyard/Lanyard';

const REVEAL_TRANSITION = { type: 'spring', stiffness: 260, damping: 26, mass: 0.9 } as const;

export function QrPage() {
    const student = useAuthStore((state) => state.student);

    if (!student) return null;

    const { qrUrl, isLoading, isError, refetch } = useStudentQr(student.id);

    const showLanyard = Boolean(qrUrl) && !isLoading && !isError;
    const showError = isError && !isLoading;

    return (
        <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={REVEAL_TRANSITION}
            style={{ transformOrigin: 'bottom center' }}
            // fixed + dvh/dvw (not h-screen/w-full): this needs to fill the
            // *actual* visible viewport on every device, including mobile
            // browsers where 100vh overshoots past the address bar and
            // used to leave the page vertically scrollable. Going `fixed`
            // also lifts it out of AppLayout's padded <main> (which adds
            // its own top/bottom padding for the safe area and the
            // floating bottom nav) — that padding was the other source of
            // extra scrollable height. AppBottomNav is z-50 so it still
            // floats above this regardless.
            className="fixed inset-0 z-0 h-dvh w-dvw overflow-hidden"
        >
            {/* The 3D lanyard-and-card model, straight from reactbits' own
                frontImage flow: the QR PNG is composited onto the card.glb
                texture atlas's front-face UV region (see Lanyard.tsx), so
                the physical card shows the student's actual QR code, name,
                and student number instead of the default card art. It only
                mounts once the QR code is ready — the card would otherwise
                pop in with a blank face. */}
            {showLanyard && qrUrl && (
                                <Lanyard
                    position={[0, 0.0, 9.9]}
                    fov={20}
                    gravity={[0, -40, 0]}
                    frontImage={qrUrl}
                    imageFit="contain"
                                        lanyardWidth={1.15}
                    studentName={`${student.firstName} ${student.lastName}`}
                    studentNumber={student.studentNumber}
                />
            )}

            {/* Loading / error states overlay the same area the lanyard
                occupies, so the page never shows an empty canvas. */}
            <AnimatePresence>
                {!showLanyard && (
                    <motion.div
                        key={showError ? 'error' : 'loading'}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                    >
                        {showError ? (
                            <>
                                <Text variant="small" className="text-white/70">
                                    Couldn't load your QR code.
                                </Text>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                                    onClick={() => refetch()}
                                >
                                    <RefreshCw className="size-4" />
                                    Retry
                                </Button>
                            </>
                        ) : (
                            <motion.div
                                className="text-violet-300"
                                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                            >
                                <QrCode className="size-16" strokeWidth={1.5} />
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <Text variant="small" className="absolute inset-x-0 bottom-6 text-center text-white/50">
                Drag the card, or present this QR to the attendance scanner.
            </Text>
        </motion.div>
    );
}
