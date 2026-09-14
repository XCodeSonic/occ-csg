import csgLogo from '@/assets/csg-logo.png';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export interface PremiumIdCardProps {
    firstName: string;
    lastName: string;
    studentNumber: string;
    section: string | null;
    qrUrl: string;
    photoUrl?: string | null;
    course?: string | null;
    className?: string;
}

function initials(firstName: string, lastName: string) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * A plain-DOM, light-theme student ID card. Every dimension is fluid
 * (clamp()/vw-based, no hardcoded breakpoint-less pixel sizes) so the card
 * — and the QR inside it — scale to fit whatever viewport it's dropped
 * into, from a small phone to a wide desktop window, instead of a single
 * fixed size that only looks right at one width. The CSG logo sits over
 * the QR's middle in a slim ring (the QR's built-in error correction
 * tolerates the small occlusion), and `.shimmer-logo` (already defined in
 * app.css for the login/account trust badges) is reused here for the
 * holographic "premium ID" sweep across the whole card.
 */
export function PremiumIdCard({
    firstName,
    lastName,
    studentNumber,
    section,
    qrUrl,
    photoUrl,
    course,
    className,
}: PremiumIdCardProps) {
    return (
        <div
            className={cn(
                'shimmer-logo relative flex w-[min(92vw,24rem)] flex-col items-center gap-[clamp(0.75rem,3vw,1.25rem)] rounded-[clamp(1.25rem,4vw,1.75rem)] border border-neutral-200 bg-white px-[clamp(1.25rem,5vw,1.75rem)] py-[clamp(1.5rem,5vw,2rem)] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)]',
                className,
            )}
        >
            {/* Avatar, name, course/section — the "ID" part of the card */}
            <div className="flex w-full flex-col items-center gap-[clamp(0.375rem,1.5vw,0.625rem)] text-center">
                <Avatar className="size-[clamp(3.5rem,16vw,4.5rem)] ring-4 ring-white shadow-md">
                    {photoUrl ? <AvatarImage src={photoUrl} alt={`${firstName} ${lastName}`} /> : null}
                    <AvatarFallback className="bg-neutral-100 text-neutral-500">{initials(firstName, lastName)}</AvatarFallback>
                </Avatar>

                <div className="flex w-full flex-col items-center gap-1">
                    <div className="text-h3 font-semibold text-neutral-900">
                        {firstName} {lastName}
                    </div>
                    <div className="font-mono text-small tracking-[0.08em] text-neutral-500">{studentNumber}</div>
                </div>

                {(course || section) && (
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {course && (
                            <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-caption font-medium tracking-wide text-neutral-600 uppercase">
                                {course}
                            </span>
                        )}
                        {section && (
                            <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-caption font-medium tracking-wide text-neutral-600 uppercase">
                                {section}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* QR, logo badge centered on top of it — sized as a fraction of
                the card's own (already fluid) width via aspect-square, not
                a fixed pixel box, so it never overflows a narrow screen or
                looks tiny on a wide one. */}
            <div className="relative flex aspect-square w-full shrink-0 items-center justify-center rounded-3xl border border-neutral-200 bg-white p-[clamp(0.5rem,3vw,0.75rem)] shadow-inner">
                <img
                    src={qrUrl}
                    alt="Your attendance QR code"
                    className="size-full object-contain"
                    style={{ imageRendering: 'pixelated' }}
                />
                <div className="absolute flex size-[clamp(2rem,10vw,2.5rem)] items-center justify-center rounded-full bg-white p-1 shadow-sm ring-1 ring-neutral-200">
                    <img src={csgLogo} alt="" className="size-full object-contain" />
                </div>
            </div>

            <div className="text-center text-caption text-neutral-400">Present this QR to the attendance scanner.</div>
        </div>
    );
}
