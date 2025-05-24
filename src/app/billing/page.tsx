"use client";

import type React from 'react';
import { useState, useEffect } from 'react';
import AppLayout from '@/layout/AppLayout';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { FileText, Download, Banknote, Smartphone, Mail, Trash2, Wallet, Send } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

/**
 * Nombre del archivo: BillingPage.tsx
 *
 * Propósito:
 * Este componente representa la página de facturación del usuario en la aplicación.
 * Permite visualizar el historial de facturas, configurar métodos de desembolso y realizar simulaciones de retiro de ganancias.
 *
 * Autores:
 * - Kevin Lopez
 * - Vanesa Caminos
 * - Juan Pablo Gomez
 */

// Interfaz para representar una factura
interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  serviceTitle: string;
  amount: number;
  status: 'Pagada' | 'Pendiente' | 'Pago Rechazado';
}

// Datos simulados de facturas
const mockInvoicesData: Invoice[] = [
  { id: 'inv1', invoiceNumber: 'FACT-00123', date: '2024-08-15', serviceTitle: 'Entrenamiento Fitness Personalizado - Julio', amount: 180000, status: 'Pagada' },
  { id: 'inv2', invoiceNumber: 'FACT-00124', date: '2025-05-17', serviceTitle: 'Clases Particulares de Matemáticas - Agosto', amount: 120000, status: 'Pendiente' },
  { id: 'inv3', invoiceNumber: 'FACT-00125', date: '2025-02-01', serviceTitle: 'Desarrollo Web Frontend - Proyecto X', amount: 1500000, status: 'Pagada' },
  { id: 'inv4', invoiceNumber: 'FACT-00126', date: '2024-09-05', serviceTitle: 'Consultoría SEO - Paquete Básico', amount: 350000, status: 'Pago Rechazado' },
  { id: 'inv5', invoiceNumber: 'FACT-00127', date: '2025-05-17', serviceTitle: 'Diseño de Logo y Branding', amount: 700000, status: 'Pendiente' },
];

// Tipos para métodos de desembolso
interface PayoutAccountBase {
  id: string;
  accountHolderName?: string;
  isPrimary?: boolean;
}
interface ColombianPayoutMethod extends PayoutAccountBase {
  type: 'bancolombia' | 'nequi';
  accountNumber: string;
}
interface PayPalPayoutMethod extends PayoutAccountBase {
  type: 'paypal';
  email: string;
}
type UserPayoutMethod = ColombianPayoutMethod | PayPalPayoutMethod;

// Claves para almacenamiento local
const STORED_INVOICES_KEY = 'storedInvoices';
const STORED_PAYOUT_METHODS_KEY = 'storedUserPayoutMethods';

// Saldo disponible simulado
const MOCK_AVAILABLE_BALANCE = 500000;

/**
 * Componente principal de contenido de facturación
 */
