
/**
 * Representa un listado de servicio con detalles como descripción, tarifas y disponibilidad.
 */
export interface ServiceListing {
  /**
   * El identificador único para el listado de servicio.
   */
  id: string;
  /**
   * El título o nombre del servicio.
   */
  title: string;
  /**
   * Una descripción detallada del servicio.
   */
  description: string;
  /**
   * La tarifa por hora o fija del servicio.
   */
  rate: number;
  /**
   * Un objeto donde la clave es el número del día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado)
   * y el valor es un array de strings con las horas disponibles para ese día.
   * Ejemplo: { 1: ["09:00", "10:00"], 2: ["14:00"] }
   */
  availability: Record<number, string[]>;
  /**
   * La categoría del servicio (e.g., 'Fitness', 'Tutoría', 'Mantenimiento del Hogar').
   */
  category: string;
  /**
   * La ubicación donde se provee el servicio.
   */
  location: string;
  /**
   * Optional URL for the service image.
   */
  imageUrl?: string;
  /**
   * Optional AI hint for the main service image.
   */
  dataAiHint?: string;
  /**
   * Optional array of URLs for a service image carousel.
   */
  imageUrls?: string[];
  /**
   * Optional text or link to the service policy.
   */
  policyText?: string;
   /**
    * Optional name of the professional offering the service.
    */
   professionalName?: string;
   /**
    * Optional avatar URL for the professional offering the service.
    */
   professionalAvatar?: string;
   /**
    * Optional rating of the service, typically out of 5.
    */
   rating?: number;
   /**
    * Optional phone number for the service provider.
    */
   phone?: string;
   /**
    * Optional WhatsApp number for the service provider.
    */
   whatsapp?: string;
}

/**
 * Asynchronously retrieves service listings based on specified criteria.
 *
 * @param category Optional category to filter service listings.
 * @param location Optional location to filter service listings.
 * @returns A promise that resolves to an array of ServiceListing objects.
 */

