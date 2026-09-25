// La ficha de un comercio, y cómo se arma a partir de las distintas fuentes.
//
// Esta carpeta es una base de datos APARTE del sitio: se puede usar o no en la
// web, y sirve para tres cosas —la guía y el mapa, vender publicidad, y saber
// si un comercio sigue abierto—. Ver COMERCIAL.md.
//
// Sin dependencias: sólo lo que trae Node. Todo lo de acá son funciones puras
// (entra un dato, sale otro), así que se prueban sin red.
//
// UNA REGLA DE FONDO: sólo datos del NEGOCIO (nombre, rubro, dirección,
// teléfono comercial, redes del comercio). Nada de personas: no se guarda el
// nombre de un dueño ni un teléfono particular. Es lo que pide la ley de
// protección de datos personales (25.326) y lo que evita problemas.

/** Los rubros que se muestran, en el orden en que se muestran. */
export const RUBROS = [
  'Gastronomía', 'Alimentos y almacenes', 'Indumentaria y calzado', 'Hogar y ferretería', 'Salud y farmacias',
  'Belleza y cuidado personal', 'Automotor y combustible', 'Tecnología y comunicaciones', 'Servicios profesionales',
  'Finanzas y seguros', 'Educación y cultura', 'Turismo y alojamiento', 'Campo y agro', 'Mascotas', 'Otros',
];

const POR_SHOP = {
  supermarket: 'Alimentos y almacenes', convenience: 'Alimentos y almacenes', bakery: 'Alimentos y almacenes', butcher: 'Alimentos y almacenes',
  greengrocer: 'Alimentos y almacenes', deli: 'Alimentos y almacenes', dairy: 'Alimentos y almacenes', pastry: 'Alimentos y almacenes',
  confectionery: 'Alimentos y almacenes', beverages: 'Alimentos y almacenes', alcohol: 'Alimentos y almacenes', general: 'Alimentos y almacenes',
  clothes: 'Indumentaria y calzado', shoes: 'Indumentaria y calzado', fabric: 'Indumentaria y calzado', jewelry: 'Indumentaria y calzado',
  bag: 'Indumentaria y calzado', boutique: 'Indumentaria y calzado', tailor: 'Indumentaria y calzado',
  hardware: 'Hogar y ferretería', doityourself: 'Hogar y ferretería', furniture: 'Hogar y ferretería', houseware: 'Hogar y ferretería',
  paint: 'Hogar y ferretería', glaziery: 'Hogar y ferretería', electrical: 'Hogar y ferretería', bed: 'Hogar y ferretería', kitchen: 'Hogar y ferretería',
  chemist: 'Salud y farmacias', optician: 'Salud y farmacias', medical_supply: 'Salud y farmacias', hearing_aids: 'Salud y farmacias',
  hairdresser: 'Belleza y cuidado personal', beauty: 'Belleza y cuidado personal', cosmetics: 'Belleza y cuidado personal', perfumery: 'Belleza y cuidado personal',
  massage: 'Belleza y cuidado personal', tattoo: 'Belleza y cuidado personal',
  car: 'Automotor y combustible', car_repair: 'Automotor y combustible', car_parts: 'Automotor y combustible', tyres: 'Automotor y combustible',
  motorcycle: 'Automotor y combustible', bicycle: 'Automotor y combustible',
  mobile_phone: 'Tecnología y comunicaciones', electronics: 'Tecnología y comunicaciones', computer: 'Tecnología y comunicaciones', telecommunication: 'Tecnología y comunicaciones',
  books: 'Educación y cultura', stationery: 'Educación y cultura', music: 'Educación y cultura', art: 'Educación y cultura', toys: 'Educación y cultura', gift: 'Educación y cultura',
  florist: 'Otros', garden_centre: 'Campo y agro', farm: 'Campo y agro', agrarian: 'Campo y agro', pet: 'Mascotas', pet_grooming: 'Mascotas',
  travel_agency: 'Turismo y alojamiento', copyshop: 'Servicios profesionales', laundry: 'Servicios profesionales', dry_cleaning: 'Servicios profesionales',
  variety_store: 'Otros', kiosk: 'Alimentos y almacenes', tobacco: 'Alimentos y almacenes',
};

