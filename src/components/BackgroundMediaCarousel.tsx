import { useEffect, useState, useRef } from "react";
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
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (mediaType !== "carousel" || carouselItems.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % carouselItems.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [mediaType, carouselItems.length, autoPlayInterval]);

  // Garantir que o vídeo reproduza automaticamente
  useEffect(() => {
    if (mediaType === "video" && videoRef.current) {
      const video = videoRef.current;
      
      // Tentar reproduzir o vídeo
      const playPromise = video.play();
      
      if (playPromise !== undefined) {
        playPromise
          .catch((error) => {
            console.warn("Autoplay foi bloqueado pelo navegador:", error);
            // Alguns navegadores bloqueiam autoplay sem interação do usuário
            // Neste caso, o vídeo ainda terá loop ativado e reproduzirá quando possível
          });
      }
    }
  }, [mediaType, mediaUrl]);

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
        <>
          <video
            ref={videoRef}
            src={mediaUrl}
            autoPlay
            loop
            muted
            playsInline
            controls={false}
            className="w-full h-full object-cover"
            onLoadedData={() => setIsLoading(false)}
            onPlay={() => setIsLoading(false)}
            onCanPlay={() => setIsLoading(false)}
            onError={(e) => {
              console.error("Erro ao carregar vídeo:", mediaUrl, e);
              setIsLoading(false);
            }}
            crossOrigin="anonymous"
          />
          {/* Fallback para navegadores que bloqueiam autoplay */}
          <style>{`
            video {
              display: block;
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
          `}</style>
        </>
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
