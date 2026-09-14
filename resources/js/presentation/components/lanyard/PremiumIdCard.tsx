import occLogo from '@/assets/occ-logo.png';
import { cn } from '@/lib/utils';

export interface PremiumIdCardProps {
    firstName: string;
    lastName: string;
    studentNumber: string;
    section: string | null;
    qrUrl: string;
    className?: string;
}

/**
 * A plain-DOM, light-theme student ID card — the QR is large and front and
 * center, the OCC logo sits over its middle (the QR's built-in error
 * correction tolerates the small occlusion), and `.shimmer-logo` (already
 * defined in app.css for the login/account trust badges) is reused here for
 * the holographic "premium ID" sweep across the whole card. No three.js, no
 * physics engine, no GLB model — this is what replaced the 3D Lanyard on
 * every device (see Lanyard.tsx's removal).
 */
export function PremiumIdCard({ firstName, lastName, studentNumber, section, qrUrl, className }: PremiumIdCardProps) {
    return (
        <div
            className={cn(
                'shimmer-logo relative flex w-full max-w-[360px] flex-col items-center gap-5 rounded-[28px] border border-neutral-200 bg-white px-6 py-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)]',
                className,
            )}
        >
            {/* Big QR, logo badge centered on top of it */}
            <div className="relative flex size-[260px] shrink-0 items-center justify-center rounded-3xl border border-neutral-200 bg-white p-3 shadow-inner">
                <img
                    src={qrUrl}
                    alt="Your attendance QR code"
                    className="size-full object-contain"
                    style={{ imageRendering: 'pixelated' }}
                />
                <div className="absolute flex size-14 items-center justify-center rounded-full bg-white p-2 shadow-md ring-4 ring-white">
                    <img src={occLogo} alt="" className="size-full object-contain" />
                </div>
            </div>

            {/* Name, ID number, section */}
            <div className="flex w-full flex-col items-center gap-1 text-center">
                <div className="text-h3 font-semibold text-neutral-900">
                    {firstName} {lastName}
                </div>
                <div className="font-mono text-small tracking-[0.08em] text-neutral-500">{studentNumber}</div>
                {section && (
                    <div className="mt-1 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-caption font-medium tracking-wide text-neutral-600 uppercase">
                        {section}
                    </div>
                )}
            </div>

            <div className="text-center text-caption text-neutral-400">Present this QR to the attendance scanner.</div>
        </div>
    );
}
