/** Builds the shareable public booking URL for an authorized company record. */
export function getPublicBookingUrl(companyId: string, appUrl: string): string {
  return `${appUrl.replace(/\/$/, "")}/agendar/empresa/${encodeURIComponent(companyId)}`;
}
