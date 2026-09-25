import { obtenerDatos, temasVivos, SECCIONES } from '@/lib/datos';
import { cuantasPaginas, direccionDePagina } from '@/lib/paginas';
import { sitio } from '@/lib/sitio';

// El mapa del sitio para los buscadores.
//
// Hasta ahora el robots.txt apuntaba a /feed.xml, que es otra cosa: el feed
// es para lectores de noticias y trae las últimas veinte. El sitemap es la
// lista de todo lo que queremos que se indexe, que hoy son unas doscientas
// direcciones entre notas, secciones y temas.
//
// `lastModified` sale de la fecha de cada nota, no de "ahora": un sitemap
// que dice que las doscientas cambiaron hace un minuto no le sirve a nadie
// y encima se nota.

export const dynamic = 'force-static';

export default function sitemap() {
  const base = sitio();
  const d = obtenerDatos();
  const notas = d.notas ?? [];

  // La más nueva marca cuándo cambió la portada.
  const ultima = notas.length
    ? new Date(Math.max(...notas.map((n) => new Date(n.fecha).getTime())))
    : new Date();

  const fijas = [
    { url: base, lastModified: ultima, changeFrequency: 'hourly', priority: 1 },
    { url: `${base}/farmacias`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/agenda`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${base}/util`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/quienes-somos`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/contacto`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/politica-de-privacidad`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
  ];

  // Una entrada por página de sección, igual que las que se generan.
  const conNotas = new Set(notas.map((n) => n.seccion));
  const secciones = SECCIONES.filter((s) => conNotas.has(s.nombre)).flatMap((s) => {
    const cuantas = notas.filter((n) => n.seccion === s.nombre).length;
    return Array.from({ length: cuantasPaginas(cuantas) }, (_, i) => ({
      url: `${base}${direccionDePagina(s.ranura, i + 1)}`,
      lastModified: ultima,
      changeFrequency: 'hourly',
      priority: i === 0 ? 0.8 : 0.4,
    }));
  });

  const temas = temasVivos().map((t) => ({
    url: `${base}/tema/${t.ranura}`,
    lastModified: ultima,
    changeFrequency: 'daily',
    priority: 0.6,
  }));

  const deNotas = notas.map((n) => ({
    url: `${base}${n.ruta}`,
    lastModified: new Date(n.fecha),
    changeFrequency: 'weekly',
    priority: n.local ? 0.9 : 0.6,
  }));

  return [...fijas, ...secciones, ...temas, ...deNotas];
}

