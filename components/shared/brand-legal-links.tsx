import { BRAND } from "@/lib/brand";

export function BrandLegalLinks({ className = "" }: { className?: string }) {
  if (!BRAND.termsUrl && !BRAND.privacyUrl) return null;
  return (
    <p className={`text-xs text-muted-foreground ${className}`}>
      By continuing, you agree to {BRAND.name}&apos;s{" "}
      {BRAND.termsUrl && (
        <a
          href={BRAND.termsUrl}
          className="underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Terms of Service
        </a>
      )}
      {BRAND.termsUrl && BRAND.privacyUrl && " and "}
      {BRAND.privacyUrl && (
        <a
          href={BRAND.privacyUrl}
          className="underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Privacy Policy
        </a>
      )}
      .
    </p>
  );
}
