import occLogo from '@/assets/occ-logo.png';

export interface StudentIdCardFaceProps {
    firstName: string;
    lastName: string;
    studentNumber: string;
    course: string;
    yearSection: string;
    roleLabel: string;
    photoUrl: string | null;
    qrUrl: string;
}

function initialsOf(firstName: string, lastName: string) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * The card's front face, as real DOM — not a canvas texture. Sized at a
 * fixed 320x448 CSS-pixel box whose aspect ratio (0.714) matches card.glb's
 * own front-face geometry (0.716), measured directly from the model so the
 * overlay's rounded rect lines up with the plastic's silhouette. If you
 * resize this box, update the matching `scale` on the <Html> in Lanyard.tsx
 * so the overlay keeps covering the same physical area.
 */
export function StudentIdCardFace({
    firstName,
    lastName,
    studentNumber,
    course,
    yearSection,
    roleLabel,
    photoUrl,
    qrUrl,
}: StudentIdCardFaceProps) {
    return (
        <div className="relative flex h-[448px] w-[320px] flex-col gap-3 overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black p-5 shadow-2xl">
            <div
                aria-hidden
                className="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full bg-violet-500/20 blur-2xl"
            />

            {/* Header: brand mark + role chip */}
            <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <img src={occLogo} alt="" className="size-4 rounded object-contain" />
                    <span className="text-[9px] font-semibold tracking-[0.2em] text-white/60 uppercase">
                        Student ID
                    </span>
                </div>
                <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[9px] font-semibold tracking-wide text-white/90 uppercase">
                    {roleLabel}
                </span>
            </div>

            {/* Identity: avatar, name, student number */}
            <div className="relative flex items-center gap-3">
                {photoUrl ? (
                    <img
                        src={photoUrl}
                        alt=""
                        className="size-14 shrink-0 rounded-full object-cover ring-2 ring-white/25"
                    />
                ) : (
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white/10 text-base font-semibold text-white ring-2 ring-white/25">
                        {initialsOf(firstName, lastName)}
                    </div>
                )}
                <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold text-white">
                        {firstName} {lastName}
                    </div>
                    <div className="truncate font-mono text-[10px] tracking-[0.1em] text-white/60">
                        {studentNumber}
                    </div>
                </div>
            </div>

            {/* Perforated divider */}
            <div className="relative border-t border-dashed border-white/15" />

            {/* Course / Year & Section */}
            <div className="relative grid grid-cols-2 gap-3">
                <div className="min-w-0">
                    <div className="text-[8px] font-medium tracking-widest text-white/45 uppercase">Course</div>
                    <div className="truncate text-[11px] font-medium text-white/90">{course}</div>
                </div>
                <div className="min-w-0">
                    <div className="text-[8px] font-medium tracking-widest text-white/45 uppercase">
                        Year & Section
                    </div>
                    <div className="truncate text-[11px] font-medium text-white/90">{yearSection}</div>
                </div>
            </div>

            {/* QR code — a plain <img>, so it's exactly as sharp as the PNG the
                backend rendered, with no canvas/GPU resampling in between.
                `imageRendering: pixelated` keeps it crisp if it's ever scaled
                up past its natural resolution. */}
            <div className="relative flex flex-1 items-center justify-center">
                <div className="relative flex size-[220px] items-center justify-center rounded-2xl bg-white p-2">
                    <img
                        src={qrUrl}
                        alt="Your attendance QR code"
                        className="size-full object-contain"
                        style={{ imageRendering: 'pixelated' }}
                    />
                    <div className="absolute flex size-9 items-center justify-center rounded-lg bg-white p-1 shadow-sm">
                        <img src={occLogo} alt="" className="size-full object-contain" />
                    </div>
                </div>
            </div>

            <div className="relative text-center text-[9px] text-white/50">
                Present this QR to the attendance scanner.
            </div>
        </div>
    );
}