const POR_AMENITY = {
  restaurant: 'Gastronomía', cafe: 'Gastronomía', bar: 'Gastronomía', pub: 'Gastronomía', fast_food: 'Gastronomía', ice_cream: 'Gastronomía', food_court: 'Gastronomía',
  pharmacy: 'Salud y farmacias', clinic: 'Salud y farmacias', dentist: 'Salud y farmacias', doctors: 'Salud y farmacias', hospital: 'Salud y farmacias',
  veterinary: 'Mascotas', bank: 'Finanzas y seguros', atm: 'Finanzas y seguros', fuel: 'Automotor y combustible', car_wash: 'Automotor y combustible',
  car_rental: 'Automotor y combustible', school: 'Educación y cultura', kindergarten: 'Educación y cultura', college: 'Educación y cultura', library: 'Educación y cultura',
  cinema: 'Educación y cultura', theatre: 'Educación y cultura', community_centre: 'Educación y cultura', marketplace: 'Alimentos y almacenes',
  post_office: 'Servicios profesionales', nightclub: 'Gastronomía',
};

const POR_OFFICE = {
  lawyer: 'Servicios profesionales', accountant: 'Servicios profesionales', estate_agent: 'Servicios profesionales', insurance: 'Finanzas y seguros',
  architect: 'Servicios profesionales', notary: 'Servicios profesionales', company: 'Servicios profesionales', it: 'Tecnología y comunicaciones',
  travel_agent: 'Turismo y alojamiento', financial: 'Finanzas y seguros', employment_agency: 'Servicios profesionales',
};

const POR_TURISMO = { hotel: 'Turismo y alojamiento', hostel: 'Turismo y alojamiento', guest_house: 'Turismo y alojamiento', motel: 'Turismo y alojamiento', apartment: 'Turismo y alojamiento', camp_site: 'Turismo y alojamiento', museum: 'Educación y cultura', attraction: 'Turismo y alojamiento' };

/** El rubro de una ficha a partir de las etiquetas de OpenStreetMap. */
export function rubroDe(tags = {}) {
  if (tags.shop) return { rubro: POR_SHOP[tags.shop] ?? 'Otros', tipo: tags.shop };
  if (tags.amenity) return { rubro: POR_AMENITY[tags.amenity] ?? 'Otros', tipo: tags.amenity };
  if (tags.office) return { rubro: POR_OFFICE[tags.office] ?? 'Servicios profesionales', tipo: tags.office };
  if (tags.tourism) return { rubro: POR_TURISMO[tags.tourism] ?? 'Turismo y alojamiento', tipo: tags.tourism };
  if (tags.craft) return { rubro: 'Otros', tipo: tags.craft };
  return { rubro: 'Otros', tipo: null };
}

/** Un nombre sin tildes ni mayúsculas ni signos: para comparar y para la dirección. */
export const clave = (texto = '') => String(texto).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

export const slug = (texto = '') => clave(texto).replace(/\s+/g, '-').slice(0, 60);

/**
 * Un teléfono argentino en un solo formato, o null si no parece uno.
 * Devuelve el número tal como se marca desde un celular con el prefijo del
 * país: +54 2266 42-1234. Balcarce es 2266.
 */
export function normalizarTelefono(crudo) {
  const solo = String(crudo ?? '').split(/[;,/]/)[0].replace(/[^\d+]/g, '');
  let d = solo.replace(/^\+/, '');
  if (d.startsWith('54')) d = d.slice(2);
  d = d.replace(/^0+/, '').replace(/^9(?=\d{10})/, ''); // el 9 de los celulares
  d = d.replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2'); // el 15 viejo de los celulares
  if (d.length === 6) d = `2266${d}`;              // sin característica: es de Balcarce
  if (d.length < 10 || d.length > 11) return null;
  const area = d.length === 10 ? d.slice(0, 4) : d.slice(0, 4);
  const resto = d.slice(area.length);
  return `+54 ${area} ${resto.length === 6 ? `${resto.slice(0, 2)}-${resto.slice(2)}` : resto}`;
}

