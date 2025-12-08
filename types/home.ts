// Tipos específicos para la página de inicio

export interface BannerConfig {
  id?: string;
  titulo: string;
  subtitulo: string;
  textoBoton: string;
  urlBoton: string;
  imagen?: string | null;
  orden?: number;
}

export interface SeccionNovedadesConfig {
  titulo: string;
  mostrar: boolean;
  cantidad?: number;
}

export interface SeccionCategoriasConfig {
  titulo: string;
  mostrar: boolean;
  cantidad?: number;
}

export interface HomeData {
  banners: BannerConfig[];
  productosDestacados: any[];
  categorias: any[];
  configNovedades?: SeccionNovedadesConfig;
  configCategorias?: SeccionCategoriasConfig;
}

