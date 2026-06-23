import Image from "next/image";
import { getMarketingImage, type MarketingImageKey } from "@/lib/images";
import { cn } from "@makyschool/ui/lib/cn";

type ImageVariant = "hero" | "card" | "banner";

type MarketingImageProps = {
  imageKey: MarketingImageKey;
  className?: string;
  frameClassName?: string;
  priority?: boolean;
  variant?: ImageVariant;
};

const variantStyles: Record<ImageVariant, string> = {
  hero: "aspect-[11/6]",
  card: "aspect-[16/10]",
  banner: "aspect-[11/6]",
};

export function MarketingImage({
  imageKey,
  className,
  frameClassName,
  priority,
  variant = "card",
}: MarketingImageProps) {
  const image = getMarketingImage(imageKey);

  return (
    <figure
      className={cn(
        "relative overflow-hidden rounded-xl bg-theme-surface-raised",
        variantStyles[variant],
        frameClassName,
      )}
    >
      <Image
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        priority={priority}
        className={cn("h-full w-full object-cover object-center", className)}
      />
    </figure>
  );
}
