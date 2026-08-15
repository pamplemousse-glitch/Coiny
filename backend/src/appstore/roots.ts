import { X509Certificate } from 'node:crypto';

// Apple Root CA - G3, the trust anchor for every certificate chain Apple
// attaches to App Store signed data (transaction JWS, renewal-info JWS and
// Server Notifications V2 payloads).
//
// This is a PUBLIC certificate, downloaded 2026-08-13 from
// https://www.apple.com/certificateauthority/AppleRootCA-G3.cer
// SHA-256 fingerprint:
// 63:34:3A:BF:B8:9A:6A:03:EB:B5:7E:9B:3F:5F:A7:BE:7C:4F:5C:75:6F:30:17:B3:A8:C4:88:C3:65:3E:91:79
// Valid until 2039-04-30. If Apple ever rotates roots, append the new one
// here; verification accepts a chain anchored at ANY listed root.
const APPLE_ROOT_CA_G3_DER_B64 =
  'MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtfTjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySrMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gAMGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM6BgD56KyKA==';

let productionRoots: X509Certificate[] | null = null;
let testRoots: X509Certificate[] | null = null;

/** Trusted anchors for App Store JWS chain verification. */
export function trustedAppleRoots(): X509Certificate[] {
  if (testRoots) return testRoots;
  if (!productionRoots) {
    productionRoots = [new X509Certificate(Buffer.from(APPLE_ROOT_CA_G3_DER_B64, 'base64'))];
  }
  return productionRoots;
}

/** Tests inject their own root so fixtures can carry a locally generated
 *  chain. Mirrors setKeyFetcher() in plaid/signature.ts. Pass null to restore
 *  the pinned Apple root. */
export function setTrustedRootsForTesting(roots: X509Certificate[] | null): void {
  testRoots = roots;
}
