import { Heading, Text } from '@/presentation/components/typography';

export function FaqPage() {
    return (
        <div className="mx-auto max-w-md space-y-2">
            <Heading level="h1">FAQ</Heading>
            <Text variant="small">Common questions go here.</Text>
        </div>
    );
}
