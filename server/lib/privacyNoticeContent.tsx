import {
  APP_NAME,
  PRIVACY_NOTICE_LAST_UPDATED,
  privacyContactEmail,
} from './encoreConfig';

export type PrivacySection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type PrivacyDocument = {
  lang: 'es' | 'en';
  pageTitle: string;
  lastUpdatedLabel: string;
  sections: PrivacySection[];
};

const contact = privacyContactEmail();

export function getPrivacyDocument(locale: 'es' | 'en'): PrivacyDocument {
  if (locale === 'en') {
    return {
      lang: 'en',
      pageTitle: `${APP_NAME} — Privacy notice`,
      lastUpdatedLabel: `Last updated: ${PRIVACY_NOTICE_LAST_UPDATED}`,
      sections: [
        {
          title: 'Who is responsible',
          paragraphs: [
            `${APP_NAME} is responsible for processing your personal data under this notice.`,
            `Contact: ${contact}`,
          ],
        },
        {
          title: 'Data we collect',
          paragraphs: ['We collect only what we need to run the app:'],
          bullets: [
            'Account email and display name.',
            'Artists you follow and mark as favorites.',
            'Shows you mark (going, interested, attended), ratings, notes, and confirmed setlists.',
            'Identifiers of photos and videos you choose from your camera roll (files never leave your phone).',
            'Playlists you choose to share with the community.',
          ],
        },
        {
          title: 'What we do not collect',
          paragraphs: ['We do not use your device location.'],
        },
        {
          title: 'Why we use your data',
          paragraphs: [
            'To operate the app, show your personal stats, and build your year-in-review recap.',
            'We do not sell your data and we do not show advertising.',
          ],
        },
        {
          title: 'Service providers',
          paragraphs: ['We rely on these providers to run Encore:'],
          bullets: [
            'Supabase (database and accounts).',
            'Railway (API server hosting).',
            'Expo (over-the-air app updates).',
            'Lookup services: setlist.fm, MusicBrainz, LRCLIB (lyrics), OpenStreetMap/Nominatim (venue geocoding), Apple Music (artist images and links).',
          ],
        },
        {
          title: 'What other users see',
          paragraphs: [
            'Other users only see your display name on community playlists you share, and anonymous attendance counts (for example, how many people marked “going”).',
          ],
        },
        {
          title: 'Your rights (access, correction, deletion, objection)',
          paragraphs: [
            `You may exercise your rights by emailing ${contact}.`,
            'You can delete your account from Settings in the app; this removes all of your data from our systems.',
          ],
        },
        {
          title: 'Minimum age',
          paragraphs: ['You must be at least 18 years old to use Encore.'],
        },
        {
          title: 'Changes',
          paragraphs: [
            'We may update this notice. We will publish the new version on this page with an updated date.',
          ],
        },
      ],
    };
  }

  return {
    lang: 'es',
    pageTitle: `${APP_NAME} — Aviso de privacidad`,
    lastUpdatedLabel: `Última actualización: ${PRIVACY_NOTICE_LAST_UPDATED}`,
    sections: [
      {
        title: 'Responsable',
        paragraphs: [
          `${APP_NAME} es responsable del tratamiento de tus datos personales conforme a este aviso.`,
          `Contacto: ${contact}`,
        ],
      },
      {
        title: 'Datos que recabamos',
        paragraphs: ['Solo recabamos lo necesario para operar la app:'],
        bullets: [
          'Correo y nombre visible de tu cuenta.',
          'Artistas que sigues y marcas como favoritos.',
          'Conciertos que marcas (voy, me interesa, fui), calificaciones, notas y setlists confirmados.',
          'Identificadores de fotos y videos del carrete que tú eliges (los archivos nunca salen de tu teléfono).',
          'Playlists que decides compartir con la comunidad.',
        ],
      },
      {
        title: 'Lo que no recabamos',
        paragraphs: ['No usamos la ubicación de tu dispositivo.'],
      },
      {
        title: 'Para qué usamos tus datos',
        paragraphs: [
          'Para el funcionamiento de la app, tus estadísticas personales y tu recap anual.',
          'No vendemos tus datos ni mostramos publicidad.',
        ],
      },
      {
        title: 'Proveedores',
        paragraphs: ['Usamos estos proveedores para operar Encore:'],
        bullets: [
          'Supabase (base de datos y cuentas).',
          'Railway (servidor de la API).',
          'Expo (actualizaciones de la app).',
          'Servicios de consulta: setlist.fm, MusicBrainz, LRCLIB (letras), OpenStreetMap/Nominatim (ubicación de recintos), Apple Music (imágenes y enlaces de artistas).',
        ],
      },
      {
        title: 'Qué ven otros usuarios',
        paragraphs: [
          'Solo ven tu nombre visible en las playlists comunitarias que compartes y conteos anónimos de asistencia (por ejemplo, cuántas personas marcaron «voy»).',
        ],
      },
      {
        title: 'Derechos ARCO',
        paragraphs: [
          `Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición escribiendo a ${contact}.`,
          'Puedes borrar tu cuenta desde Ajustes en la app; eso elimina todos tus datos de nuestros sistemas.',
        ],
      },
      {
        title: 'Edad mínima',
        paragraphs: ['Debes tener al menos 18 años para usar Encore.'],
      },
      {
        title: 'Cambios',
        paragraphs: [
          'Podemos actualizar este aviso. Publicaremos la nueva versión en esta página con la fecha correspondiente.',
        ],
      },
    ],
  };
}
