import React, { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  width?: number;
  quality?: number;
  format?: "webp" | "avif" | "origin";
  aspectRatio?: string;
}

/**
 * OptimizedImage component that handles:
 * 1. Supabase image transformations (if applicable)
 * 2. Skeleton loading state
 * 3. Smooth fade-in transition
 * 4. Lazy loading by default
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className,
  containerClassName,
  width,
  quality = 80,
  format = "webp",
  aspectRatio = "aspect-[2/3]",
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [optimizedSrc, setOptimizedSrc] = useState(src);

  useEffect(() => {
    // Detect if it's a Supabase Storage URL
    // Format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
    if (src && src.includes("supabase.co/storage/v1/object/public/")) {
      try {
        const url = new URL(src);
        // Supabase Image Transformation URL format:
        // https://[project].supabase.co/storage/v1/render/image/public/[bucket]/[path]?width=300&quality=80&format=webp
        const newPath = url.pathname.replace("/object/public/", "/render/image/public/");
        const params = new URLSearchParams();
        if (width) params.append("width", width.toString());
        params.append("quality", quality.toString());
        params.append("format", format);
        
        setOptimizedSrc(`${url.origin}${newPath}?${params.toString()}`);
      } catch (e) {
        setOptimizedSrc(src);
      }
    } else {
      setOptimizedSrc(src);
    }
  }, [src, width, quality, format]);

  return (
    <div className={cn("relative overflow-hidden bg-muted", aspectRatio, containerClassName)}>
      {!isLoaded && !error && (
        <Skeleton className="absolute inset-0 w-full h-full z-10" />
      )}
      
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary text-muted-foreground text-xs p-2 text-center">
          Falha ao carregar imagem
        </div>
      ) : (
        <img
          src={optimizedSrc}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          onError={() => setError(true)}
          loading={props.loading || "lazy"}
          decoding="async"
          className={cn(
            "w-full h-full object-cover transition-opacity duration-500",
            isLoaded ? "opacity-100" : "opacity-0",
            className
          )}
          {...props}
        />
      )}
    </div>
  );
};
