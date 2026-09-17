import Image from "next/image";
import Link from "next/link";

/**
 * Icon-only mark (the "j" glyph). Use for navbars, favicons-in-UI, tight spaces.
 */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <Image
      src="/logo-icon.png"
      alt="Janjianyuk"
      width={64}
      height={70}
      className={`${className} object-contain`}
      priority
    />
  );
}

/**
 * Icon + wordmark, stacked (matches the source brand artwork). Use for
 * centered brand moments like auth pages.
 */
export function LogoMarkStacked({ className = "h-24 w-auto" }: { className?: string }) {
  return (
    <Image
      src="/logo-mark.png"
      alt="Janjianyuk"
      width={823}
      height={518}
      className={`${className} object-contain`}
      priority
    />
  );
}

/**
 * Icon + live text lockup, for horizontal spaces like a site header.
 * Text is real HTML (not baked into the image) so it stays crisp and
 * theme-able at any size.
 */
export function Logo({
  href = "/",
  className = "",
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 ${className}`}
      aria-label="Janjianyuk"
    >
      <LogoMark className="h-8 w-8" />
      <span className="text-lg font-semibold tracking-tight text-neutral-900">
        janjianyuk
      </span>
    </Link>
  );
}
