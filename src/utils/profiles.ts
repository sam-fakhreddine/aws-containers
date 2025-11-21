import { AWSProfile } from "@/types";

/**
 * Sorts AWS profiles based on credential status and name.
 * The sorting order is:
 * 1. Profiles with active credentials.
 * 2. Profiles with expired credentials.
 * 3. Profiles without any credentials.
 * Within each group, profiles are sorted alphabetically by name.
 *
 * @param profiles The array of AWS profiles to sort.
 * @returns A new array with the sorted profiles.
 */
export function sortByCredentialStatus(profiles: AWSProfile[]): AWSProfile[] {
  // slice() creates a shallow copy to avoid mutating the original array.
  return profiles.slice().sort((a, b) => {
    // Group 1 vs Group 2 & 3: Profiles with credentials come first.
    if (a.has_credentials !== b.has_credentials) {
      return a.has_credentials ? -1 : 1;
    }

    // Within Group 1 (profiles with credentials), sort by expiration status.
    // Non-expired (active) profiles come before expired ones.
    if (a.has_credentials && b.has_credentials && a.expired !== b.expired) {
      return a.expired ? 1 : -1;
    }

    // For all other cases (e.g., within the same credential/expiration group),
    // sort alphabetically by name.
    return a.name.localeCompare(b.name);
  });
}

/**
 * Logs a summary of the AWS profiles for debugging purposes.
 * @param profiles The array of AWS profiles to summarize.
 */
export function logProfileSummary(profiles: AWSProfile[]): void {
  const ssoCount = profiles.filter((p) => p.is_sso).length;
  const activeCredsCount = profiles.filter(
    (p) => p.has_credentials && !p.expired,
  ).length;
  const expiredCredsCount = profiles.filter(
    (p) => p.has_credentials && p.expired,
  ).length;

  console.log(
    `[Profile Summary] Total: ${profiles.length} | SSO: ${ssoCount} | Active: ${activeCredsCount} | Expired: ${expiredCredsCount}`,
  );
}