/** Un usuario o una dirección de red social, como dirección completa. */
export function direccionDeRed(red, valor) {
  const v = String(valor ?? '').trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v.replace(/[?#].*$/, '').replace(/\/$/, '');
  const usuario = v.replace(/^@/, '').replace(/\/$/, '');
  const base = { instagram: 'https://www.instagram.com/', facebook: 'https://www.facebook.com/', tiktok: 'https://www.tiktok.com/@', x: 'https://x.com/' }[red];
  return base ? `${base}${usuario}` : null;
}

const web = (v) => {
  const s = String(v ?? '').trim();
  if (!s) return null;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
};

/**
 * Una ficha a partir de un elemento de OpenStreetMap, o null si no sirve
 * (sin nombre, o algo que no es un negocio).
 */
export function desdeOSM(el, ahora = new Date()) {
  const t = el.tags ?? {};
  const nombre = String(t.name ?? t.brand ?? '').trim();
  if (!nombre) return null;
  const { rubro, tipo } = rubroDe(t);
  const lat = el.lat ?? el.center?.lat ?? null;
  const lon = el.lon ?? el.center?.lon ?? null;
  const calle = t['addr:street'] ?? null;
  const numero = t['addr:housenumber'] ?? null;
  const tel = normalizarTelefono(t.phone ?? t['contact:phone'] ?? t['contact:mobile']);
  const cierre = Object.keys(t).some((k) => /^(disused|abandoned|was):/.test(k)) || t.opening_hours === 'off';

  return {
    id: `osm-${el.type[0]}${el.id}`,
    nombre,
    rubro,
    tipo,
    direccion: { calle, numero, texto: [calle, numero].filter(Boolean).join(' ') || null },
    ubicacion: lat != null ? { lat: Number(lat.toFixed(6)), lon: Number(lon.toFixed(6)) } : null,
    contacto: {
      telefono: tel,
      whatsapp: null,
      email: t.email ?? t['contact:email'] ?? null,
      web: web(t.website ?? t['contact:website']),
    },
    redes: {
      instagram: direccionDeRed('instagram', t['contact:instagram'] ?? t.instagram),
      facebook: direccionDeRed('facebook', t['contact:facebook'] ?? t.facebook),
      tiktok: null,
    },
    horarios: t.opening_hours ?? null,
    fuentes: [{
      tipo: 'osm', id: `${el.type}/${el.id}`, url: `https://www.openstreetmap.org/${el.type}/${el.id}`,
      visto: ahora.toISOString(), editadoEnOSM: el.timestamp ?? null,
    }],
    vigencia: {
      estado: cierre ? 'cerrado' : 'sin-verificar', puntaje: null, ultimaVerificacion: null, senales: cierre ? ['marcado como cerrado en OpenStreetMap'] : [],
    },
    comercial: { nivel: 'basico', contactado: false, confirmadoPorElComercio: false, notas: '' },
    creado: ahora.toISOString(),
    actualizado: ahora.toISOString(),
  };
}

/** Cuánta información útil tiene la ficha, de 0 a 100. Sirve para saber cuáles
 *  hay que completar primero. */
export function completitud(f) {
  const puntos = [
    [!!f.nombre, 10], [f.rubro && f.rubro !== 'Otros', 10], [!!f.direccion?.texto, 20], [!!f.ubicacion, 10],
    [!!f.contacto?.telefono || !!f.contacto?.whatsapp, 20], [!!f.horarios, 10],
    [!!(f.redes?.instagram || f.redes?.facebook || f.contacto?.web), 20],
  ];
  return puntos.reduce((s, [ok, p]) => s + (ok ? p : 0), 0);
}
