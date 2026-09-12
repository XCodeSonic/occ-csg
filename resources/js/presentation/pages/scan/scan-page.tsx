import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';
import { AlertTriangle, CheckCircle2, ScanLine, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useScanAttendance } from '@/application/sessions/use-scan-attendance';
import { useScannableSessions, type ScannableSession } from '@/application/sessions/use-scannable-sessions';
import { AttendanceStatus, CHECK_TYPE_LABEL, ScanOutcome } from '@/domain/enums';
import { ScanError, type ScanResult, type ScannedStudent } from '@/infrastructure/sessions/sessions.repository.http';
import { Heading, Text } from '@/presentation/components/typography';
import { UserAvatar } from '@/presentation/components/user-avatar';
import { cn } from '@/lib/utils';

// The double-scan guard: how long a given decoded QR string is ignored
// after being accepted. Continuous scanning re-decodes the same frame
// several times a second while a badge is still held up to the camera —
// without this, one badge in view would fire the scan endpoint repeatedly.
const TOKEN_COOLDOWN_MS = 3000;

// How long the result panel (photo/name/status) stays on screen before
// the view returns to a plain "ready" camera feed.
const FEEDBACK_DISPLAY_MS = 2500;

const WINDOW_LABEL: Record<string, string> = {
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
};

type Feedback = { kind: 'success'; result: ScanResult } | { kind: 'error'; message: string };