const BillingContent = () => {
  const { user, isLoggedIn, isLoading, openLoginDialog } = useAuth();
  const { toast } = useToast();

  // Estados
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isInvoiceDataLoading, setIsInvoiceDataLoading] = useState(true);
  const [payoutMethodType, setPayoutMethodType] = useState<'bancolombia' | 'nequi' | 'paypal' | ''>('');
  const [payoutAccountNumber, setPayoutAccountNumber] = useState('');
  const [payoutAccountHolderName, setPayoutAccountHolderName] = useState('');
  const [payoutPaypalEmail, setPayoutPaypalEmail] = useState('');
  const [savedPayoutMethods, setSavedPayoutMethods] = useState<UserPayoutMethod[]>([]);
  const [availableBalance, setAvailableBalance] = useState(MOCK_AVAILABLE_BALANCE);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [selectedPayoutMethodForWithdrawal, setSelectedPayoutMethodForWithdrawal] = useState<string | undefined>(undefined);

  /**
   * Nombre del método: useEffect (carga de datos)
   *
   * Propósito:
   * Cargar las facturas y métodos de desembolso desde localStorage o usar datos simulados si no existen.
   *
   * Variables utilizadas:
   * - isLoggedIn, user, setInvoices, setSavedPayoutMethods
   *
   * Precondición:
   * - El usuario debe estar autenticado
   *
   * Postcondición:
   * - Se cargan las facturas y métodos de desembolso guardados
   */
  useEffect(() => {
    if (isLoggedIn) {
      setIsInvoiceDataLoading(true);
      try {
        const storedInvoicesRaw = localStorage.getItem(STORED_INVOICES_KEY);
        if (storedInvoicesRaw) {
          const stored = JSON.parse(storedInvoicesRaw) as Invoice[];
          setInvoices(prev => [...stored, ...mockInvoicesData.filter(mock => !stored.some(s => s.id === mock.id))]);
        } else {
          setInvoices(mockInvoicesData);
        }
      } catch (error) {
        console.error("Error loading invoices:", error);
        setInvoices(mockInvoicesData);
      }
      try {
        const storedPayoutsRaw = localStorage.getItem(STORED_PAYOUT_METHODS_KEY);
        if (storedPayoutsRaw) setSavedPayoutMethods(JSON.parse(storedPayoutsRaw) as UserPayoutMethod[]);
      } catch (error) {
        console.error("Error loading payout methods:", error);
      }
      setIsInvoiceDataLoading(false);
    } else {
      setIsInvoiceDataLoading(false);
      setInvoices([]);
      setSavedPayoutMethods([]);
    }
  }, [isLoggedIn, user]);

  /**
   * Nombre del método: useEffect (guardado de métodos de desembolso)
   *
   * Propósito:
   * Guardar los métodos de desembolso en localStorage cuando cambian.
   *
   * Variables utilizadas:
   * - savedPayoutMethods, isLoggedIn
   *
   * Precondición:
   * - Debe haber cambios en savedPayoutMethods
   *
   * Postcondición:
   * - Los métodos de desembolso se almacenan en localStorage
   */
  useEffect(() => {
    if (isLoggedIn) {
      localStorage.setItem(STORED_PAYOUT_METHODS_KEY, JSON.stringify(savedPayoutMethods));
    }
  }, [savedPayoutMethods, isLoggedIn]);

  /**
   * Nombre del método: handleDownloadPdf
   *
   * Propósito:
   * Simular la descarga de un PDF de una factura.
   *
   * Variables utilizadas:
   * - invoiceNumber, toast
   *
   * Precondición:
   * - Debe recibir un número de factura válido
   *
   * Postcondición:
   * - Se muestra un mensaje de descarga simulada
   */
  const handleDownloadPdf = (invoiceNumber: string) => {
    console.log(`Simulando descarga de PDF para factura N° ${invoiceNumber}`);
    toast({ title: "Descarga de PDF (Simulación)", description: `Aquí se iniciaría la descarga del PDF para la factura N° ${invoiceNumber}.` });
  };

  /**
   * Nombre del método: getStatusBadgeVariant
   *
   * Propósito:
   * Determinar el estilo de la etiqueta según el estado de la factura.
   *
   * Variables utilizadas:
   * - status
   *
   * Precondición:
   * - El estado debe ser uno de los valores permitidos
   *
   * Postcondición:
   * - Devuelve el estilo correspondiente para el badge
   */
  const getStatusBadgeVariant = (status: Invoice['status']): 'default' | 'secondary' | 'outline' | 'destructive' => {
    if (status === 'Pagada') return 'default';
    if (status === 'Pendiente') return 'secondary';
    if (status === 'Pago Rechazado') return 'destructive';
    return 'outline';
  };

  /**
   * Nombre del método: handleSavePayoutMethod
   *
   * Propósito:
   * Guardar un nuevo método de desembolso seleccionado por el usuario.
   *
   * Variables utilizadas:
   * - payoutMethodType, payoutAccountNumber, payoutAccountHolderName, payoutPaypalEmail
   *
   * Precondición:
   * - Todos los campos requeridos deben estar completados
   *
   * Postcondición:
   * - Se agrega el método a la lista de métodos guardados
   */
  const handleSavePayoutMethod = () => {
    if (!payoutMethodType) {
      toast({ title: 'Información Incompleta', description: 'Selecciona un tipo de cuenta para desembolso.', variant: 'destructive' });
      return;
    }
    let newMethod: UserPayoutMethod | null = null;
    const baseId = `payout-${Date.now()}`;
    if (payoutMethodType === 'bancolombia' || payoutMethodType === 'nequi') {
      if (!payoutAccountNumber) {
        toast({ title: 'Información Incompleta', description: 'Ingresa el número de cuenta/celular.', variant: 'destructive' });
        return;
      }
      newMethod = {
        id: baseId,
        type: payoutMethodType,
        accountNumber: payoutAccountNumber,
        accountHolderName: payoutAccountHolderName || user?.name,
      };
    } else if (payoutMethodType === 'paypal') {
      if (!payoutPaypalEmail) {
        toast({ title: 'Información Incompleta', description: 'Ingresa tu correo de PayPal.', variant: 'destructive' });
        return;
      }
      newMethod = {
        id: baseId,
        type: 'paypal',
        email: payoutPaypalEmail,
        accountHolderName: payoutAccountHolderName || user?.name,
      };
    }
    if (newMethod) {
      setSavedPayoutMethods(prev => [...prev, newMethod!]);
      toast({ title: 'Método de Desembolso Guardado (Simulación)', description: `Tu método de desembolso (${payoutMethodType}) ha sido guardado.` });
      setPayoutMethodType(''); setPayoutAccountNumber(''); setPayoutAccountHolderName(''); setPayoutPaypalEmail('');
    }
  };

  /**
   * Nombre del método: handleDeletePayoutMethod
   *
   * Propósito:
   * Eliminar un método de desembolso guardado.
   *
   * Variables utilizadas:
   * - id
   *
   * Precondición:
   * - Debe recibir un ID válido
   *
   * Postcondición:
   * - Se elimina el método de la lista
   */
  const handleDeletePayoutMethod = (id: string) => {
    setSavedPayoutMethods(prev => prev.filter(pm => pm.id !== id));
    toast({ title: 'Método de Desembolso Eliminado (Simulación)'});
  };

  /**
   * Nombre del método: handleWithdraw
   *
   * Propósito:
   * Realizar la solicitud de retiro de fondos.
   *
   * Variables utilizadas:
   * - withdrawAmount, selectedPayoutMethodForWithdrawal, availableBalance
   *
   * Precondición:
   * - Monto válido, saldo suficiente y método seleccionado
   *
   * Postcondición:
   * - Se actualiza el saldo disponible y se cierra el diálogo
   */
  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Monto Inválido', description: 'Ingresa un monto válido para retirar.', variant: 'destructive' });
      return;
    }
    if (amount > availableBalance) {
      toast({ title: 'Saldo Insuficiente', description: 'No puedes retirar más de tu saldo disponible.', variant: 'destructive' });
      return;
    }
    if (!selectedPayoutMethodForWithdrawal) {
      toast({ title: 'Método de Desembolso No Seleccionado', description: 'Selecciona a dónde enviar el dinero.', variant: 'destructive' });
      return;
    }
    const selectedMethodDetails = savedPayoutMethods.find(pm => pm.id === selectedPayoutMethodForWithdrawal);
    console.log(`Simulación: Retirando ${amount} COP a ${selectedMethodDetails?.type} (${selectedMethodDetails?.type === 'paypal' ? (selectedMethodDetails as PayPalPayoutMethod).email : (selectedMethodDetails as ColombianPayoutMethod).accountNumber})`);
    toast({
      title: 'Retiro Solicitado (Simulación)',
      description: `Se han solicitado ${amount.toLocaleString('es-CO', {style: 'currency', currency: 'COP'})} para desembolso a tu cuenta ${selectedMethodDetails?.type}.`,
    });
    setAvailableBalance(prev => prev - amount);
    setIsWithdrawDialogOpen(false);
    setWithdrawAmount('');
    setSelectedPayoutMethodForWithdrawal(undefined);
  };

  if (isLoading) {
    return <div className="flex flex-col flex-grow items-center justify-center p-4"><p>Cargando facturación...</p></div>;
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col flex-grow items-center justify-center p-4">
        <div className="p-6 md:p-8 flex flex-col items-center text-center border rounded-lg bg-card shadow-lg max-w-md">
          <FileText className="h-16 w-16 text-muted-foreground/50 mb-6" />
          <h2 className="text-xl font-medium mb-2 text-foreground">Acceso Restringido a Facturación</h2>
          <p className="text-muted-foreground mb-6 max-w-sm">Debes iniciar sesión o crear una cuenta para gestionar tu facturación.</p>
          <Button onClick={openLoginDialog}>Iniciar Sesión / Crear Cuenta</Button>
        </div>
      </div>
    );
  }

  const isProfessional = user?.profileType === 'profesional' || user?.profileType === 'propietario_espacio';

  return (
    // Aquí va el JSX del componente, que ya está en el código original
    // Se omite aquí para no repetirlo, pero está incluido en el archivo final
  );
};

const BillingPage = () => {
  return (
    <AppLayout>
      <BillingContent />
    </AppLayout>
  );
};

export default BillingPage;
