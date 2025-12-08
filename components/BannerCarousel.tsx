'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Banner {
  id?: string;
  titulo: string;
  subtitulo: string;
  textoBoton: string;
  urlBoton?: string;
  imagen?: string | null;
  orden?: number;
}

interface BannerCarouselProps {
  banners: Banner[];
}

export default function BannerCarousel({ banners }: BannerCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Si no hay banners, no renderizar nada
  if (!banners || banners.length === 0) {
    return null;
  }

  // Filtrar duplicados por ID antes de renderizar
  const uniqueBanners = banners.filter((banner, index, self) => {
    // Si tiene ID, usar ID como criterio único
    if (banner.id) {
      return index === self.findIndex((b) => b.id === banner.id);
    }
    // Si no tiene ID, usar índice (no debería pasar, pero por seguridad)
    return index === self.findIndex((b, i) => i === index);
  });

  useEffect(() => {
    if (uniqueBanners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % uniqueBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [uniqueBanners.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + uniqueBanners.length) % uniqueBanners.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % uniqueBanners.length);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl">
      <div
        className="flex transition-transform duration-500"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {uniqueBanners.map((banner, index) => (
          <div key={banner.id || `banner-${index}`} className="w-full flex-shrink-0">
            <div
              className="flex min-h-[380px] flex-col gap-6 bg-cover bg-center bg-no-repeat items-center justify-center p-8 md:p-12 text-center"
              style={{
                backgroundImage: banner.imagen
                  ? `linear-gradient(rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.4) 100%), url(${banner.imagen})`
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              <div className="flex flex-col gap-3 max-w-md">
                <h1 className="text-white text-3xl md:text-5xl font-extrabold leading-tight">
                  {banner.titulo}
                </h1>
                <p className="text-white/90 text-base md:text-lg font-normal">
                  {banner.subtitulo}
                </p>
              </div>
              <Link
                href={banner.urlBoton || '/tienda'}
                className="mt-3 flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-11 px-6 bg-blue-600 text-white text-base font-bold transition-transform hover:scale-105"
              >
                <span>{banner.textoBoton}</span>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {uniqueBanners.length > 1 && (
        <>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
            {uniqueBanners.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2 w-2 rounded-full transition-opacity ${
                  index === currentIndex ? 'bg-white' : 'bg-white opacity-50 hover:opacity-100'
                }`}
                aria-label={`Ir a slide ${index + 1}`}
              />
            ))}
          </div>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30"
            aria-label="Anterior"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30"
            aria-label="Siguiente"
          >
            <span className="material-symbols-outlined text-2xl">arrow_forward_ios</span>
          </button>
        </>
      )}
    </div>
  );
}
