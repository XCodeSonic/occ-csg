<?php

namespace App\Domain\ValueObjects;

use App\Domain\Exceptions\InvalidQrPayloadException;
use Carbon\Carbon;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;

final class QrPayload
{
    private const DELIMITER = '|';

    public function __construct(
        public readonly string $studentNumber,
        public readonly int $qrVersion,
        public readonly Carbon $issuedAt,
    ) {}

    public static function forStudent(string $studentNumber, int $qrVersion, ?Carbon $issuedAt = null): self
    {
        return new self($studentNumber, $qrVersion, $issuedAt ?? Carbon::now('UTC'));
    }

    /**
     * Encrypt this payload into the string that gets embedded in the QR code.
     * Delimited, not JSON — keeps the ciphertext (and therefore the QR) smaller.
     * Uses Laravel's encrypter under the hood (AES-256-GCM, keyed off APP_KEY).
     */
    public function encrypt(): string
    {
        $raw = implode(self::DELIMITER, [
            $this->studentNumber,
            $this->qrVersion,
            $this->issuedAt->timestamp,
        ]);

        return Crypt::encryptString($raw);
    }

    /**
     * Decrypt a scanned QR string back into a QrPayload.
     *
     * @throws InvalidQrPayloadException if the token is forged, tampered with,
     *         encrypted under a different key, or not in the expected shape.
     */
    public static function decrypt(string $token): self
    {
        try {
            $raw = Crypt::decryptString($token);
        } catch (DecryptException $e) {
            throw new InvalidQrPayloadException('QR token could not be decrypted.', $e);
        }

        $parts = explode(self::DELIMITER, $raw);

        if (count($parts) !== 3 || $parts[0] === '' || ! ctype_digit($parts[1]) || ! ctype_digit($parts[2])) {
            throw new InvalidQrPayloadException('QR token payload is malformed.');
        }

        [$studentNumber, $qrVersion, $issuedAtTimestamp] = $parts;

        return new self(
            $studentNumber,
            (int) $qrVersion,
            Carbon::createFromTimestamp((int) $issuedAtTimestamp, 'UTC'),
        );
    }
}
