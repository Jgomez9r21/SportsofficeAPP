// components/Footer.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button"; // Asegúrate de que este sea el path correcto

const Footer = () => {
  return (
    <footer className="border-t bg-background p-4 text-center text-xs text-muted-foreground mt-auto flex-shrink-0">
      <div className="container mx-auto flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4">
        <Link href="/security-policy" passHref>
          <Button variant="link" className="p-0 h-auto text-xs text-muted-foreground hover:text-primary">
            Política de Seguridad
          </Button>
        </Link>
        <Link href="/data-protection-policy" passHref>
          <Button variant="link" className="p-0 h-auto text-xs text-muted-foreground hover:text-primary">
            Protección de Datos (Ley 1581 de 2012)
          </Button>
        </Link>
      </div>
      <p className="mt-2">© {new Date().getFullYear()} Sportoffice. Todos los derechos reservados.</p>
    </footer>
  );
};

export default Footer;
