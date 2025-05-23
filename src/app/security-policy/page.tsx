
"use client";

import type React from 'react';
import AppLayout from '@/layout/AppLayout';
import { ShieldCheck, FileText } from 'lucide-react';

const SecurityPolicyContent = () => {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12 lg:py-16 max-w-3xl">
      <div className="flex flex-col items-center text-center mb-8">
        <ShieldCheck className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          Política de Seguridad
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Su seguridad es importante para nosotros.
        </p>
      </div>
      <div className="prose prose-sm sm:prose-base lg:prose-lg max-w-none text-foreground/80 bg-card p-6 rounded-lg shadow">
        <p>
          En Sportoffice, nos comprometemos a proteger la seguridad de tu información y de nuestra plataforma.
          Implementamos una variedad de medidas de seguridad para mantener la seguridad de tu información personal
          cuando realizas una transacción o ingresas, envías o accedes a tu información personal.
        </p>
        <h2 className="text-xl font-semibold mt-6 mb-3 text-foreground">Recopilación de Información</h2>
        <p>
          Recopilamos información tuya cuando te registras en nuestro sitio, realizas un pedido, te suscribes a
          nuestro boletín o completas un formulario.
        </p>
        <h2 className="text-xl font-semibold mt-6 mb-3 text-foreground">Uso de la Información</h2>
        <p>
          Cualquier información que recopilamos de ti puede ser utilizada de una de las siguientes maneras:
        </p>
        <ul>
          <li>Para personalizar tu experiencia.</li>
          <li>Para mejorar nuestro sitio web.</li>
          <li>Para mejorar el servicio al cliente.</li>
          <li>Para procesar transacciones.</li>
          <li>Para administrar un concurso, promoción, encuesta u otra característica del sitio.</li>
        </ul>
        <h2 className="text-xl font-semibold mt-6 mb-3 text-foreground">Protección de la Información</h2>
        <p>
          Implementamos una variedad de medidas de seguridad para mantener la seguridad de tu información personal.
          Ofrecemos el uso de un servidor seguro. Toda la información sensible/crédito suministrada se transmite
          mediante la tecnología Secure Socket Layer (SSL) y luego se encripta en nuestra base de datos de proveedores
          de pasarelas de pago solo para que sea accesible por aquellos autorizados con derechos de acceso especiales
          a dichos sistemas, y se les exige que mantengan la información confidencial.
        </p>
        <h2 className="text-xl font-semibold mt-6 mb-3 text-foreground">Cookies</h2>
        <p>
          Sí, utilizamos cookies (pequeños archivos que un sitio o su proveedor de servicios transfiere al disco duro
          de tu computadora a través de tu navegador web (si lo permites) que permiten a los sitios o sistemas
          proveedores de servicios reconocer tu navegador y capturar y recordar cierta información).
        </p>
        <h2 className="text-xl font-semibold mt-6 mb-3 text-foreground">Divulgación a Terceros</h2>
        <p>
          No vendemos, intercambiamos ni transferimos de ninguna otra manera a terceros tu información de identificación personal.
          Esto no incluye a terceros de confianza que nos ayudan a operar nuestro sitio web, llevar a cabo nuestro negocio o
          servirte, siempre y cuando esas partes acuerden mantener esta información confidencial.
        </p>
        <p className="mt-6">
          Esta es una política de seguridad de ejemplo. Deberías reemplazar este texto con tu política de seguridad real.
        </p>
      </div>
    </div>
  );
};

const SecurityPolicyPage = () => {
  return (
    <AppLayout>
   <SecurityPolicyContent />
    </AppLayout>
  );
};

export default SecurityPolicyPage;
