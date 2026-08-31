import Image from "next/image";
import { cn } from "@/lib/utils";

export function CoverMedia({
  src,
  alt,
  className,
  priority = false,
  sizes,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const fillClass = cn("absolute inset-0 h-full w-full object-cover", className);

  if (src.endsWith(".svg")) {
    return (
      // SVG covers are illustrations, not photos to optimize.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={fillClass} />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={fillClass}
      sizes={sizes ?? "100vw"}
      priority={priority}
    />
  );
}
