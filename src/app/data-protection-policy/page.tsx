
"use client";

import type React from 'react';
import AppLayout from '@/layout/AppLayout';
import { FileText, Landmark } from 'lucide-react'; // Using Landmark as an example for legal/policy

const DataProtectionPolicyContent = () => {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12 lg:py-16 max-w-3xl">
      <div className="flex flex-col items-center text-center mb-8">
        <FileText className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          Política de Protección de Datos (Ley 1581 de 2012)
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Comprometidos con la protección de tus datos personales.
        </p>
      </div>
      <div className="prose prose-sm sm:prose-base lg:prose-lg max-w-none text-foreground/80 bg-card p-6 rounded-lg shadow">
        <p>
          De conformidad con lo dispuesto en la Ley Estatutaria 1581 de 2012 y su Decreto Reglamentario 1377 de 2013,
          Sportoffice adopta la presente política para el tratamiento de datos personales, la cual será informada
          a todos los titulares de los datos recolectados o que en el futuro se obtengan en el ejercicio de las
          actividades comerciales, culturales o laborales.
        </p>
        <h2 className="text-xl font-semibold mt-6 mb-3 text-foreground">Responsable del Tratamiento</h2>
        <p>
          Sportoffice, con domicilio en [Tu Ciudad, Colombia], correo electrónico [tu@correo.com] y teléfono [Tu Número de Teléfono],
          será el responsable del tratamiento de los datos personales.
        </p>
        <h2 className="text-xl font-semibold mt-6 mb-3 text-foreground">Finalidad del Tratamiento de Datos</h2>
        <p>
          Los datos personales que Sportoffice recolecta y almacena son utilizados para las siguientes finalidades:
        </p>
        <ul>
          <li>Ejecutar la relación contractual existente con sus clientes, proveedores y trabajadores, incluida el pago de obligaciones contractuales.</li>
          <li>Proveer los servicios y/o los productos requeridos por sus usuarios.</li>
          <li>Informar sobre nuevos productos o servicios y/o sobre cambios en los mismos.</li>
          <li>Evaluar la calidad del servicio.</li>
          <li>Realizar estudios internos sobre hábitos de consumo.</li>
          <li>Enviar al correo físico, electrónico, celular o dispositivo móvil, vía mensajes de texto (SMS y/o MMS) o a través de cualquier otro medio análogo y/o digital de comunicación creado o por crearse, información comercial, publicitaria o promocional sobre los productos y/o servicios, eventos y/o promociones de tipo comercial o no de estas, con el fin de impulsar, invitar, dirigir, ejecutar, informar y de manera general, llevar a cabo campañas, promociones o concursos de carácter comercial o publicitario, adelantados por Sportoffice y/o por terceras personas.</li>
          <li>Desarrollar el proceso de selección, evaluación, y vinculación laboral.</li>
          <li>Soportar procesos de auditoría interna o externa.</li>
        </ul>
        <h2 className="text-xl font-semibold mt-6 mb-3 text-foreground">Derechos de los Titulares</h2>
        <p>
          Como titular de sus datos personales Usted tiene derecho a:
        </p>
        <ul>
          <li>Acceder en forma gratuita a los datos proporcionados que hayan sido objeto de tratamiento.</li>
          <li>Conocer, actualizar y rectificar su información frente a datos parciales, inexactos, incompletos, fraccionados, que induzcan a error, o aquellos cuyo tratamiento esté expresamente prohibido o no haya sido autorizado.</li>
          <li>Solicitar prueba de la autorización otorgada.</li>
          <li>Presentar ante la Superintendencia de Industria y Comercio (SIC) quejas por infracciones a lo dispuesto en la normatividad vigente.</li>
          <li>Revocar la autorización y/o solicitar la supresión del dato, siempre que no exista un deber legal o contractual que impida eliminarlos.</li>
          <li>Abstenerse de responder las preguntas sobre datos sensibles. Tendrá carácter facultativo las respuestas que versen sobre datos sensibles o sobre datos de las niñas y niños y adolescentes.</li>
        </ul>
        <p className="mt-6">
          Esta es una política de protección de datos de ejemplo basada en la legislación colombiana.
          Debes consultar con un asesor legal para asegurar el cumplimiento y reemplazar este texto con tu política real y completa.
          Asegúrate de incluir información sobre cómo los usuarios pueden ejercer sus derechos (canales de atención, procedimientos, etc.).
        </p>
      </div>
    </div>
  );
};

const DataProtectionPolicyPage = () => {
  return (
    <AppLayout>
      <DataProtectionPolicyContent />
    </AppLayout>
  );
};

export default DataProtectionPolicyPage;