export function ScanPage() {
    const { sessions, isLoading } = useScannableSessions();
    const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);

    useEffect(() => {
        if (sessions.length === 1) {
            setSelectedSessionId(sessions[0].id);
            return;
        }
        if (selectedSessionId && !sessions.some((session) => session.id === selectedSessionId)) {
            // The session being scanned into just ended (or the periodic
            // refresh found it's no longer ongoing) — fall back to the
            // picker instead of silently posting scans into a dead session.
            setSelectedSessionId(null);
        }
    }, [sessions, selectedSessionId]);

    if (isLoading) {
        return (
            <div className="pt-12 text-center">
                <Text variant="small">Checking for an open session…</Text>
            </div>
        );
    }

    if (sessions.length === 0) {
        return (
            <div className="mx-auto max-w-md space-y-4 pt-8">
                <Heading level="h1">Scan</Heading>
                <Card>
                    <CardContent className="space-y-2 pt-6 text-center">
                        <ScanLine className="mx-auto size-8 text-muted-foreground" />
                        <Text className="font-medium">No session is open for scanning</Text>
                        <Text variant="small">
                            Scanning opens automatically once a CSG Admin marks a session as ongoing.
                        </Text>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!selectedSessionId) {
        return (
            <div className="mx-auto max-w-md space-y-4 pt-8">
                <Heading level="h1">Scan</Heading>
                <Text variant="small">Multiple sessions are open right now — choose which one to scan into.</Text>
                <div className="space-y-2">
                    {sessions.map((session) => (
                        <button
                            key={session.id}
                            type="button"
                            onClick={() => setSelectedSessionId(session.id)}
                            className="block w-full rounded-xl border p-4 text-left transition-colors hover:bg-accent"
                        >
                            <Text className="font-medium">{session.eventName}</Text>
                            <Text variant="small">
                                Day {session.dayNumber} — {WINDOW_LABEL[session.windowType] ?? session.windowType} —{' '}
                                {CHECK_TYPE_LABEL[session.checkType as keyof typeof CHECK_TYPE_LABEL] ?? session.checkType}
                            </Text>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    const session = sessions.find((candidate) => candidate.id === selectedSessionId);
    if (!session) return null;

    return (
        // key=session.id: remount on session change so the camera stream
        // and the scan-guard refs below reset cleanly instead of trying to
        // reconcile mid-flight.
        <Scanner
            key={session.id}
            session={session}
            showChangeSession={sessions.length > 1}
            onChangeSession={() => setSelectedSessionId(null)}
        />
    );
}

function Scanner({
    session,
    showChangeSession,
    onChangeSession,
}: {
    session: ScannableSession;
    showChangeSession: boolean;
    onChangeSession: () => void;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const scanAttendance = useScanAttendance(session.id);

    // useMutation's identity is stable, but re-created on every render with
    // fresh closures — this ref lets the zxing decode callback (set up once
    // per session mount) always call the latest mutate function.
    const scanAttendanceRef = useRef(scanAttendance);
    scanAttendanceRef.current = scanAttendance;

    const isProcessingRef = useRef(false);
    const cooldownRef = useRef<Map<string, number>>(new Map());
    const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [recent, setRecent] = useState<ScanResult[]>([]);
    const [cameraError, setCameraError] = useState<string | null>(null);

    const showFeedback = useCallback((next: Feedback) => {
        const tone = next.kind === 'success' ? resultTone(next.result) : 'bad';
        setFeedback(next);
        playFeedbackTone(tone);
        vibrateForTone(tone);

        if (next.kind === 'success') {
            setRecent((prev) => [next.result, ...prev].slice(0, 8));
        }

        if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), FEEDBACK_DISPLAY_MS);
    }, []);

    useEffect(() => {
        return () => {
            if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        let controls: IScannerControls | null = null;
        const codeReader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 200 });

        function handleDecoded(token: string) {
            const now = Date.now();
            const lastSeen = cooldownRef.current.get(token);
            if (lastSeen && now - lastSeen < TOKEN_COOLDOWN_MS) return; // same badge still in frame
            if (isProcessingRef.current) return; // a previous scan is still in flight

            cooldownRef.current.set(token, now);
            isProcessingRef.current = true;

            scanAttendanceRef.current.mutate(token, {
                onSuccess: (result) => {
                    isProcessingRef.current = false;
                    showFeedback({ kind: 'success', result });
                },
                onError: (error) => {
                    isProcessingRef.current = false;
                    showFeedback({
                        kind: 'error',
                        message: error instanceof ScanError ? error.message : 'Scan failed — try again.',
                    });
                },
            });
        }

        async function start() {
            const video = videoRef.current;
            if (!video) return;

            try {
                // deviceId left undefined: zxing auto-prefers the
                // environment-facing (back) camera when one is available.
                const scannerControls = await codeReader.decodeFromVideoDevice(undefined, video, (result) => {
                    if (!result || cancelled) return;
                    handleDecoded(result.getText());
                });

                if (cancelled) {
                    scannerControls.stop();
                    return;
                }
                controls = scannerControls;
            } catch (error) {
                if (!cancelled) {
                    setCameraError(
                        error instanceof Error
                            ? error.message
                            : 'Could not access the camera. Check camera permissions and try again.',
                    );
                }
            }
        }

        start();

        return () => {
            cancelled = true;
            controls?.stop();
        };
        // showFeedback is stable (empty dep array itself); session identity
        // is what should restart the camera, and that's handled by the
        // key={session.id} remount in ScanPage rather than a dependency here.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showFeedback]);

    const tone: 'good' | 'warn' | 'bad' | null =
        feedback?.kind === 'success' ? resultTone(feedback.result) : feedback?.kind === 'error' ? 'bad' : null;

    return (
        <div className="mx-auto flex max-w-md flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <Heading level="h1">Scan</Heading>
                    <Text variant="small">
                        {session.eventName} — Day {session.dayNumber} —{' '}
                        {WINDOW_LABEL[session.windowType] ?? session.windowType} —{' '}
                        {CHECK_TYPE_LABEL[session.checkType as keyof typeof CHECK_TYPE_LABEL] ?? session.checkType}
                    </Text>
                </div>
                {showChangeSession && (
                    <Button variant="outline" size="sm" onClick={onChangeSession}>
                        Change session
                    </Button>
                )}
            </div>

            <div
                className={cn(
                    'relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-black ring-4 ring-transparent transition-colors duration-300',
                    tone === 'good' && 'ring-emerald-500',
                    tone === 'warn' && 'ring-amber-500',
                    tone === 'bad' && 'ring-red-500',
                )}
            >
                {/* The camera never stops for feedback — it keeps decoding
                    underneath the overlay, so the very next badge is
                    already being read while the previous result is shown. */}
                <video ref={videoRef} className="size-full object-cover" muted playsInline autoPlay />

                {!feedback && !cameraError && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="size-56 rounded-2xl border-2 border-white/60" />
                    </div>
                )}

                {cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/90 p-6 text-center">
                        <AlertTriangle className="size-8 text-amber-400" />
                        <Text className="text-white">{cameraError}</Text>
                    </div>
                )}

                {feedback && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center">
                        {feedback.kind === 'success' ? (
                            <SuccessPanel result={feedback.result} checkType={session.checkType} />
                        ) : (
                            <>
                                <XCircle className="size-10 text-red-400" />
                                <Text className="font-medium text-white">{feedback.message}</Text>
                            </>
                        )}
                    </div>
                )}
            </div>

            <Text variant="caption" className="text-center">
                Hold each student's QR code steady in the frame, then confirm the photo matches their face.
            </Text>

            {recent.length > 0 && (
                <div className="space-y-2">
                    <Text variant="small" className="font-medium">
                        Recent scans
                    </Text>
                    <div className="space-y-2">
                        {recent.map((entry) => (
                            <div
                                key={`${entry.recordId}-${entry.outcome}-${entry.scannedAt}`}
                                className="flex items-center gap-3 rounded-lg border p-2"
                            >
                                <UserAvatar student={entry.student} className="size-9" />
                                <div className="min-w-0 flex-1">
                                    <Text className="truncate text-sm font-medium">{studentFullName(entry.student)}</Text>
                                    <Text variant="caption">{studentMeta(entry.student)}</Text>
                                </div>
                                <OutcomeBadge result={entry} checkType={session.checkType} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function SuccessPanel({ result, checkType }: { result: ScanResult; checkType: string }) {
    const tone = resultTone(result);
    const checkLabel = CHECK_TYPE_LABEL[checkType as keyof typeof CHECK_TYPE_LABEL] ?? checkType;
    return (
        <>
            <UserAvatar student={result.student} className="size-24 ring-4 ring-white/20" fallbackClassName="text-2xl" />
            <div>
                <Text className="text-lg font-semibold text-white">{studentFullName(result.student)}</Text>
                <Text className="text-white/70">{studentMeta(result.student)}</Text>
            </div>
            <div className="flex items-center gap-2">
                {tone === 'good' ? (
                    <CheckCircle2 className="size-5 text-emerald-400" />
                ) : (
                    <AlertTriangle className="size-5 text-amber-400" />
                )}
                <Text className={cn('font-medium', tone === 'good' ? 'text-emerald-400' : 'text-amber-400')}>
                    {resultHeadline(result, checkLabel)}
                </Text>
            </div>
        </>
    );
}

function OutcomeBadge({ result, checkType }: { result: ScanResult; checkType: string }) {
    const tone = resultTone(result);
    const checkLabel = CHECK_TYPE_LABEL[checkType as keyof typeof CHECK_TYPE_LABEL] ?? checkType;
    return (
        <Badge
            variant={tone === 'good' ? 'default' : 'secondary'}
            className={cn(tone === 'warn' && 'bg-amber-500 text-white')}
        >
            {resultHeadline(result, checkLabel)}
        </Badge>
    );
}

function resultTone(result: ScanResult): 'good' | 'warn' {
    if (result.outcome === ScanOutcome.Duplicate) return 'warn';
    if (result.status === AttendanceStatus.Late) return 'warn';
    return 'good';
}

function resultHeadline(result: ScanResult, checkLabel: string): string {
    if (result.outcome === ScanOutcome.Duplicate) return 'Already scanned';
    return result.status === AttendanceStatus.Late ? `Late (${checkLabel.toLowerCase()})` : `Present (${checkLabel.toLowerCase()})`;
}

function studentFullName(student: ScannedStudent): string {
    const middleInitial = student.middleName ? ` ${student.middleName.charAt(0)}.` : '';
    const suffix = student.suffix ? ` ${student.suffix}` : '';
    return `${student.firstName}${middleInitial} ${student.lastName}${suffix}`;
}

function studentMeta(student: ScannedStudent): string {
    return [student.departmentCode, student.yearLevel ? `Year ${student.yearLevel}` : null, student.section]
        .filter((part): part is string => Boolean(part))
        .join(' • ');
}

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined' || !window.AudioContext) return null;
    if (!sharedAudioContext) sharedAudioContext = new window.AudioContext();
    if (sharedAudioContext.state === 'suspended') void sharedAudioContext.resume();
    return sharedAudioContext;
}

/** Short synthesized beep(s) — no audio asset to bundle, and the pattern
 *  (one high note vs. two lower notes) doubles as an eyes-free cue. */
function playFeedbackTone(tone: 'good' | 'warn' | 'bad') {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = tone === 'good' ? [880] : tone === 'warn' ? [660, 440] : [220, 165];
    let start = ctx.currentTime;

    for (const frequency of notes) {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.2, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.13);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.14);
        start += 0.12;
    }
}

function vibrateForTone(tone: 'good' | 'warn' | 'bad') {
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;
    navigator.vibrate(tone === 'good' ? 40 : tone === 'warn' ? [40, 60, 40] : [80, 60, 80]);
}
