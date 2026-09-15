import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Text } from '@/presentation/components/typography';
import { AnimatedCounter } from '@/presentation/components/dashboard/animated-counter';
import { TONE, type Tone } from '@/presentation/components/tone';

/**
 * The squircle. One shape, three sizes, two weights — this is the atom the
 * whole dashboard is built from now, so the streak tile, a stat icon, a
 * department badge and a leaderboard rank are all visibly the same object
 * at different scales.
 *
 * Sizes are deliberately few. The radius grows with the box (xl → 2xl) so
 * the corner curve stays visually constant instead of looking tighter on
 * the big tiles.
 */
const TILE_SIZE = {
    sm: 'size-8 rounded-xl',
    md: 'size-11 rounded-2xl',
    lg: 'size-16 rounded-2xl',
} as const;

const TILE_ICON = {
    sm: 'size-4',
    md: 'size-5',
    lg: 'size-6',
} as const;

export function Tile({
    tone,
    size = 'md',
    variant = 'solid',
    Icon,
    children,
    className,
}: {
    tone: Tone;
    size?: keyof typeof TILE_SIZE;
    variant?: 'solid' | 'soft';
    Icon?: LucideIcon;
    children?: ReactNode;
    className?: string;
}) {
    return (
        <span
            className={cn(
                'flex shrink-0 flex-col items-center justify-center gap-0.5',
                TILE_SIZE[size],
                TONE[tone][variant],
                className,
            )}
        >
            {Icon && <Icon className={TILE_ICON[size]} />}
            {children}
        </span>
    );
}

/**
 * Tile + label + number, in the streak card's own arrangement: the lit
 * square on the left carrying the icon, the reading stacked to the right of
 * it — big figure over a quiet caption.
 *
 * Replaces what used to be three near-identical components (StatPill,
 * StatChip, MiniStat), each with its own padding, radius and tone map. They
 * were drifting apart; one component means a Present count looks the same
 * whether it's on the student dashboard or the admin one.
 */
export function StatTile({
    label,
    value,
    Icon,
    tone,
    variant = 'soft',
    format,
    className,
}: {
    label: ReactNode;
    value: number;
    Icon: LucideIcon;
    tone: Tone;
    /** `solid` promotes this stat to the card's focal point. Use once per card. */
    variant?: 'solid' | 'soft';
    format?: (n: number) => string;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex min-w-0 items-center gap-3 rounded-2xl border bg-card p-3 sm:p-3.5',
                variant === 'solid' && TONE[tone].wash,
                className,
            )}
        >
            <Tile tone={tone} size="md" variant={variant} Icon={Icon} />
            <div className="min-w-0">
                <span className="block truncate text-h3 leading-none font-semibold tabular-nums text-foreground">
                    <AnimatedCounter value={value} format={format} />
                </span>
                <Text variant="caption" className="mt-1 block truncate leading-none">
                    {label}
                </Text>
            </div>
        </div>
    );
}

/**
 * A wrapper that puts a blurred pool of the tone's own color behind whatever
 * it holds. Used once, under the hero gauge — the glow scaled up from a
 * 16px shadow to a 200px one, so the hero reads as the source of the light
 * the smaller tiles are catching.
 *
 * Pure decoration, so it's aria-hidden and sits behind content; it never
 * intercepts a tap.
 */
export function Glow({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
    return (
        <div className={cn('relative isolate', className)}>
            <motion.span
                aria-hidden
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                className={cn(
                    'pointer-events-none absolute top-1/2 left-1/2 -z-10 size-48 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-3xl dark:opacity-30',
                    TONE[tone].bar,
                )}
            />
            {children}
        </div>
    );
}