//datos de servicio 
export async function getServiceListings(category?: string, location?: string): Promise<ServiceListing[]> {
  // Placeholder data, incluyendo nueva estructura para availability
  return [
    {
      id: '2',
      title: 'Desarrollo Web Frontend',
      description: 'Creación de interfaces de usuario interactivas y responsivas para tu sitio web. Utilizamos las últimas tecnologías para asegurar una experiencia de usuario óptima en todos los dispositivos.',
      rate: 75000,
      availability: { // 0:Dom, 1:Lun, 2:Mar, 3:Mie, 4:Jue, 5:Vie, 6:Sab
       
        1: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'], // Lunes
        2: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'], // Martes
        3: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'], // Miércoles
        4: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'], // Jueves
        5: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'], // Viernes
        6: ['10:00', '11:00', '12:00', '13:00', '14:00','15:00']  // Sábado
      
      },
      category: 'Tecnología',
      location: 'Remoto',
      imageUrl: 'https://i.ibb.co/RTqtCwHP/96df4a87-dcb2-43be-bc13-6923c168f9e5.png',
      dataAiHint: 'web development code',
      imageUrls: [
         'https://i.ibb.co/Rps45zCy/Leonardo-Phoenix-09-A-modern-and-sleek-illustration-of-a-devel-3.png',
        'https://i.ibb.co/QFLtz57r/mo.png',
        'https://i.ibb.co/pB092SQq/themes-light.png',
       
      ],
      policyText: "Todos los proyectos de desarrollo web requieren un depósito inicial del 50%. El saldo restante se abona al finalizar y entregar el proyecto.",
      professionalName: "Carlos Rodriguez",
      professionalAvatar: "https://i.ibb.co/93cr9Rjd/avatar.webp",
      rating: 4.7,
      phone: "+573001234567",
      whatsapp: "+573011234567",
    },
     {
      id: '3',
      title: 'Entrenamiento Fitness Personalizado',
      description: 'Planes personalizados para tus objetivos de fitness. Sesiones individuales/grupales.', // Descripción actualizada
      rate: 50000,
      availability: {
        0: ['07:00', '10:00', '14:00'],
        1: ['07:00', '08:00', '09:00', '17:00', '18:00', '19:00'],
        2: ['07:00', '08:00', '09:00', '17:00', '18:00', '19:00'],
        3: ['07:00', '08:00', '09:00', '17:00', '18:00', '19:00'],
        4: ['07:00', '08:00', '09:00', '17:00', '18:00', '19:00'],
        5: ['07:00', '08:00', '09:00', '16:00', '17:00'],
        6: ['08:00', '09:00', '10:00', '11:00', '12:00'],
        7: ['08:00', '09:00', '10:00', '11:00', '12:00','13:00']
        
      },
      category: 'Entrenador Personal',
      location: ', Bogotá',
      imageUrl: 'https://i.ibb.co/RpPLR1vt/Leonardo-Phoenix-09-A-vibrant-and-energetic-advertisement-feat-1.png', // Imagen actualizada
      dataAiHint: 'personal training workout', // dataAiHint actualizado
      imageUrls: [
        'https://i.ibb.co/wZj4qtGK/mmm.png',
         'https://i.ibb.co/3m0y7wt4/AQM2x-Ko-LJPMZr-Ko2k-ALAA4rhc5-f-Ti-W-ZDWvdn-G9cczj-FZkqzuzqzone-Dqfp9-IOg7s-EE-At-QCJioy9-X77t-POd4.png',
         'https://i.ibb.co/jkHPJQKG/entrenador-personal-parque-blanco-mujer.jpg',
         'https://i.ibb.co/1frfwV64/entrenador-personal-ejercicio-parque-nocturnal-scene-cold-1.png'
      ],
      policyText: "Las sesiones deben cancelarse con al menos 24 horas de anticipación. Traer toalla y agua.",
      professionalName: "Ana García",
      professionalAvatar: "https://i.ibb.co/N6SpfDfB/Captura-de-pantalla-2025-05-21-190103.png",
      rating: 4.9,
      phone: "+573112345678", // Teléfono actualizado
      whatsapp: "+573112345678",
    },
    {
      id: '4',
      title: 'Servicios de Contratista General',
      description: 'Remodelaciones, reparaciones y construcciones menores para su hogar o negocio. Contamos con un equipo de profesionales para garantizar trabajos de calidad.',
      rate: 80000,
      availability: {
        0: [], // Domingo no disponible
        1: ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00','17:00'], // Lunes
        2: ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00','17:00'], // Martes
        3: ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00','17:00'], // Miércoles
        4: ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00','17:30'], // Jueves
        5: ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'], // Viernes
        6: ['08:00', '10:00', '11:00',  '14:00'] // Sábado 
      },
      category: 'Contratista',
      location: 'Bogotá y Alrededores, Colombia',
      imageUrl: 'https://i.ibb.co/mCnBdjcd/reparaciones-el-ctricas-hogar.png',
      dataAiHint: 'Contratista general',
      imageUrls: [
        'https://i.postimg.cc/g2Nkp1f4/av1.png',
        'https://i.ibb.co/4gTvdn1J/Leonardo-Phoenix-10-A-colorful-advertisement-for-a-general-con-1.png'

      ],
      policyText: "Todos los presupuestos son gratuitos y sin compromiso. Los materiales no están incluidos en la tarifa horaria a menos que se especifique.",
       professionalName: "Javier Gomez",
       professionalAvatar: "https://i.postimg.cc/g2Nkp1f4/av1.png",
       rating: 4.5,
       phone: "+573201112233",
    },
    {
      id: '5',
      title: 'Mantenimiento y Reparación del Hogar',
      description: 'Servicios de plomería, electricidad, pintura y reparaciones generales. Soluciones rápidas y eficientes para mantener tu hogar en perfectas condiciones.',
      rate: 55000,
      availability: {
        1: [ '11:00', '12:00', '14:00', '15:00', '16:00','17:00'], // Lunes
        2: ['08:00',  '11:00', '12:00', '14:00', '15:00', '16:00','17:00'], // Martes
        3: [ '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00','17:00'], // Miércoles
        4: ['08:00', '09:00', '10:00', '11:00', '12:00', '15:00'], // Jueves
        5: ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'], // Viernes
        6: ['09:00',  '10:00', '11:00', '12:00', '14:00'],
          // Sábado
      },
      category: 'Mantenimiento Hogar',
      location: 'Bogotá, Colombia',
      imageUrl: 'https://i.postimg.cc/7YgZsKwP/pixlr-image-generator-96da65f0-4a47-4b00-9abb-a5e360b9c1d3.png',
      dataAiHint: 'home repair tools',
      imageUrls: [
        'https://i.ibb.co/1G7n2gYx/mantenimiento-del-hogar-daylight-scene-bright-volumetric-1.png',
        'https://i.postimg.cc/j2tFsqwF/mantenimiento-del-hogar-arreglar-daylight-scene.png',
        'https://i.postimg.cc/J0pPMNWs/mkkk.png'


      ],
      policyText: "Garantía de 30 días en todas las reparaciones realizadas. Las visitas de emergencia fuera de horario pueden tener un costo adicional.",
       professionalName: "Repara Hogar Rápido",
       professionalAvatar: "https://i.ibb.co/93cr9Rjd/avatar.webp",
       rating: 4.6,
       phone: "+573157778899",
       whatsapp: "+573157778899",
    },
    {
      id: '6',
      title: 'Clases Particulares de Matemáticas',
      description: 'Apoyo escolar y preparación para exámenes de matemáticas, nivel secundario y universitario. Metodología adaptada al ritmo de aprendizaje de cada estudiante.',
      rate: 40000,
      availability: {
        0: [],
        1: ['9:00','12:00','15:00'],
        2: ['16:00', '17:00'], // Martes
        3: ['7:00','12:00'],
        4: ['17:00', '18:00'],  // Jueves
        5: ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'],
        6: ['10:00','14:00']
      },
      category: 'Profesores',
      location: 'Remoto',
      imageUrl: 'https://i.ibb.co/SzBqkXT/clases-particulares-de-matem-ticas-personalizado-1.png',
      dataAiHint: 'math tutoring class',
      imageUrls: [
        'https://i.ibb.co/chR5qV9P/clases-particulares-de-matem-ticas-personalizado-3.png',
        'https://i.ibb.co/4q60ccP/clases-particulares-de-matem-ticas-personalizado-2.png'


      ],
      policyText: "Se requiere el pago por adelantado de paquetes de clases. Las cancelaciones deben realizarse con al menos 12 horas de anticipación.",
       professionalName: "Elena Martínez",
       professionalAvatar: "https://i.ibb.co/230p1ZSw/mi.png",
       rating: 4.9,
    },
     {
      id: '7',
      title: 'Diseño Gráfico',
      description: 'Creación de logotipos, identidad visual, materiales de marketing y más. Ayudamos a tu marca a destacar con diseños creativos y profesionales.',
      rate: 65000,
      availability: {
        0: [],
        1: ['10:00', '11:00', '12:00'], // Lunes
        2: ['10:00', '11:00', '12:00'],
        3: ['14:00', '15:00', '16:00'],  // Miércoles
        4: ['8:00', '15:00', '16:00'],
        5: ['10:00', '15:00', '16:00', ],
        6: ['9:00','14:30']
      },
      category: 'Diseñadores',
      location: 'Remoto',
      imageUrl: 'https://i.ibb.co/zHGTXWqj/dise-o-gr-fico-mujer.png',
      dataAiHint: 'graphic design logo',
      imageUrls: [
        'https://placehold.co/800x600.png',
        'https://i.ibb.co/cc2yCzq9/mm.png',
        'https://i.ibb.co/jv02T2bm/iiii.png',
        'https://i.ibb.co/SZyJ1jR/mil.png',
      ],
      policyText: "Cada proyecto incluye hasta 2 rondas de revisión. Revisiones adicionales pueden incurrir en costos extra.",
       professionalName: "Sofía Creativa",
       professionalAvatar: "https://i.ibb.co/hJL2jJq9/ooo.png",
       rating: 5.0,
       whatsapp: "+573051234567"
    },
    {
      id: '8',
      title: 'Protección Personal y Seguridad Estratégica',
      description: 'Evaluación de riesgos, seguridad privada, protección ejecutiva y asesoría en manejo seguro de altos patrimonios. Ideal para personas con alta exposición económica o mediática.',
      rate: 150000, // mayor valor acorde a un servicio de seguridad privada
      availability: {
        1: ['9:00','12:00', '15:00','18:00 '],
        2: ['9:00','12:00', '15:00','18:00 '],
        3: ['9:00','18:00'],
        4: ['9:00','12:00', '15:00','18:00 '],
        5: ['9:00','12:00', '15:00','18:00 '],
        6: ['7:00','9:00','12:00', '15:00','17:30 ']
      },

      category: 'Seguridad',
      location: ' Presencial , Bogota',
      imageUrl: 'https://i.ibb.co/Y9DyBxj/mm88.png',
      dataAiHint: 'protección personal riesgo seguridad patrimonial',
      policyText: "La seguridad es una inversión crítica para quienes poseen grandes activos. Nuestros servicios requieren una evaluación previa y acuerdo de confidencialidad debe contacto el especialita lugar el servisio",
      professionalName: "Fortaleza Privada S.A.S.",
      professionalAvatar: "https://i.ibb.co/ycSxRwSk/mmi.png",
      rating: 4.8,
      phone: "+573189990000",
      whatsapp: "+573189990000"
    }
    
  ];
}

// New function to get a service by ID
export async function getServiceById(id: string): Promise<ServiceListing | undefined> {
  const listings = await getServiceListings(); // Reuse existing function
  return listings.find(listing => listing.id === id);
}
