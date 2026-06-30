import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BackgroundMediaCarouselProps {
  mediaUrl?: string;
  mediaType?: "image" | "video" | "carousel";
  carouselItems?: string[];
  autoPlayInterval?: number;
}

export const BackgroundMediaCarousel = ({
  mediaUrl,
  mediaType = "image",
  carouselItems = [],
  autoPlayInterval = 5000,
}: BackgroundMediaCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (mediaType !== "carousel" || carouselItems.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % carouselItems.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [mediaType, carouselItems.length, autoPlayInterval]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + carouselItems.length) % carouselItems.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % carouselItems.length);
  };

  if (!mediaUrl && carouselItems.length === 0) return null;

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {/* Imagem de Fundo */}
      {mediaType === "image" && mediaUrl && (
        <img
          src={mediaUrl}
          alt="Background"
          className="w-full h-full object-cover"
          onLoad={() => setIsLoading(false)}
        />
      )}

      {/* Vídeo em Loop */}
      {mediaType === "video" && mediaUrl && (
        <video
          src={mediaUrl}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
          onLoadedData={() => setIsLoading(false)}
        />
      )}

      {/* Carrossel */}
      {mediaType === "carousel" && carouselItems.length > 0 && (
        <>
          <img
            src={carouselItems[currentIndex]}
            alt={`Carousel item ${currentIndex}`}
            className="w-full h-full object-cover transition-opacity duration-500"
            onLoad={() => setIsLoading(false)}
          />
          {carouselItems.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-colors"
                aria-label="Previous slide"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-colors"
                aria-label="Next slide"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </>
      )}

      {/* Overlay de Glassmorphism (Efeito de Espelho/Gota d'água) */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-white/10 pointer-events-none" />
    </div>
  );
};

export default BackgroundMediaCarousel;
